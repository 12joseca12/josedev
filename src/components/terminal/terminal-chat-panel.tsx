"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";

import { TerminalChatComposer } from "@/components/terminal/terminal-chat-composer";
import { TerminalChatHeader } from "@/components/terminal/terminal-chat-header";
import { TerminalChatMessageBlock } from "@/components/terminal/terminal-chat-message-block";
import { TerminalChatMeetingPicker } from "@/components/terminal/terminal-chat-meeting-picker";
import { TerminalChatScrollRegion } from "@/components/terminal/terminal-chat-scroll-region";
import { TerminalChatSuggestedPrompts } from "@/components/terminal/terminal-chat-suggested-prompts";
import { TerminalChatTypingIndicator } from "@/components/terminal/terminal-chat-typing-indicator";
import type { TerminalViewMode } from "@/components/terminal/terminal-chat-view-mode";
import { useAdminChat } from "@/hooks/use-admin-chat";
import { buildAuthHref } from "@/lib/auth-return-path";
import { getLastChatExchange, meetingPickerIsPending } from "@/lib/terminal-chat-utils";
import { formatTerminalPromptTemplate, terminalHostFromAuthUser } from "@/lib/user-initials";
import type { Locale } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
  open: boolean;
  onClose: () => void;
};

export function TerminalChatPanel({ locale, open, onClose }: Props) {
  const pathname = usePathname();
  const panelId = useId();
  const inputId = useId();
  const pipInputId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const pipListRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [viewMode, setViewMode] = useState<TerminalViewMode>("panel");

  const { thread, loading, sending, awaitingReply, meetingBusy, error, sendMessage, scheduleMeeting } =
    useAdminChat(open && Boolean(user), locale);

  useEffect(() => {
    if (open) setViewMode("panel");
  }, [open]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) {
        setUser(data.user ?? null);
        setAuthReady(true);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signedIn = Boolean(user);
  const isPip = viewMode === "pip";
  const isFullscreen = viewMode === "fullscreen";

  useEffect(() => {
    if (!open || isPip) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isPip]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isPip) {
        setViewMode("panel");
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isPip, onClose]);

  useEffect(() => {
    const el = (isPip ? pipListRef : listRef).current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [thread?.messages.length, awaitingReply, isPip]);

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    const text = draft;
    setDraft("");
    await sendMessage(text);
  };

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const onSuggestedPrompt = (prompt: string) => {
    if (sending) return;
    void sendMessage(prompt);
  };

  const onMeetingSubmit = async (date: string, time: string, messageId: string) => {
    if (!thread) return;
    await scheduleMeeting({
      conversationId: thread.conversationId,
      messageId,
      date,
      time,
    });
  };

  const handleYellow = () => {
    setViewMode((mode) => (mode === "pip" ? "panel" : "pip"));
  };

  const handleGreen = () => {
    setViewMode((mode) => {
      if (mode === "pip") return "fullscreen";
      if (mode === "fullscreen") return "panel";
      return "fullscreen";
    });
  };

  const composerDisabled = loading || sending;
  const userHost = terminalHostFromAuthUser(user);
  const inputPrompt = formatTerminalPromptTemplate(t(locale, "terminalChat.inputPrompt"), userHost);
  const { lastUser, lastAssistant } = getLastChatExchange(thread?.messages ?? []);

  if (!open || typeof document === "undefined") return null;

  if (isPip) {
    return createPortal(
      <aside
        id={panelId}
        role="dialog"
        aria-label={t(locale, "terminalChat.pipPanelAria")}
        className="dark pointer-events-auto fixed bottom-4 left-4 z-chat-widget flex w-[min(calc(100vw-2rem),20rem)] flex-col overflow-hidden rounded-lg border border-dash-border bg-terminal-panel shadow-[0_12px_40px_rgba(0,0,0,0.55)] sm:bottom-5 sm:left-5 sm:w-[22rem]"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <TerminalChatHeader
          locale={locale}
          viewMode={viewMode}
          onClose={onClose}
          onYellow={handleYellow}
          onGreen={handleGreen}
        />

        <TerminalChatScrollRegion
          scrollRef={pipListRef}
          regionClassName="max-h-[min(40vh,14rem)]"
          className="gap-2 px-2 py-2"
          measureDeps={[thread?.messages.length, awaitingReply, authReady, signedIn]}
          aria-live="polite"
        >
          {!authReady ? (
            <p className="font-mono text-[10px] text-dash-muted">{t(locale, "terminalChat.loading")}</p>
          ) : null}
          {authReady && !signedIn ? (
            <div className="space-y-2 rounded border border-dash-accent/25 bg-dash-accent/5 p-2 text-center">
              <p className="font-mono text-[10px] text-dash-muted">{t(locale, "terminalChat.signInBody")}</p>
              <Link
                href={buildAuthHref(locale, pathname)}
                className="inline-block rounded border border-dash-accent/50 bg-dash-accent/20 px-2 py-1 font-mono text-[10px] text-dash-accent-text"
              >
                {t(locale, "terminalChat.signInCta")}
              </Link>
            </div>
          ) : null}
          {signedIn && error ? (
            <p className="rounded border border-dash-error/30 bg-dash-error/10 px-2 py-1 font-mono text-[10px] text-dash-error">
              {error}
            </p>
          ) : null}
          {signedIn && !loading && !lastUser && !lastAssistant ? (
            <p className="font-mono text-[10px] text-dash-muted">{t(locale, "terminalChat.emptyHint")}</p>
          ) : null}
          {signedIn && lastUser ? (
            <TerminalChatMessageBlock
              locale={locale}
              msg={lastUser}
              isUser
              userHost={userHost}
              compact
              meetingBusy={meetingBusy}
              onMeetingSubmit={() => {}}
            />
          ) : null}
          {signedIn && lastAssistant ? (
            <>
              <TerminalChatMessageBlock
                locale={locale}
                msg={lastAssistant}
                isUser={false}
                userHost={userHost}
                compact
                meetingBusy={meetingBusy}
                onMeetingSubmit={(date, time) => void onMeetingSubmit(date, time, lastAssistant.id)}
              />
              {!meetingPickerIsPending(lastAssistant) ? null : (
                <div className="px-0.5">
                  <TerminalChatMeetingPicker
                    locale={locale}
                    busy={meetingBusy}
                    onSubmit={(date, time) => void onMeetingSubmit(date, time, lastAssistant.id)}
                  />
                </div>
              )}
            </>
          ) : null}
        </TerminalChatScrollRegion>

        {signedIn && awaitingReply ? <TerminalChatTypingIndicator locale={locale} /> : null}

        {signedIn ? (
          <div className="shrink-0 border-t border-dash-border bg-terminal-footer px-2 py-2">
            <TerminalChatComposer
              locale={locale}
              inputId={pipInputId}
              inputPrompt={inputPrompt}
              draft={draft}
              setDraft={setDraft}
              onInputKeyDown={onInputKeyDown}
              onSend={() => void handleSend()}
              disabled={composerDisabled}
              compact
            />
          </div>
        ) : null}
      </aside>,
      document.body,
    );
  }

  const asideClassName = isFullscreen
    ? "dark relative z-10 flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden border-0 bg-terminal-panel"
    : "dark relative z-10 flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden border-l border-dash-border bg-terminal-panel shadow-[-12px_0_48px_rgba(0,0,0,0.55)] sm:max-w-[min(100vw,32rem)] md:max-w-[min(100vw,36rem)] lg:max-w-[min(100vw,40rem)]";

  return createPortal(
    <div
      className={`fixed inset-0 z-chat-widget flex ${isFullscreen ? "" : "justify-end"}`}
      role="presentation"
    >
      {!isFullscreen ? (
        <button
          type="button"
          className="absolute inset-0 bg-dash-bg/70 backdrop-blur-sm"
          aria-label={t(locale, "terminalChat.closeAria")}
          onClick={onClose}
        />
      ) : null}
      <aside
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-label={t(locale, "terminalChat.panelAria")}
        className={asideClassName}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <TerminalChatHeader
          locale={locale}
          viewMode={viewMode}
          onClose={onClose}
          onYellow={handleYellow}
          onGreen={handleGreen}
        />

        <TerminalChatScrollRegion
          scrollRef={listRef}
          className="gap-4 px-3 py-4 sm:px-4"
          measureDeps={[thread?.messages.length, awaitingReply, authReady, signedIn, loading]}
          aria-live="polite"
          aria-busy={signedIn && (loading || awaitingReply)}
        >
          {!authReady ? (
            <p className="font-mono text-xs text-dash-muted">{t(locale, "terminalChat.loading")}</p>
          ) : null}
          {authReady && !signedIn ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dash-accent/25 bg-dash-accent/5 px-4 py-8 text-center">
              <p className="font-headline text-sm font-bold uppercase tracking-wide text-dash-accent-text">
                {t(locale, "terminalChat.signInTitle")}
              </p>
              <p className="max-w-xs font-mono text-xs leading-relaxed text-dash-muted">
                {t(locale, "terminalChat.signInBody")}
              </p>
              <Link
                href={buildAuthHref(locale, pathname)}
                onClick={onClose}
                className="rounded-md border border-dash-accent/50 bg-dash-accent/20 px-4 py-2 font-headline text-xs font-bold uppercase tracking-wide text-dash-accent-text transition-colors hover:bg-dash-accent/30"
              >
                {t(locale, "terminalChat.signInCta")}
              </Link>
            </div>
          ) : null}
          {signedIn && loading ? (
            <p className="font-mono text-xs text-dash-muted">{t(locale, "terminalChat.loading")}</p>
          ) : null}
          {signedIn && error ? (
            <p className="rounded border border-dash-error/30 bg-dash-error/10 px-2 py-1 font-mono text-xs text-dash-error">
              {error}
            </p>
          ) : null}
          {signedIn && !loading && thread?.messages.length === 0 ? (
            <p className="font-mono text-xs text-dash-muted">{t(locale, "terminalChat.emptyHint")}</p>
          ) : null}
          {signedIn
            ? thread?.messages.map((msg) => {
                const isUser = msg.senderRole === "user";
                return (
                  <TerminalChatMessageBlock
                    key={msg.id}
                    locale={locale}
                    msg={msg}
                    isUser={isUser}
                    userHost={userHost}
                    meetingBusy={meetingBusy}
                    onMeetingSubmit={(date, time) => void onMeetingSubmit(date, time, msg.id)}
                  />
                );
              })
            : null}
        </TerminalChatScrollRegion>

        {signedIn && awaitingReply ? <TerminalChatTypingIndicator locale={locale} /> : null}

        {signedIn && !loading && !awaitingReply && thread?.messages.length === 0 ? (
          <TerminalChatSuggestedPrompts locale={locale} onSelect={onSuggestedPrompt} disabled={composerDisabled} />
        ) : null}

        {signedIn ? (
          <TerminalChatComposer
            locale={locale}
            inputId={inputId}
            inputPrompt={inputPrompt}
            draft={draft}
            setDraft={setDraft}
            onInputKeyDown={onInputKeyDown}
            onSend={() => void handleSend()}
            disabled={composerDisabled}
          />
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
