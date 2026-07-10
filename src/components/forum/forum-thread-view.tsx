"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitBranch, Heart, Pencil, Reply, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import type { ForumCommentDTO, ForumEntryDetailDTO, ForumSegment, Locale } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ApiFail } from "@/services/forum-api";
import {
  forumDelete,
  forumEntryTitle,
  forumFetchEntryDetail,
  forumPostJson,
  forumPutJson,
} from "@/services/forum-api";
import { localizedHref, t } from "@/services/literals";
import { buildAuthHref } from "@/lib/auth-return-path";
import { forumAuthorLine } from "@/lib/forum-author-display";
import { useScrollReveal } from "@/components/portfolio/use-scroll-reveal";
import { ForumAsideBranches } from "./forum-aside-branches";
import { ForumAsideParticipants } from "./forum-aside-participants";
import { ForumSegmentsDisplay } from "./forum-segments-display";

type Props = {
  locale: Locale;
  thematicSlug: string;
  entrySlug: string;
  initialDetail: ForumEntryDetailDTO | null;
};

function authNextPath(thematicSlug: string, entrySlug: string): string {
  return `/foro/${thematicSlug}/${entrySlug}`;
}

export function ForumThreadView({ locale, thematicSlug, entrySlug, initialDetail }: Props) {
  const router = useRouter();
  const baseId = useId();
  const commentsRevealRef = useScrollReveal<HTMLElement>();
  const [detail, setDetail] = useState<ForumEntryDetailDTO | null>(initialDetail);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [composer, setComposer] = useState<ForumSegment[]>([{ type: "text", content: "" }]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<ForumCommentDTO | null>(null);
  const [branchFor, setBranchFor] = useState<ForumCommentDTO | null>(null);
  const [branchTitle, setBranchTitle] = useState("");
  const [branchSlug, setBranchSlug] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const mapForumApiError = (code: string | undefined) => {
    if (code === "content_rejected") return t(locale, "forum.ui.errorContentRejected");
    if (code === "moderation_unavailable") return t(locale, "forum.ui.errorModerationUnavailable");
    if (code === "rate_limited") return t(locale, "forum.ui.errorRateLimited");
    return t(locale, "forum.ui.errorGeneric");
  };

  const refresh = useCallback(
    async (token?: string | null) => {
      const next = await forumFetchEntryDetail(thematicSlug, entrySlug, token ?? undefined);
      if (next) setDetail(next);
    },
    [thematicSlug, entrySlug],
  );

  useEffect(() => {
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const [{ data: sessionData }, { data: userData }] = await Promise.all([
          supabase.auth.getSession(),
          supabase.auth.getUser(),
        ]);
        setCurrentUserId(userData.user?.id ?? null);
        await refresh(sessionData.session?.access_token ?? null);
      } catch {
        await refresh(null);
      }
    })();
  }, [refresh]);

  const getToken = async (): Promise<string | null> => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  };

  const requireAuth = () => {
    router.push(buildAuthHref(locale, authNextPath(thematicSlug, entrySlug)));
  };

  const onSubmitComment = async () => {
    const token = await getToken();
    if (!token) {
      requireAuth();
      return;
    }
    const segments = composer.filter((s) => s.content.trim().length > 0);
    if (segments.length === 0) return;
    setBusyId("composer");
    setActionError(null);
    const path = `/api/v1/forum/entries/${encodeURIComponent(thematicSlug)}/${encodeURIComponent(entrySlug)}/comments`;
    const res = await forumPostJson<ForumCommentDTO>(path, { segments, parentCommentId: replyTo }, token);
    setBusyId(null);
    if (!res.ok) {
      setActionError(mapForumApiError((res as ApiFail).error.code));
      return;
    }
    setComposer([{ type: "text", content: "" }]);
    setReplyTo(null);
    await refresh(token);
  };

  const onToggleLike = async (commentId: string) => {
    const token = await getToken();
    if (!token) {
      requireAuth();
      return;
    }
    setBusyId(commentId + "like");
    const path = `/api/v1/forum/entries/${encodeURIComponent(thematicSlug)}/${encodeURIComponent(entrySlug)}/comments/${commentId}/like`;
    const res = await forumPostJson<{ liked: boolean; likeCount: number }>(path, {}, token);
    setBusyId(null);
    if (!res.ok) return;
    await refresh(token);
  };

  const onToggleUseful = async (commentId: string) => {
    const token = await getToken();
    if (!token) {
      requireAuth();
      return;
    }
    setBusyId(commentId + "useful");
    const path = `/api/v1/forum/entries/${encodeURIComponent(thematicSlug)}/${encodeURIComponent(entrySlug)}/comments/${commentId}/useful`;
    const res = await forumPostJson<{ useful: boolean; usefulCount: number }>(path, {}, token);
    setBusyId(null);
    if (!res.ok) return;
    await refresh(token);
  };

  const executeDelete = async (commentId: string) => {
    const token = await getToken();
    if (!token) {
      requireAuth();
      return;
    }
    setPendingDeleteId(null);
    setBusyId(commentId + "del");
    const path = `/api/v1/forum/entries/${encodeURIComponent(thematicSlug)}/${encodeURIComponent(entrySlug)}/comments/${commentId}`;
    const res = await forumDelete(path, token);
    setBusyId(null);
    if (!res.ok) return;
    await refresh(token);
  };

  const onSaveEdit = async () => {
    if (!editing) return;
    const token = await getToken();
    if (!token) {
      requireAuth();
      return;
    }
    const segments = editing.segments.filter((s) => s.content.trim().length > 0);
    if (segments.length === 0) return;
    setBusyId(editing.id + "edit");
    setActionError(null);
    const path = `/api/v1/forum/entries/${encodeURIComponent(thematicSlug)}/${encodeURIComponent(entrySlug)}/comments/${editing.id}`;
    const res = await forumPutJson<{ updated: boolean }>(path, { segments }, token);
    setBusyId(null);
    if (!res.ok) {
      setActionError(mapForumApiError((res as ApiFail).error.code));
      return;
    }
    setEditing(null);
    await refresh(token);
  };

  const onCreateBranch = async () => {
    if (!branchFor) return;
    const token = await getToken();
    if (!token) {
      requireAuth();
      return;
    }
    const segments: ForumSegment[] = [{ type: "text", content: t(locale, "forum.ui.branchFromComment") }];
    const slug = branchSlug.trim() || `branch-${branchFor.id.slice(0, 8)}`;
    const title = branchTitle.trim() || slug;
    setBusyId(branchFor.id + "branch");
    setActionError(null);
    const path = `/api/v1/forum/entries/${encodeURIComponent(thematicSlug)}/${encodeURIComponent(entrySlug)}/comments/${branchFor.id}/branch`;
    const res = await forumPostJson<{ id: string; slug: string; thematicSlug: string }>(
      path,
      { title, slug, segments },
      token,
    );
    setBusyId(null);
    if (!res.ok) {
      setActionError(mapForumApiError((res as ApiFail).error.code));
      const details = (res as ApiFail).error.details;
      const redir =
        details &&
        typeof details === "object" &&
        "redirect" in details &&
        details.redirect &&
        typeof (details as { redirect: { thematicSlug: string; entrySlug: string } }).redirect.thematicSlug ===
          "string"
          ? (details as { redirect: { thematicSlug: string; entrySlug: string } }).redirect
          : undefined;
      if (redir) {
        setBranchFor(null);
        router.push(localizedHref(locale, `/foro/${redir.thematicSlug}/${redir.entrySlug}`));
      }
      return;
    }
    const data = res.data;
    setBranchFor(null);
    router.push(localizedHref(locale, `/foro/${data.thematicSlug}/${data.slug}`));
  };

  if (!detail) {
    return (
      <p className="rounded-md border border-dash-border bg-dash-surface p-6 text-dash-muted">
        {t(locale, "forum.ui.threadNotFound")}
      </p>
    );
  }

  const canModerate = detail.canModerate ?? false;
  const seed = detail.comments.find((c) => c.isEntrySeed);
  const others = detail.comments.filter((c) => !c.isEntrySeed).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-8">
        <nav className="font-dash-sans text-[10px] uppercase tracking-widest text-dash-muted">
          <Link href={localizedHref(locale, "/foro")} className="text-dash-accent-text hover:underline">
            {t(locale, "forum.ui.breadcrumbForum")}
          </Link>
          <span aria-hidden className="mx-2 text-dash-border">
            /
          </span>
          <Link href={localizedHref(locale, `/foro/${thematicSlug}`)} className="text-dash-accent-text hover:underline">
            {thematicSlug}
          </Link>
          <span aria-hidden className="mx-2 text-dash-border">
            /
          </span>
          <span className="text-dash-muted">{entrySlug}</span>
        </nav>

        <header className="space-y-2">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-dash-text sm:text-3xl">
            {forumEntryTitle(detail.entry, (key) => t(locale, key))}
          </h1>
          {seed ? (
            <p className="text-xs text-dash-muted">
              {forumAuthorLine(locale, seed)} · {t(locale, "forum.ui.threadOpened")}
            </p>
          ) : null}
        </header>

        {seed ? (
          <article className="rounded-md border border-dash-accent/35 bg-dash-surface p-5">
            <ForumSegmentsDisplay segments={seed.segments} />
            <CommentToolbar
              locale={locale}
              comment={seed}
              currentUserId={currentUserId}
              canModerate={canModerate}
              busyId={busyId}
              onLike={() => void onToggleLike(seed.id)}
              onUseful={() => void onToggleUseful(seed.id)}
              onReply={() => {
                void getToken().then((tok) => {
                  if (!tok) requireAuth();
                  else setReplyTo(seed.id);
                });
              }}
              onEdit={() => setEditing({ ...seed })}
              onDelete={() => setPendingDeleteId(seed.id)}
              onBranch={undefined}
            />
          </article>
        ) : null}

        {detail.usefulHighlights.length > 0 ? (
          <section aria-labelledby={`${baseId}-useful`} className="space-y-3">
            <h2 id={`${baseId}-useful`} className="flex items-center gap-2 font-headline text-sm font-bold text-dash-accent-text">
              <Sparkles className="size-4" aria-hidden />
              {t(locale, "forum.ui.usefulSectionTitle")}
            </h2>
            <ul className="space-y-3">
              {detail.usefulHighlights.map((c) => (
                <li key={`useful-${c.id}`} className="rounded-md border border-dash-accent/25 bg-dash-surface p-4">
                  <ForumSegmentsDisplay segments={c.segments} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section ref={commentsRevealRef} aria-label={t(locale, "forum.ui.navThematics")} className="space-y-4">
          {others.map((c) => (
            <article key={c.id} className="rounded-md border border-dash-border bg-dash-surface p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-dash-muted">
                <span className="font-medium text-dash-text">{forumAuthorLine(locale, c)}</span>
                {c.usefulCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-dash-accent/15 px-2 py-0.5 font-dash-sans text-[9px] uppercase tracking-wide text-dash-accent-text">
                    <Sparkles className="size-3" aria-hidden />
                    {t(locale, "forum.ui.useful")}
                  </span>
                ) : null}
              </div>
              <ForumSegmentsDisplay segments={c.segments} />
              <CommentToolbar
                locale={locale}
                comment={c}
                currentUserId={currentUserId}
                canModerate={canModerate}
                busyId={busyId}
                onLike={() => void onToggleLike(c.id)}
                onUseful={() => void onToggleUseful(c.id)}
                onReply={() => {
                  void getToken().then((tok) => {
                    if (!tok) requireAuth();
                    else setReplyTo(c.id);
                  });
                }}
                onEdit={() => setEditing({ ...c })}
                onDelete={() => setPendingDeleteId(c.id)}
                onBranch={() => {
                  void getToken().then((tok) => {
                    if (!tok) requireAuth();
                    else {
                      setBranchFor(c);
                      setBranchSlug(`branch-${c.id.slice(0, 8)}`);
                      setBranchTitle("");
                    }
                  });
                }}
              />
            </article>
          ))}
        </section>

        <section className="rounded-md border border-dash-border bg-dash-surface p-4">
          <h2 className="mb-3 font-headline text-sm font-bold text-dash-text">{t(locale, "forum.ui.composerSectionTitle")}</h2>
          {actionError ? (
            <p className="mb-2 rounded-md border border-dash-error/40 bg-dash-error/10 px-3 py-2 text-xs text-dash-error" role="alert">
              {actionError}
            </p>
          ) : null}
          {replyTo ? (
            <p className="mb-2 text-xs text-dash-muted">
              {t(locale, "forum.ui.reply")} · id {replyTo.slice(0, 8)}…
            </p>
          ) : null}
          <div className="space-y-2">
            {composer.map((seg, idx) =>
              seg.type === "text" ? (
                <textarea
                  key={idx}
                  className="min-h-[100px] w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
                  value={seg.content}
                  onChange={(e) => {
                    const next = [...composer];
                    next[idx] = { type: "text", content: e.target.value };
                    setComposer(next);
                  }}
                  placeholder={t(locale, "forum.ui.composerPlaceholder")}
                />
              ) : (
                <textarea
                  key={idx}
                  className="min-h-[80px] w-full rounded-md border border-dash-accent/30 bg-dash-bg px-3 py-2 font-dash-mono text-xs text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
                  value={seg.content}
                  onChange={(e) => {
                    const next = [...composer];
                    next[idx] = { type: "code", content: e.target.value, language: seg.language };
                    setComposer(next);
                  }}
                  placeholder={t(locale, "forum.ui.codeContent")}
                />
              ),
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-dash-border px-3 py-1.5 text-xs font-semibold text-dash-muted hover:border-dash-accent/50 hover:text-dash-accent-text"
              onClick={() => setComposer((s) => [...s, { type: "code", content: "", language: "txt" }])}
            >
              {t(locale, "forum.ui.addCodeBlock")}
            </button>
            <button
              type="button"
              className="rounded-md bg-dash-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-dash-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent disabled:opacity-50"
              onClick={() => void onSubmitComment()}
              disabled={busyId === "composer"}
            >
              {t(locale, "forum.ui.composerSubmit")}
            </button>
          </div>
        </section>
      </div>

      <aside className="w-full shrink-0 space-y-4 lg:w-80">
        <ForumAsideParticipants locale={locale} participants={detail.participants} />
        <ForumAsideBranches locale={locale} branches={detail.branches} />
      </aside>

      {editing ? (
        <div className="fixed inset-0 z-forum-modal-overlay flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-dash-border bg-dash-surface p-4">
            <h3 className="mb-3 font-headline text-lg font-bold text-dash-text">{t(locale, "forum.ui.edit")}</h3>
            {editing.segments.map((seg, idx) =>
              seg.type === "text" ? (
                <textarea
                  key={idx}
                  className="mb-2 min-h-[120px] w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
                  value={seg.content}
                  onChange={(e) => {
                    const next = [...editing.segments];
                    next[idx] = { type: "text", content: e.target.value };
                    setEditing({ ...editing, segments: next });
                  }}
                />
              ) : (
                <textarea
                  key={idx}
                  className="mb-2 min-h-[100px] w-full rounded-md border border-dash-accent/30 bg-dash-bg px-3 py-2 font-dash-mono text-xs text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
                  value={seg.content}
                  onChange={(e) => {
                    const next = [...editing.segments];
                    next[idx] = { type: "code", content: e.target.value, language: seg.language };
                    setEditing({ ...editing, segments: next });
                  }}
                />
              ),
            )}
            <div className="mt-3 flex gap-2">
              <button type="button" className="rounded-md bg-dash-accent px-4 py-2 text-xs font-bold text-dash-bg hover:opacity-90" onClick={() => void onSaveEdit()}>
                {t(locale, "forum.ui.save")}
              </button>
              <button type="button" className="rounded-md border border-dash-border px-4 py-2 text-xs text-dash-muted hover:text-dash-text" onClick={() => setEditing(null)}>
                {t(locale, "forum.ui.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteId ? (
        <div
          className="fixed inset-0 z-forum-modal-overlay flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${baseId}-del-title`}
        >
          <div className="w-full max-w-md rounded-md border border-dash-border bg-dash-surface p-4 shadow-lg">
            <h3 id={`${baseId}-del-title`} className="mb-2 font-headline text-lg font-bold text-dash-text">
              {t(locale, "forum.ui.deleteConfirmTitle")}
            </h3>
            <p className="mb-4 text-sm text-dash-muted">{t(locale, "forum.ui.deleteConfirmBody")}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-dash-error px-4 py-2 text-xs font-bold text-dash-bg hover:opacity-90"
                onClick={() => void executeDelete(pendingDeleteId)}
              >
                {t(locale, "forum.ui.deleteConfirmSubmit")}
              </button>
              <button type="button" className="rounded-md border border-dash-border px-4 py-2 text-xs text-dash-muted hover:text-dash-text" onClick={() => setPendingDeleteId(null)}>
                {t(locale, "forum.ui.deleteConfirmCancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {branchFor ? (
        <div className="fixed inset-0 z-forum-modal-overlay flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal>
          <div className="w-full max-w-md rounded-md border border-dash-border bg-dash-surface p-4">
            <h3 className="mb-3 flex items-center gap-2 font-headline text-lg font-bold text-dash-text">
              <GitBranch className="size-5 text-dash-accent-text" aria-hidden />
              {t(locale, "forum.ui.branchFromComment")}
            </h3>
            <label className="mb-1 block text-xs text-dash-muted">{t(locale, "forum.ui.newEntryTitle")}</label>
            <input className="mb-3 w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent" value={branchTitle} onChange={(e) => setBranchTitle(e.target.value)} />
            <label className="mb-1 block text-xs text-dash-muted">{t(locale, "forum.ui.newEntrySlug")}</label>
            <input className="mb-3 w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 font-dash-mono text-sm text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent" value={branchSlug} onChange={(e) => setBranchSlug(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="rounded-md bg-dash-accent px-4 py-2 text-xs font-bold text-dash-bg hover:opacity-90" onClick={() => void onCreateBranch()}>
                {t(locale, "forum.ui.newEntrySubmit")}
              </button>
              <button type="button" className="rounded-md border border-dash-border px-4 py-2 text-xs text-dash-muted hover:text-dash-text" onClick={() => setBranchFor(null)}>
                {t(locale, "forum.ui.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CommentToolbar({
  locale,
  comment,
  currentUserId,
  canModerate,
  busyId,
  onLike,
  onUseful,
  onReply,
  onEdit,
  onDelete,
  onBranch,
}: {
  locale: Locale;
  comment: ForumCommentDTO;
  currentUserId: string | null;
  canModerate: boolean;
  busyId: string | null;
  onLike: () => void;
  onUseful: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onBranch?: () => void;
}) {
  const isOwner = Boolean(currentUserId && comment.authorId === currentUserId);
  const canEdit = isOwner || canModerate;
  const canDelete = !comment.isEntrySeed && (isOwner || canModerate);
  const busy = Boolean(busyId && busyId.startsWith(comment.id));
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-dash-border pt-3">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md border border-dash-border px-2 py-1 text-[11px] font-semibold text-dash-muted hover:border-dash-accent/50 hover:text-dash-accent-text"
        onClick={onLike}
        disabled={busy}
        aria-pressed={comment.likedByMe}
      >
        <Heart className={`size-3.5 ${comment.likedByMe ? "fill-dash-accent-text text-dash-accent-text" : ""}`} aria-hidden />
        {comment.likeCount}
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md border border-dash-border px-2 py-1 text-[11px] font-semibold text-dash-muted hover:border-dash-accent/50 hover:text-dash-accent-text"
        onClick={onUseful}
        disabled={busy}
        aria-pressed={comment.usefulByMe}
      >
        <Sparkles className={`size-3.5 ${comment.usefulByMe ? "text-dash-accent-text" : ""}`} aria-hidden />
        {comment.usefulCount}
      </button>
      <button type="button" className="inline-flex items-center gap-1 text-[11px] font-semibold text-dash-accent-text hover:underline" onClick={onReply}>
        <Reply className="size-3.5" aria-hidden />
        {t(locale, "forum.ui.reply")}
      </button>
      {canEdit ? (
        <button type="button" className="inline-flex items-center gap-1 text-[11px] font-semibold text-dash-muted hover:text-dash-accent-text" onClick={onEdit}>
          <Pencil className="size-3.5" aria-hidden />
          {t(locale, "forum.ui.edit")}
        </button>
      ) : null}
      {canDelete ? (
        <button type="button" className="inline-flex items-center gap-1 text-[11px] font-semibold text-dash-error/80 hover:underline" onClick={onDelete}>
          <Trash2 className="size-3.5" aria-hidden />
          {t(locale, "forum.ui.delete")}
        </button>
      ) : null}
      {!comment.isEntrySeed && onBranch ? (
        <button type="button" className="inline-flex items-center gap-1 text-[11px] font-semibold text-dash-accent-text hover:underline" onClick={onBranch}>
          <GitBranch className="size-3.5" aria-hidden />
          {t(locale, "forum.ui.branchFromComment")}
        </button>
      ) : null}
    </div>
  );
}
