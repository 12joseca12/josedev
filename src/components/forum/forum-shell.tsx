"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import type { ForumEntrySummaryDTO, ForumThematicDTO, Locale } from "@/lib/types";
import { forumEntryTitle } from "@/services/forum-api";
import { localizedHref, t } from "@/services/literals";
import { ForumThematicsNav } from "./forum-thematics-nav";

type Props = {
  locale: Locale;
  thematics: ForumThematicDTO[];
  entriesBySlug: Record<string, ForumEntrySummaryDTO[]>;
  popular: ForumEntrySummaryDTO[];
  configured: boolean;
  children: ReactNode;
};

export function ForumShell({ locale, thematics, entriesBySlug, popular, configured, children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qId = useId();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) {
      router.push(localizedHref(locale, "/foro"));
      return;
    }
    router.push(`${localizedHref(locale, "/foro")}?q=${encodeURIComponent(v)}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-content min-w-0 flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8 lg:px-8 lg:py-10">
      <aside className="w-full shrink-0 space-y-6 lg:sticky lg:top-24 lg:w-72 lg:self-start">
        {!configured ? (
          <p className="rounded-md border border-dash-border bg-dash-surface p-4 text-sm text-dash-muted">
            {t(locale, "forum.ui.apiUnavailable")}
          </p>
        ) : null}

        <form onSubmit={onSearch} className="space-y-2">
          <label htmlFor={qId} className="sr-only">
            {t(locale, "forum.ui.searchAria")}
          </label>
          <input
            id={qId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t(locale, "forum.ui.searchPlaceholder")}
            className="w-full rounded-md border border-dash-border bg-dash-surface px-3 py-2.5 text-sm text-dash-text placeholder:text-dash-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
            autoComplete="off"
            maxLength={200}
          />
          <button
            type="submit"
            className="w-full rounded-md border border-dash-accent/40 bg-dash-accent/15 py-2 text-xs font-bold uppercase tracking-wide text-dash-accent-text transition-colors hover:bg-dash-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
          >
            {t(locale, "forum.ui.searchSubmit")}
          </button>
        </form>

        <nav aria-label={t(locale, "forum.ui.navThematics")} className="space-y-1">
          <p className="font-dash-sans text-[10px] uppercase tracking-widest text-dash-muted">
            {t(locale, "forum.ui.navThematics")}
          </p>
          <ForumThematicsNav locale={locale} thematics={thematics} entriesBySlug={entriesBySlug} />
        </nav>

        <div className="space-y-2">
          <Link
            href={localizedHref(locale, "/foro/new")}
            className="flex w-full items-center justify-center rounded-md bg-dash-accent px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-dash-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
          >
            {t(locale, "forum.ui.navNewEntry")}
          </Link>
          <Link
            href={`${localizedHref(locale, "/foro")}#popular`}
            className="block rounded-md border border-dash-border px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-dash-muted transition-colors hover:border-dash-accent/50 hover:text-dash-accent-text"
          >
            {t(locale, "forum.ui.navPopular")}
          </Link>
        </div>

        <div id="popular" className="scroll-mt-28 space-y-2 rounded-md border border-dash-border bg-dash-surface p-3">
          <p className="font-dash-sans text-[10px] uppercase tracking-widest text-dash-muted">
            {t(locale, "forum.ui.popularTitle")}
          </p>
          <ul className="space-y-2">
            {popular.slice(0, 6).map((e) => (
              <li key={e.id}>
                <Link
                  href={localizedHref(locale, `/foro/${e.thematicSlug}/${e.slug}`)}
                  className="line-clamp-2 text-xs leading-snug text-dash-muted transition-colors hover:text-dash-accent-text"
                >
                  {forumEntryTitle(e, (key) => t(locale, key))}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
