"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { mapAdminChatMessageRow, mergeChatMessage, type AdminChatMessageRow } from "@/lib/admin-chat-messages";
import { shouldPollForAssistantReply } from "@/lib/terminal-chat-utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminChatMessageDTO, AdminChatThreadDTO, Locale } from "@/lib/types";
import {
  adminChatFetchThread,
  adminChatScheduleMeeting,
  adminChatSendMessage,
} from "@/services/admin-chat-api";
import { getSupabaseAccessToken } from "@/lib/supabase/access-token";
import { t } from "@/services/literals";

/** Worker IA puede tardar hasta ~60s; margen para Realtime + red. */
const ASSISTANT_REPLY_TIMEOUT_MS = 90_000;

type State = {
  thread: AdminChatThreadDTO | null;
  loading: boolean;
  sending: boolean;
  awaitingReply: boolean;
  meetingBusy: boolean;
  error: string | null;
};

function optimisticUserMessage(
  conversationId: string,
  content: string,
  id: string,
): AdminChatMessageDTO {
  return {
    id,
    conversationId,
    senderRole: "user",
    senderId: null,
    content,
    messageType: "text",
    metadata: {},
    createdAt: new Date().toISOString(),
  };
}

function getMessageRowFromPayload(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
): AdminChatMessageRow | null {
  const row = payload.new;
  if (!row || typeof row !== "object" || !("id" in row) || !("conversation_id" in row)) {
    return null;
  }
  return row as AdminChatMessageRow;
}

export function useAdminChat(enabled: boolean, locale: Locale) {
  const [state, setState] = useState<State>({
    thread: null,
    loading: false,
    sending: false,
    awaitingReply: false,
    meetingBusy: false,
    error: null,
  });

  const replyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const loadThreadRef = useRef<(() => Promise<AdminChatThreadDTO | null>) | null>(null);

  const clearReplyTimeout = useCallback(() => {
    if (replyTimeoutRef.current) {
      clearTimeout(replyTimeoutRef.current);
      replyTimeoutRef.current = null;
    }
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => getSupabaseAccessToken(), []);

  const startReplyTimeout = useCallback(() => {
    clearReplyTimeout();
    replyTimeoutRef.current = setTimeout(() => {
      void loadThreadRef.current?.();
      setState((s) => ({
        ...s,
        awaitingReply: false,
        error: s.error ?? t(locale, "terminalChat.assistantTimeout"),
      }));
    }, ASSISTANT_REPLY_TIMEOUT_MS);
  }, [clearReplyTimeout, locale]);

  const loadThread = useCallback(async () => {
    const token = await getToken();
    if (!token) return null;
    const res = await adminChatFetchThread(token);
    if (!res.ok) {
      setState((s) => ({ ...s, error: res.error.message, loading: false }));
      return null;
    }
    const thread = res.data;
    const awaitingReply = shouldPollForAssistantReply(thread);
    setState((s) => ({ ...s, thread, error: null, loading: false, awaitingReply }));
    if (awaitingReply) {
      startReplyTimeout();
    }
    return thread;
  }, [getToken, startReplyTimeout]);

  loadThreadRef.current = loadThread;

  const applyRealtimeMessage = useCallback(
    (row: AdminChatMessageRow) => {
      const incoming = mapAdminChatMessageRow(row);
      if (incoming.senderRole === "assistant") {
        clearReplyTimeout();
      }
      setState((s) => {
        if (!s.thread || s.thread.conversationId !== incoming.conversationId) {
          return s;
        }
        const messages = mergeChatMessage(s.thread.messages, incoming);
        const awaitingReply = incoming.senderRole === "assistant" ? false : s.awaitingReply;
        return {
          ...s,
          thread: { ...s.thread, messages },
          awaitingReply,
          error: incoming.senderRole === "assistant" ? null : s.error,
        };
      });
    },
    [clearReplyTimeout],
  );

  const conversationId = state.thread?.conversationId;

  useEffect(() => {
    if (!enabled) {
      clearReplyTimeout();
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    void loadThread();
    return clearReplyTimeout;
  }, [enabled, loadThread, clearReplyTimeout]);

  useEffect(() => {
    if (!enabled || !conversationId) {
      if (channelRef.current) {
        const supabase = getSupabaseBrowserClient();
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const filter = `conversation_id=eq.${conversationId}`;

    const onChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const row = getMessageRowFromPayload(payload);
      if (!row) return;
      applyRealtimeMessage(row);
    };

    const channel = supabase
      .channel(`admin-chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_chat_messages", filter },
        onChange,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "admin_chat_messages", filter },
        onChange,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          void loadThread();
        }
      });

    channelRef.current = channel;

    return () => {
      clearReplyTimeout();
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [enabled, conversationId, applyRealtimeMessage, loadThread, clearReplyTimeout]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return false;
      const token = await getToken();
      if (!token) return false;

      const optimisticId = `optimistic-${crypto.randomUUID()}`;

      setState((s) => {
        const convId = s.thread?.conversationId ?? "";
        const optimistic = optimisticUserMessage(convId, trimmed, optimisticId);
        return {
          ...s,
          sending: true,
          awaitingReply: true,
          error: null,
          thread: {
            conversationId: convId,
            messages: [...(s.thread?.messages ?? []), optimistic],
          },
        };
      });

      startReplyTimeout();

      const res = await adminChatSendMessage(token, trimmed);
      if (!res.ok) {
        clearReplyTimeout();
        setState((s) => ({
          ...s,
          sending: false,
          awaitingReply: false,
          error: res.error.message,
          thread: s.thread
            ? {
                ...s.thread,
                messages: s.thread.messages.filter((m) => m.id !== optimisticId),
              }
            : null,
        }));
        return false;
      }

      const thread = res.data.thread;
      const awaitingReply = shouldPollForAssistantReply(thread);

      setState((s) => ({
        ...s,
        sending: false,
        thread,
        awaitingReply,
      }));

      if (!awaitingReply) {
        clearReplyTimeout();
      }

      return true;
    },
    [getToken, startReplyTimeout, clearReplyTimeout],
  );

  const scheduleMeeting = useCallback(
    async (input: { conversationId: string; messageId: string; date: string; time: string }) => {
      const token = await getToken();
      if (!token) return false;
      setState((s) => ({ ...s, meetingBusy: true, error: null }));
      const res = await adminChatScheduleMeeting(token, input);
      setState((s) => ({ ...s, meetingBusy: false }));
      if (!res.ok) {
        setState((s) => ({ ...s, error: res.error.message }));
        return false;
      }
      setState((s) => ({ ...s, thread: res.data.thread }));
      return true;
    },
    [getToken],
  );

  return {
    ...state,
    reload: loadThread,
    sendMessage,
    scheduleMeeting,
  };
}
