"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import type { ForumEntrySummaryDTO, ForumThematicDTO, Locale } from "@/lib/types";
import { forumEntryTitle } from "@/services/forum-api";
import { t } from "@/services/literals";
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
      router.push("/foro");
      return;
    }
    router.push(`/foro?q=${encodeURIComponent(v)}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-[90rem] min-w-0 flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8 lg:px-8 lg:py-10">
      <aside className="w-full shrink-0 space-y-6 lg:sticky lg:top-24 lg:w-72 lg:self-start">
        {!configured ? (
          <p className="rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-4 text-sm text-on-surface-variant">
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
            className="w-full rounded-xl border border-outline-variant/35 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-outline/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
            autoComplete="off"
            maxLength={200}
          />
          <button
            type="submit"
            className="w-full rounded-xl border border-primary/40 bg-primary/15 py-2 text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary/25"
          >
            {t(locale, "forum.ui.searchSubmit")}
          </button>
        </form>

        <nav aria-label={t(locale, "forum.ui.navThematics")} className="space-y-1">
          <p className="font-label text-[10px] uppercase tracking-widest text-outline">
            {t(locale, "forum.ui.navThematics")}
          </p>
          <ForumThematicsNav locale={locale} thematics={thematics} entriesBySlug={entriesBySlug} />
        </nav>

        <div className="space-y-2">
          <Link
            href="/foro/new"
            className="flex w-full items-center justify-center rounded-xl bg-primary px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-on-primary-fixed shadow-[0_0_24px_color-mix(in_srgb,var(--color-primary-container)_20%,transparent)] transition-opacity hover:opacity-95"
          >
            {t(locale, "forum.ui.navNewEntry")}
          </Link>
          <Link
            href="/foro#popular"
            className="block rounded-lg border border-outline-variant/30 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant transition-colors hover:border-primary/35 hover:text-primary"
          >
            {t(locale, "forum.ui.navPopular")}
          </Link>
        </div>

        <div id="popular" className="scroll-mt-28 space-y-2 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 p-3">
          <p className="font-label text-[10px] uppercase tracking-widest text-outline">
            {t(locale, "forum.ui.popularTitle")}
          </p>
          <ul className="space-y-2">
            {popular.slice(0, 6).map((e) => (
              <li key={e.id}>
                <Link
                  href={`/foro/${e.thematicSlug}/${e.slug}`}
                  className="line-clamp-2 text-xs leading-snug text-on-surface-variant transition-colors hover:text-primary"
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
