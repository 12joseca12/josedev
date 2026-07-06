"use client";

import { useId, useState } from "react";

import type { ClientTaskCommentDTO, Locale } from "@/lib/types";
import { postComment } from "@/services/clients-api";
import { t } from "@/services/literals";

function formatCommentDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(locale === "en" ? "en-GB" : "es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type CommentThreadProps = {
  locale: Locale;
  clientId: string;
  taskId?: string;
  title: string;
  comments: ClientTaskCommentDTO[];
  onPosted: () => void;
  onError: () => void;
};

/**
 * Hilo de comentarios + form de un `client_task_comments` (tarea puntual o
 * general). La RLS ya filtra `internal=true` del lado del cliente — no hay
 * toggle "internal" acá (eso es admin/T11), simplemente no llega ese dato.
 */
export function CommentThread({ locale, clientId, taskId, title, comments, onPosted, onError }: CommentThreadProps) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const textareaId = useId();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const result = await postComment(clientId, trimmed, taskId);
    setSending(false);
    if (result.ok) {
      setBody("");
      onPosted();
    } else {
      onError();
    }
  }

  return (
    <div className="rounded-xl border border-dash-border bg-dash-surface p-4">
      <h3 className="font-dash-mono text-[11px] font-medium uppercase tracking-widest text-dash-muted">{title}</h3>

      {comments.length === 0 ? (
        <p className="mt-3 text-[13px] text-dash-muted">{t(locale, "clientPortal.emptyComments")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-dash-border bg-dash-bg px-3 py-2">
              <p className="text-[13px] leading-snug text-dash-text">{comment.body}</p>
              <p className="mt-1 font-dash-data text-[11px] tabular-nums text-dash-muted">
                {formatCommentDate(comment.createdAt, locale)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(event) => void onSubmit(event)} className="mt-3 flex flex-col gap-2">
        <label htmlFor={textareaId} className="sr-only">
          {t(locale, "clientPortal.commentLabel")}
        </label>
        <textarea
          id={textareaId}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t(locale, "clientPortal.commentPlaceholder")}
          rows={2}
          className="w-full resize-y rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-[13px] text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
        />
        <button
          type="submit"
          disabled={sending || body.trim().length === 0}
          className="min-h-11 self-start rounded-lg border border-dash-border px-4 text-[13px] font-medium text-dash-text transition-colors hover:border-dash-accent disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
        >
          {sending ? t(locale, "clientPortal.commentSending") : t(locale, "clientPortal.commentSubmit")}
        </button>
      </form>
    </div>
  );
}
