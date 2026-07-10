"use client";

import Link from "next/link";

import { useScrollReveal } from "@/components/portfolio/use-scroll-reveal";
import type { ForumEntrySummaryDTO, Locale } from "@/lib/types";
import { forumEntryTitle } from "@/services/forum-api";
import { localizedHref, t } from "@/services/literals";

type Props = {
  locale: Locale;
  thematicSlug: string;
  entries: ForumEntrySummaryDTO[];
};

/**
 * DESIGN.md Motion: reveal sutil (fade + rise) de la lista de entradas de un
 * tema al entrar en viewport. Reusa `useScrollReveal` (WS2) en vez de
 * duplicar lógica de ScrollTrigger — gateado por `prefers-reduced-motion`
 * dentro del hook, `once: true`.
 */
export function ForumEntriesListReveal({ locale, thematicSlug, entries }: Props) {
  const revealRef = useScrollReveal<HTMLUListElement>();

  return (
    <section aria-labelledby={`entries-${thematicSlug}`} className="space-y-4">
      <h2 id={`entries-${thematicSlug}`} className="font-headline text-lg font-bold text-dash-text">
        {t(locale, "forum.ui.entriesListHeading")}
      </h2>
      {entries.length === 0 ? (
        <p className="rounded-md border border-dash-border bg-dash-surface p-6 text-sm text-dash-muted">
          {t(locale, "forum.ui.emptyThematic")}
        </p>
      ) : (
        <ul ref={revealRef} className="space-y-3">
          {entries.map((e) => (
            <li key={e.id}>
              <Link
                href={localizedHref(locale, `/foro/${e.thematicSlug}/${e.slug}`)}
                className="block rounded-md border border-dash-border bg-dash-surface p-4 transition-colors hover:border-dash-accent/50"
              >
                <span className="font-headline text-base font-semibold text-dash-text">
                  {forumEntryTitle(e, (key) => t(locale, key))}
                </span>
                <span className="mt-1 block text-xs text-dash-muted">
                  {e.commentCount} · {e.likeCount} · {e.usefulCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
