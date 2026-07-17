"use client";

import { useId, useState, type FormEvent } from "react";

import { DashToastViewport, useDashToasts } from "@/components/staff-dash/dash-toast";
import { useAdminChats } from "@/components/staff-dash/use-admin-chats";
import type { AdminChatConsoleSenderRole, AdminConversationSummaryDTO, Locale } from "@/lib/types";
import { markRead, sendAdminMessage, setAi } from "@/services/admin-chats-api";
import { t } from "@/services/literals";

type Props = { locale: Locale };

const SENDER_LABEL_KEY: Record<AdminChatConsoleSenderRole, string> = {
  user: "adminChats.senderUser",
  assistant: "adminChats.senderAssistant",
  admin: "adminChats.senderAdmin",
};

/** Usuario a la izquierda, respuestas "de nuestro lado" (IA o admin) a la derecha — convención de chat estándar. */
const SENDER_BUBBLE_CLASS: Record<AdminChatConsoleSenderRole, string> = {
  user: "self-start border-dash-border bg-dash-surface",
  assistant: "self-end border-dash-info bg-dash-info/10",
  admin: "self-end border-dash-accent bg-dash-accent/10",
};

function formatDateTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(locale === "en" ? "en-GB" : "es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Badge de no-leído: nunca solo color — siempre acompañado de texto (visualmente oculto acá, el punto es decorativo). */
function UnreadBadge({ locale }: { locale: Locale }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <span aria-hidden="true" className="size-2 rounded-full bg-dash-error" />
      <span className="sr-only">{t(locale, "adminChats.unreadBadge")}</span>
    </span>
  );
}

function AiStatusIndicator({ enabled, locale }: { enabled: boolean; locale: Locale }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-bg px-2 py-0.5">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${enabled ? "bg-dash-success" : "bg-dash-muted"}`} />
      <span className="font-dash-mono text-[10px] font-medium uppercase tracking-wide text-dash-text">
        {t(locale, enabled ? "adminChats.aiOn" : "adminChats.aiOff")}
      </span>
    </span>
  );
}

