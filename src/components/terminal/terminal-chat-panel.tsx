"use client";

import { Maximize2, Minimize2, PictureInPicture2, Send, Terminal, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";

import { TerminalChatMeetingPicker } from "@/components/terminal/terminal-chat-meeting-picker";
import { TerminalChatScrollRegion } from "@/components/terminal/terminal-chat-scroll-region";
import { TerminalChatTypingIndicator } from "@/components/terminal/terminal-chat-typing-indicator";
import { useAdminChat } from "@/hooks/use-admin-chat";
import { buildAuthHref } from "@/lib/auth-return-path";
import { getLastChatExchange, meetingPickerIsPending } from "@/lib/terminal-chat-utils";
import { formatTerminalPromptTemplate, terminalHostFromAuthUser } from "@/lib/user-initials";
import type { AdminChatMessageDTO, Locale } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
  open: boolean;
  onClose: () => void;
};

type TerminalViewMode = "panel" | "fullscreen" | "pip";

type MacTrafficLightsProps = {
  locale: Locale;
  viewMode: TerminalViewMode;
  onClose: () => void;
  onYellow: () => void;
  onGreen: () => void;
};

const TRAFFIC_BTN =
  "flex size-5 shrink-0 items-center justify-center rounded-full transition-[filter,box-shadow] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-[1.375rem]";

function MacTrafficLights({ locale, viewMode, onClose, onYellow, onGreen }: MacTrafficLightsProps) {
  const greenLabel =
    viewMode === "fullscreen"
      ? t(locale, "terminalChat.restoreAria")
      : t(locale, "terminalChat.fullscreenAria");
  const yellowLabel =
    viewMode === "pip"
      ? t(locale, "terminalChat.pipRestoreAria")
      : t(locale, "terminalChat.pipAria");

  return (
    <div
      className="flex shrink-0 items-center gap-2.5"
      role="toolbar"
      aria-label={t(locale, "terminalChat.trafficLightsAria")}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onClose}
        className={`${TRAFFIC_BTN} bg-mac-close hover:shadow-[0_0_16px_rgba(255,95,87,0.85)]`}
        aria-label={t(locale, "terminalChat.closeAria")}
      >
        <X className="size-3 text-mac-close-icon sm:size-3.5" strokeWidth={3} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onYellow}
        className={`${TRAFFIC_BTN} bg-mac-minimize hover:shadow-[0_0_16px_rgba(254,188,46,0.85)]`}
        aria-label={yellowLabel}
      >
        <PictureInPicture2 className="size-3 text-mac-minimize-icon sm:size-3.5" strokeWidth={2.5} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onGreen}
        className={`${TRAFFIC_BTN} bg-mac-maximize hover:shadow-[0_0_16px_rgba(40,200,64,0.85)]`}
        aria-label={greenLabel}
      >
        {viewMode === "fullscreen" ? (
          <Minimize2 className="size-3 text-mac-maximize-icon sm:size-3.5" strokeWidth={2.5} aria-hidden />
        ) : (
          <Maximize2 className="size-3 text-mac-maximize-icon sm:size-3.5" strokeWidth={2.5} aria-hidden />
        )}
      </button>
    </div>
  );
}

