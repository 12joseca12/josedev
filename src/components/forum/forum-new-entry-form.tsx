"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";
import { buildAuthHref } from "@/lib/auth-return-path";
import type { ForumSegment, ForumThematicDTO, Locale } from "@/lib/types";
import { slugFromTitleNoSpaces } from "@/lib/forum-slug";
import type { ApiFail } from "@/services/forum-api";
import { forumPostJson, forumThematicTitle } from "@/services/forum-api";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { localizedHref, t } from "@/services/literals";

type Props = {
  locale: Locale;
  thematics: ForumThematicDTO[];
};

type ThematicMode = "existing" | "new";

function authNextPath(): string {
  return typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/foro/new";
}

export function ForumNewEntryForm({ locale, thematics }: Props) {
  const router = useRouter();
  const formId = useId();
  const hasExisting = thematics.length > 0;
  const [thematicMode, setThematicMode] = useState<ThematicMode>(hasExisting ? "existing" : "new");
  const [existingThematicSlug, setExistingThematicSlug] = useState(thematics[0]?.slug ?? "");
  const [newThematicTitle, setNewThematicTitle] = useState("");
  const [newThematicDescription, setNewThematicDescription] = useState("");
  const [entryTitle, setEntryTitle] = useState("");
  const [segments, setSegments] = useState<ForumSegment[]>([{ type: "text", content: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrySlugPreview = useMemo(() => slugFromTitleNoSpaces(entryTitle, 120), [entryTitle]);
  const thematicSlugPreview = useMemo(() => slugFromTitleNoSpaces(newThematicTitle, 80), [newThematicTitle]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const titleTrim = entryTitle.trim();
    const filledSegments = segments.filter((s) => s.content.trim().length > 0);
    if (!titleTrim || filledSegments.length === 0) {
      setError(t(locale, "forum.ui.newEntryValidation"));
      return;
    }
    if (thematicMode === "existing" && !existingThematicSlug) {
      setError(t(locale, "forum.ui.newEntryValidation"));
      return;
    }
    if (thematicMode === "new" && !newThematicTitle.trim()) {
      setError(t(locale, "forum.ui.newEntryValidation"));
      return;
    }

    const entrySlug = slugFromTitleNoSpaces(titleTrim, 120);

    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.push(buildAuthHref(locale, authNextPath()));
        return;
      }

      const body =
        thematicMode === "existing"
          ? {
              thematicSlug: existingThematicSlug,
              slug: entrySlug,
              title: titleTrim,
              segments: filledSegments,
            }
          : {
              newThematic: {
                titleDisplay: newThematicTitle.trim(),
                descriptionDisplay: newThematicDescription.trim() || undefined,
              },
              slug: entrySlug,
              title: titleTrim,
              segments: filledSegments,
            };

      const res = await forumPostJson<{ thematicSlug: string; slug: string }>("/api/v1/forum/entries", body, token);
      if (!res.ok) {
        const fail = res as ApiFail;
        const isConflict = fail.error.code === "conflict";
        if (thematicMode === "new" && isConflict) {
          setError(t(locale, "forum.ui.conflictThematicSlug"));
        } else if (fail.error.code === "content_rejected") {
          setError(t(locale, "forum.ui.errorContentRejected"));
        } else if (fail.error.code === "moderation_unavailable") {
          setError(t(locale, "forum.ui.errorModerationUnavailable"));
        } else if (fail.error.code === "rate_limited") {
          setError(t(locale, "forum.ui.errorRateLimited"));
        } else {
          setError(t(locale, "forum.ui.errorGeneric"));
        }
        return;
      }
      router.push(localizedHref(locale, `/foro/${res.data.thematicSlug}/${res.data.slug}`));
    } catch {
      setError(t(locale, "forum.ui.errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form id={formId} onSubmit={(ev) => void onSubmit(ev)} className="max-w-2xl space-y-6">
      <fieldset className="space-y-3 rounded-md border border-dash-border bg-dash-surface p-4">
        <legend className="px-1 font-dash-sans text-[10px] font-semibold uppercase tracking-widest text-dash-muted">
          {t(locale, "forum.ui.newEntryThematicSection")}
        </legend>
        {!hasExisting ? (
          <p className="text-sm text-dash-muted">{t(locale, "forum.ui.noThematics")}</p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap" role="radiogroup" aria-label={t(locale, "forum.ui.newEntryThematicSection")}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-dash-text">
              <input
                type="radio"
                name={`${formId}-thematic-mode`}
                checked={thematicMode === "existing"}
                onChange={() => setThematicMode("existing")}
                className="accent-dash-accent"
              />
              {t(locale, "forum.ui.newEntryThematicModeExisting")}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-dash-text">
              <input
                type="radio"
                name={`${formId}-thematic-mode`}
                checked={thematicMode === "new"}
                onChange={() => setThematicMode("new")}
                className="accent-dash-accent"
              />
              {t(locale, "forum.ui.newEntryThematicModeNew")}
            </label>
          </div>
        )}

        {hasExisting && thematicMode === "existing" ? (
          <div>
            <label htmlFor={`${formId}-thematic`} className="mb-1 block text-xs font-medium text-dash-muted">
              {t(locale, "forum.ui.newEntryThematic")}
            </label>
            <select
              id={`${formId}-thematic`}
              className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
              value={existingThematicSlug}
              onChange={(e) => setExistingThematicSlug(e.target.value)}
            >
              {thematics.map((th) => (
                <option key={th.id} value={th.slug}>
                  {forumThematicTitle(th, (key) => t(locale, key))}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {(thematicMode === "new" || !hasExisting) && (
          <div className="space-y-3">
            <div>
              <label htmlFor={`${formId}-new-thematic-title`} className="mb-1 block text-xs font-medium text-dash-muted">
                {t(locale, "forum.ui.newThematicTitle")}
              </label>
              <input
                id={`${formId}-new-thematic-title`}
                className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
                value={newThematicTitle}
                onChange={(e) => setNewThematicTitle(e.target.value)}
                maxLength={120}
                autoComplete="off"
              />
              <p className="mt-1 font-dash-mono text-[11px] text-dash-muted" aria-live="polite">
                <span className="font-dash-sans text-dash-muted">{t(locale, "forum.ui.thematicSlugPreview")}: </span>/
                {thematicSlugPreview || "—"}
              </p>
            </div>
            <div>
              <label htmlFor={`${formId}-new-thematic-desc`} className="mb-1 block text-xs font-medium text-dash-muted">
                {t(locale, "forum.ui.newThematicDescription")}
              </label>
              <textarea
                id={`${formId}-new-thematic-desc`}
                className="min-h-[72px] w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
                value={newThematicDescription}
                onChange={(e) => setNewThematicDescription(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor={`${formId}-entry-title`} className="mb-1 block text-xs font-medium text-dash-muted">
          {t(locale, "forum.ui.newEntryTitle")}
        </label>
        <input
          id={`${formId}-entry-title`}
          className="w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
          value={entryTitle}
          onChange={(e) => setEntryTitle(e.target.value)}
          maxLength={200}
          required
          autoComplete="off"
        />
        <p id={`${formId}-slug-hint`} className="mt-1 text-xs text-dash-muted">
          {t(locale, "forum.ui.slugFromTitleHint")}
        </p>
        <p className="mt-1 font-dash-mono text-[11px] text-dash-muted" aria-live="polite">
          <span className="font-dash-sans text-dash-muted">{t(locale, "forum.ui.entrySlugPreview")}: </span>/{entrySlugPreview || "—"}
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-dash-muted">{t(locale, "forum.ui.newEntryBody")}</p>
        <div className="space-y-2">
          {segments.map((seg, idx) =>
            seg.type === "text" ? (
              <textarea
                key={idx}
                className="min-h-[100px] w-full rounded-md border border-dash-border bg-dash-bg px-3 py-2 text-sm text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
                value={seg.content}
                onChange={(e) => {
                  const next = [...segments];
                  next[idx] = { type: "text", content: e.target.value };
                  setSegments(next);
                }}
                placeholder={t(locale, "forum.ui.composerPlaceholder")}
              />
            ) : (
              <textarea
                key={idx}
                className="min-h-[100px] w-full rounded-md border border-dash-accent/30 bg-dash-bg px-3 py-2 font-dash-mono text-xs text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
                value={seg.content}
                onChange={(e) => {
                  const next = [...segments];
                  next[idx] = { type: "code", content: e.target.value, language: seg.language };
                  setSegments(next);
                }}
                placeholder={t(locale, "forum.ui.codeContent")}
              />
            ),
          )}
        </div>
        <button
          type="button"
          className="mt-2 rounded-md border border-dash-border px-3 py-1.5 text-xs font-semibold text-dash-muted hover:border-dash-accent/50 hover:text-dash-accent-text"
          onClick={() => setSegments((s) => [...s, { type: "code", content: "", language: "txt" }])}
        >
          {t(locale, "forum.ui.addCodeBlock")}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-dash-error">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-dash-accent px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-dash-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent disabled:opacity-50"
      >
        {busy ? t(locale, "forum.ui.loading") : t(locale, "forum.ui.newEntrySubmit")}
      </button>
    </form>
  );
}