export function AdminChatsClient({ locale }: Props) {
  const {
    listState,
    reload,
    activeConversationId,
    threadState,
    openConversation,
    closeConversation,
    reloadThread,
  } = useAdminChats();
  const { toasts, pushToast, dismissToast } = useDashToasts();

  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const replyInputId = useId();

  const activeConversation: AdminConversationSummaryDTO | null =
    listState.status === "ready"
      ? (listState.conversations.find((c) => c.id === activeConversationId) ?? null)
      : null;

  async function handleOpenConversation(conv: AdminConversationSummaryDTO) {
    openConversation(conv.id);
    if (conv.unread) {
      const res = await markRead(conv.id);
      if (res.ok) reload();
    }
  }

  async function handleSendReply(event: FormEvent) {
    event.preventDefault();
    const trimmed = replyContent.trim();
    if (!trimmed || !activeConversationId || sending) return;

    setSending(true);
    const res = await sendAdminMessage(activeConversationId, trimmed);
    setSending(false);

    if (!res.ok) {
      pushToast("error", t(locale, "adminChats.toastReplyError"));
      return;
    }
    setReplyContent("");
    pushToast("success", t(locale, "adminChats.toastReplySuccess"));
    reloadThread();
    reload();
  }

  async function handleToggleAi() {
    if (!activeConversation || aiBusy) return;
    const nextEnabled = !activeConversation.aiEnabled;
    setAiBusy(true);
    const res = await setAi(activeConversation.id, nextEnabled);
    setAiBusy(false);

    if (!res.ok) {
      pushToast("error", t(locale, "adminChats.toastAiError"));
      return;
    }
    pushToast("success", t(locale, nextEnabled ? "adminChats.toastAiOnSuccess" : "adminChats.toastAiOffSuccess"));
    reload();
  }

  if (listState.status === "loading") {
    return <p className="text-[13px] text-dash-muted">{t(locale, "adminChats.loading")}</p>;
  }

  if (listState.status === "error") {
    return (
      <div className="border-l-4 border-dash-error bg-dash-surface px-4 py-3">
        <p className="text-[13px] text-dash-text">{t(locale, "adminChats.loadError")}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-2 rounded-lg border border-dash-border px-3 py-1.5 text-[13px] text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
        >
          {t(locale, "adminChats.retry")}
        </button>
      </div>
    );
  }

  const { conversations } = listState;
  const threadOpen = Boolean(activeConversationId);

  return (
    <div className="max-w-6xl">
      <header className="mb-5">
        <h1 className="font-dash-mono text-xl font-bold text-dash-text">{t(locale, "adminChats.title")}</h1>
        <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "adminChats.subtitle")}</p>
      </header>

      {conversations.length === 0 ? (
        <p className="text-[13px] text-dash-muted">{t(locale, "adminChats.empty")}</p>
      ) : (
        <div className="flex h-[calc(100dvh-11rem)] min-h-96 overflow-hidden rounded-xl border border-dash-border bg-dash-surface md:h-[calc(100dvh-9rem)]">
          {/* Lista — se oculta en mobile cuando hay un hilo abierto (DESIGN.md: dashboards colapsan bajo md). */}
          <ul
            aria-label={t(locale, "adminChats.title")}
            className={`w-full shrink-0 overflow-y-auto border-dash-border md:block md:w-72 md:border-r ${
              threadOpen ? "hidden md:block" : "block"
            }`}
          >
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  type="button"
                  onClick={() => handleOpenConversation(conv)}
                  aria-current={conv.id === activeConversationId ? "true" : undefined}
                  aria-label={t(locale, "adminChats.openThreadAria").replace("{email}", conv.userEmail)}
                  className={`flex w-full flex-col gap-1 border-b border-dash-border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dash-accent ${
                    conv.id === activeConversationId ? "bg-dash-bg" : "hover:bg-dash-bg/60"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[13px] font-medium text-dash-text">{conv.userEmail}</span>
                    {conv.unread ? <UnreadBadge locale={locale} /> : null}
                  </span>
                  <span className="truncate text-[12px] text-dash-muted">{conv.lastMessagePreview || "—"}</span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-dash-data text-[11px] tabular-nums text-dash-muted">
                      {formatDateTime(conv.lastMessageAt, locale)}
                    </span>
                    <AiStatusIndicator enabled={conv.aiEnabled} locale={locale} />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Hilo — full-width en mobile cuando está abierto, panel derecho fijo en desktop. */}
          <div className={`flex min-w-0 flex-1 flex-col ${threadOpen ? "flex" : "hidden md:flex"}`}>
            {!activeConversation ? (
              <p className="m-auto max-w-xs text-center text-[13px] text-dash-muted">
                {t(locale, "adminChats.selectConversationHint")}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-dash-border px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={closeConversation}
                      className="min-h-11 rounded-lg border border-dash-border px-3 text-[12px] text-dash-muted transition-colors hover:border-dash-accent hover:text-dash-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent md:hidden"
                    >
                      {t(locale, "adminChats.backToList")}
                    </button>
                    <span className="min-w-0 truncate text-[13px] font-medium text-dash-text">
                      {activeConversation.userEmail}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={activeConversation.aiEnabled}
                    aria-label={t(
                      locale,
                      activeConversation.aiEnabled ? "adminChats.aiToggleAriaOn" : "adminChats.aiToggleAriaOff",
                    )}
                    disabled={aiBusy}
                    onClick={handleToggleAi}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:cursor-not-allowed disabled:opacity-60 ${
                      activeConversation.aiEnabled
                        ? "border-dash-success text-dash-success"
                        : "border-dash-border text-dash-muted"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
                        activeConversation.aiEnabled ? "bg-dash-success" : "bg-dash-border"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 size-3 rounded-full bg-dash-surface transition-transform ${
                          activeConversation.aiEnabled ? "translate-x-3.5" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                    {t(locale, activeConversation.aiEnabled ? "adminChats.aiOn" : "adminChats.aiOff")}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {threadState.status === "loading" || threadState.status === "idle" ? (
                    <p className="text-[13px] text-dash-muted">{t(locale, "adminChats.loading")}</p>
                  ) : threadState.status === "error" ? (
                    <div className="border-l-4 border-dash-error bg-dash-bg px-3 py-2">
                      <p className="text-[13px] text-dash-text">{t(locale, "adminChats.threadLoadError")}</p>
                      <button
                        type="button"
                        onClick={reloadThread}
                        className="mt-2 rounded-lg border border-dash-border px-3 py-1.5 text-[13px] text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
                      >
                        {t(locale, "adminChats.retry")}
                      </button>
                    </div>
                  ) : threadState.messages.length === 0 ? (
                    <p className="text-[13px] text-dash-muted">{t(locale, "adminChats.messagesEmpty")}</p>
                  ) : (
                    <ul aria-live="polite" aria-relevant="additions" className="flex flex-col gap-2">
                      {threadState.messages.map((msg) => (
                        <li
                          key={msg.id}
                          className={`flex max-w-[80%] flex-col gap-0.5 rounded-xl border px-3 py-2 ${SENDER_BUBBLE_CLASS[msg.senderRole]}`}
                        >
                          <span className="font-dash-mono text-[10px] font-medium uppercase tracking-widest text-dash-muted">
                            {t(locale, SENDER_LABEL_KEY[msg.senderRole])}
                          </span>
                          <p className="whitespace-pre-wrap text-[13px] text-dash-text">{msg.content}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <form onSubmit={handleSendReply} className="flex items-end gap-2 border-t border-dash-border p-3">
                  <label htmlFor={replyInputId} className="sr-only">
                    {t(locale, "adminChats.replyLabel")}
                  </label>
                  <textarea
                    id={replyInputId}
                    value={replyContent}
                    onChange={(event) => setReplyContent(event.target.value)}
                    placeholder={t(locale, "adminChats.replyPlaceholder")}
                    rows={2}
                    className="min-h-11 flex-1 resize-none rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-[13px] text-dash-text placeholder:text-dash-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyContent.trim()}
                    className="min-h-11 shrink-0 rounded-lg border border-dash-accent bg-dash-accent px-4 text-[13px] font-medium text-dash-bg transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? t(locale, "adminChats.replySending") : t(locale, "adminChats.replySend")}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <DashToastViewport toasts={toasts} closeLabel={t(locale, "adminChats.closeToast")} onDismiss={dismissToast} />
    </div>
  );
}