function MessageBlock({
  locale,
  msg,
  isUser,
  userHost,
  onMeetingSubmit,
  meetingBusy,
  compact = false,
}: {
  locale: Locale;
  msg: AdminChatMessageDTO;
  isUser: boolean;
  userHost: string;
  onMeetingSubmit: (date: string, time: string) => void;
  meetingBusy: boolean;
  compact?: boolean;
}) {
  const label = isUser ? t(locale, "terminalChat.usrLabel") : t(locale, "terminalChat.sysLabel");
  const prompt = isUser
    ? formatTerminalPromptTemplate(t(locale, "terminalChat.usrPrompt"), userHost)
    : t(locale, "terminalChat.sysPrompt");
  const meta = msg.metadata as { selectedDate?: string; selectedTime?: string };

  if (compact) {
    return (
      <div
        className={`rounded border border-outline-variant/20 bg-surface-container-low/80 px-2 py-1.5 ${
          isUser ? "border-r-2 border-r-outline/40" : "border-l-2 border-l-primary"
        }`}
      >
        <p className="mb-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-outline">
          {label}
        </p>
        <p className="line-clamp-3 font-mono text-[10px] leading-snug text-on-surface">{msg.content}</p>
      </div>
    );
  }

  return (
    <article
      className={`flex w-full flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
      aria-label={label}
    >
      <div className={`flex items-center gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${
            isUser ? "bg-outline-variant/25 text-outline" : "bg-primary/20 text-primary"
          }`}
        >
          {label}
        </span>
        <span className="font-mono text-[9px] text-outline/80 sm:text-[10px]">{prompt}</span>
      </div>
      <div
        className={`max-w-[min(100%,28rem)] rounded-md border border-outline-variant/25 bg-surface-container-low/90 px-3 py-2.5 font-mono text-xs leading-relaxed text-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
          isUser ? "border-r-2 border-r-outline/50" : "border-l-2 border-l-primary"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        {!isUser && msg.messageType === "meeting_picker" && meetingPickerIsPending(msg) ? (
          <TerminalChatMeetingPicker locale={locale} busy={meetingBusy} onSubmit={onMeetingSubmit} />
        ) : null}
        {!isUser && msg.messageType === "meeting_picker" && !meetingPickerIsPending(msg) && meta.selectedDate ? (
          <p className="mt-2 font-label text-[10px] uppercase tracking-widest text-primary">
            {t(locale, "terminalChat.meetingScheduled")}{" "}
            <span className="font-mono normal-case tracking-normal text-on-surface">
              {meta.selectedDate} {meta.selectedTime ?? ""}
            </span>
          </p>
        ) : null}
      </div>
    </article>
  );
}

type ChatComposerProps = {
  locale: Locale;
  inputId: string;
  inputPrompt: string;
  draft: string;
  setDraft: (value: string) => void;
  onInputKeyDown: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  disabled: boolean;
  compact?: boolean;
};

const COMPOSER_TEXTAREA_MAX_PX = 112;
const COMPOSER_TEXTAREA_MAX_PX_COMPACT = 64;

function ChatComposer({
  locale,
  inputId,
  inputPrompt,
  draft,
  setDraft,
  onInputKeyDown,
  onSend,
  disabled,
  compact = false,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxHeightPx = compact ? COMPOSER_TEXTAREA_MAX_PX_COMPACT : COMPOSER_TEXTAREA_MAX_PX;
  useAutoResizeTextarea(textareaRef, draft, maxHeightPx);

  if (compact) {
    return (
      <div className="flex items-end gap-1.5 rounded border border-outline-variant/30 bg-surface-container-lowest/90 px-1.5 py-1">
        <label htmlFor={inputId} className="sr-only">
          {t(locale, "terminalChat.inputLabel")}
        </label>
        <span className="hidden shrink-0 self-end pb-1.5 font-mono text-[9px] leading-none text-primary sm:inline" aria-hidden>
          {inputPrompt}
        </span>
        <textarea
          ref={textareaRef}
          id={inputId}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onInputKeyDown}
          disabled={disabled}
          placeholder={t(locale, "terminalChat.inputPlaceholder")}
          className="min-h-[1.75rem] flex-1 resize-none overflow-hidden bg-transparent py-1 font-mono text-[10px] leading-snug text-on-surface placeholder:text-outline/60 focus:outline-none"
          style={{ maxHeight: maxHeightPx }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !draft.trim()}
          className="flex size-7 shrink-0 items-center justify-center rounded border border-primary/50 bg-primary/20 text-primary transition-colors hover:bg-primary/30 disabled:opacity-40"
          aria-label={t(locale, "terminalChat.sendAria")}
        >
          <Send className="size-3" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <footer className="shrink-0 border-t border-outline-variant/25 bg-terminal-footer px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="flex items-end gap-2 rounded-md border border-outline-variant/30 bg-surface-container-lowest/80 px-2 py-2">
        <label htmlFor={inputId} className="sr-only">
          {t(locale, "terminalChat.inputLabel")}
        </label>
        <span
          className="hidden shrink-0 self-end pb-2 font-mono text-[10px] leading-none text-primary sm:inline"
          aria-hidden
        >
          {inputPrompt}
        </span>
        <textarea
          ref={textareaRef}
          id={inputId}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onInputKeyDown}
          disabled={disabled}
          placeholder={t(locale, "terminalChat.inputPlaceholder")}
          className="min-h-[2.25rem] flex-1 resize-none overflow-hidden bg-transparent py-1.5 font-mono text-xs leading-snug text-on-surface placeholder:text-outline/60 focus:outline-none"
          style={{ maxHeight: maxHeightPx }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !draft.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/50 bg-primary/20 text-primary transition-colors hover:bg-primary/30 disabled:opacity-40"
          aria-label={t(locale, "terminalChat.sendAria")}
        >
          <Send className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-widest text-outline/70">
        <span className="inline-flex items-center gap-2">
          <Terminal className="size-3 text-primary/60" aria-hidden />
          <span>{t(locale, "terminalChat.footerUtf8")}</span>
          <span>{t(locale, "terminalChat.footerIns")}</span>
        </span>
        <span className="truncate">{t(locale, "terminalChat.footerProtocol")}</span>
      </div>
    </footer>
  );
}

function ChatPanelHeader({
  locale,
  viewMode,
  onClose,
  onYellow,
  onGreen,
}: MacTrafficLightsProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-outline-variant/25 px-3 py-2.5 sm:px-4">
      <MacTrafficLights locale={locale} viewMode={viewMode} onClose={onClose} onYellow={onYellow} onGreen={onGreen} />
      <p className="min-w-0 flex-1 truncate font-mono text-[10px] font-medium uppercase tracking-wide text-on-surface sm:text-xs">
        {t(locale, "terminalChat.headerTitle")}
      </p>
      <span className="hidden shrink-0 font-mono text-[9px] text-primary/80 sm:inline">
        {t(locale, "terminalChat.headerConnection")}
      </span>
    </header>
  );
}

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
        className="pointer-events-auto fixed bottom-4 left-4 z-[220] flex w-[min(calc(100vw-2rem),20rem)] flex-col overflow-hidden rounded-lg border border-outline-variant/35 bg-terminal-panel shadow-[0_12px_40px_rgba(0,0,0,0.55)] sm:bottom-5 sm:left-5 sm:w-[22rem]"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <ChatPanelHeader
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
            <p className="font-mono text-[10px] text-outline">{t(locale, "terminalChat.loading")}</p>
          ) : null}
          {authReady && !signedIn ? (
            <div className="space-y-2 rounded border border-primary/25 bg-primary/5 p-2 text-center">
              <p className="font-mono text-[10px] text-outline">{t(locale, "terminalChat.signInBody")}</p>
              <Link
                href={buildAuthHref(pathname)}
                className="inline-block rounded border border-primary/50 bg-primary/20 px-2 py-1 font-mono text-[10px] text-primary"
              >
                {t(locale, "terminalChat.signInCta")}
              </Link>
            </div>
          ) : null}
          {signedIn && error ? (
            <p className="rounded border border-error/30 bg-error/10 px-2 py-1 font-mono text-[10px] text-error">
              {error}
            </p>
          ) : null}
          {signedIn && !loading && !lastUser && !lastAssistant ? (
            <p className="font-mono text-[10px] text-outline">{t(locale, "terminalChat.emptyHint")}</p>
          ) : null}
          {signedIn && lastUser ? (
            <MessageBlock
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
              <MessageBlock
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
          <div className="shrink-0 border-t border-outline-variant/25 bg-terminal-footer px-2 py-2">
            <ChatComposer
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
    ? "relative z-10 flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden border-0 bg-terminal-panel"
    : "relative z-10 flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden border-l border-outline-variant/30 bg-terminal-panel shadow-[-12px_0_48px_rgba(0,0,0,0.55)] sm:max-w-[min(100vw,32rem)] md:max-w-[min(100vw,36rem)] lg:max-w-[min(100vw,40rem)]";

  return createPortal(
    <div
      className={`fixed inset-0 z-[220] flex ${isFullscreen ? "" : "justify-end"}`}
      role="presentation"
    >
      {!isFullscreen ? (
        <button
          type="button"
          className="absolute inset-0 bg-background/70 backdrop-blur-sm"
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
        <ChatPanelHeader
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
            <p className="font-mono text-xs text-outline">{t(locale, "terminalChat.loading")}</p>
          ) : null}
          {authReady && !signedIn ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-primary/25 bg-primary/5 px-4 py-8 text-center">
              <p className="font-headline text-sm font-bold uppercase tracking-wide text-primary">
                {t(locale, "terminalChat.signInTitle")}
              </p>
              <p className="max-w-xs font-mono text-xs leading-relaxed text-outline">
                {t(locale, "terminalChat.signInBody")}
              </p>
              <Link
                href={buildAuthHref(pathname)}
                onClick={onClose}
                className="rounded-md border border-primary/50 bg-primary/20 px-4 py-2 font-headline text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary/30"
              >
                {t(locale, "terminalChat.signInCta")}
              </Link>
            </div>
          ) : null}
          {signedIn && loading ? (
            <p className="font-mono text-xs text-outline">{t(locale, "terminalChat.loading")}</p>
          ) : null}
          {signedIn && error ? (
            <p className="rounded border border-error/30 bg-error/10 px-2 py-1 font-mono text-xs text-error">
              {error}
            </p>
          ) : null}
          {signedIn && !loading && thread?.messages.length === 0 ? (
            <p className="font-mono text-xs text-outline">{t(locale, "terminalChat.emptyHint")}</p>
          ) : null}
          {signedIn
            ? thread?.messages.map((msg) => {
                const isUser = msg.senderRole === "user";
                return (
                  <MessageBlock
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

        {signedIn ? (
          <ChatComposer
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
