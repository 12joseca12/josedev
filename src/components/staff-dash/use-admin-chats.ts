"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-browser-client";
import type { AdminChatConsoleMessageDTO, AdminConversationSummaryDTO } from "@/lib/types";
import { getMessages, listConversations } from "@/services/admin-chats-api";

/** Fallback si el canal Realtime nunca llega a `SUBSCRIBED` (red restrictiva, etc.). */
const FALLBACK_POLL_MS = 8_000;
/** Margen para dejar que `subscribe()` devuelva un status antes de armar el poll de respaldo. */
const SUBSCRIBE_GRACE_MS = 3_000;

export type AdminChatsListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; conversations: AdminConversationSummaryDTO[] };

export type AdminChatsThreadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; messages: AdminChatConsoleMessageDTO[] };

/**
 * Fetch-hook + Realtime para `/admin/chats`: lista de conversaciones (mismo
 * patrón `reloadKey` que `useAdminClients`/`useLeadsData`) más el hilo abierto
 * (si hay uno). Se suscribe a INSERTs de `admin_chat_messages` — cualquier
 * mensaje nuevo (de cualquier conversación) refresca la lista, y si además
 * coincide con el hilo abierto, también refresca sus mensajes. Con fallback a
 * polling si el canal no llega a `SUBSCRIBED`.
 */
export function useAdminChats() {
  const [listState, setListState] = useState<AdminChatsListState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [threadState, setThreadState] = useState<AdminChatsThreadState>({ status: "idle" });

  const activeConversationIdRef = useRef<string | null>(null);
  activeConversationIdRef.current = activeConversationId;

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const loadList = useCallback(async () => {
    const res = await listConversations();
    if (!res.ok) {
      setListState({ status: "error" });
      return;
    }
    setListState({ status: "ready", conversations: res.data });
  }, []);

  const loadThread = useCallback(async (conversationId: string) => {
    setThreadState({ status: "loading" });
    const res = await getMessages(conversationId);
    if (!res.ok) {
      setThreadState({ status: "error" });
      return;
    }
    setThreadState({ status: "ready", messages: res.data });
  }, []);

  const reloadThread = useCallback(() => {
    if (activeConversationIdRef.current) void loadThread(activeConversationIdRef.current);
  }, [loadThread]);

  const openConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  const closeConversation = useCallback(() => {
    setActiveConversationId(null);
    setThreadState({ status: "idle" });
  }, []);

  // Lista.
  useEffect(() => {
    setListState((s) => (s.status === "ready" ? s : { status: "loading" }));
    void loadList();
  }, [loadList, reloadKey]);

  // Hilo abierto.
  useEffect(() => {
    if (!activeConversationId) return;
    void loadThread(activeConversationId);
  }, [activeConversationId, loadThread, reloadKey]);

  // Realtime + fallback polling.
  useEffect(() => {
    const supabase = getSupabaseSSRBrowserClient();
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    let subscribed = false;

    const onNewMessage = () => {
      void loadList();
      if (activeConversationIdRef.current) void loadThread(activeConversationIdRef.current);
    };

    const startPoll = () => {
      if (pollTimer) return;
      pollTimer = setInterval(onNewMessage, FALLBACK_POLL_MS);
    };
    const stopPoll = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const channel: RealtimeChannel = supabase
      .channel("admin-chats")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_chat_messages" },
        onNewMessage,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          subscribed = true;
          stopPoll();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          subscribed = false;
          startPoll();
        }
      });

    // Si `subscribe()` nunca resuelve a un status reconocible, igual arrancamos el poll de respaldo.
    graceTimer = setTimeout(() => {
      if (!subscribed) startPoll();
    }, SUBSCRIBE_GRACE_MS);

    return () => {
      if (graceTimer) clearTimeout(graceTimer);
      stopPoll();
      void supabase.removeChannel(channel);
    };
  }, [loadList, loadThread]);

  return {
    listState,
    reload,
    activeConversationId,
    threadState,
    openConversation,
    closeConversation,
    reloadThread,
  };
}
