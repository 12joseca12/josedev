"use client";

import { ChevronDown, ChevronRight, Folder } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

import { resolveActiveThematicSlug, syncExpandedWithActive, toggleExpandedSlug } from "@/lib/forum-nav-state";
import type { ForumEntrySummaryDTO, ForumThematicDTO, Locale } from "@/lib/types";
import { forumEntryTitle, forumThematicTitle } from "@/services/forum-api";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
  thematics: ForumThematicDTO[];
  entriesBySlug: Record<string, ForumEntrySummaryDTO[]>;
};

export function ForumThematicsNav({ locale, thematics, entriesBySlug }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const activeSlug = useMemo(() => resolveActiveThematicSlug(pathname), [pathname]);

  const [expanded, setExpanded] = useState<Set<string>>(() =>
    activeSlug ? new Set([activeSlug]) : new Set<string>(),
  );

  useEffect(() => {
    setExpanded((prev) => syncExpandedWithActive(prev, activeSlug));
  }, [activeSlug]);

  const onFolderClick = (slug: string) => {
    setExpanded((prev) => toggleExpandedSlug(prev, slug));
    if (activeSlug !== slug) {
      router.push(`/foro/${slug}`);
    }
  };

  const onFolderKeyDown = (e: KeyboardEvent, slug: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onFolderClick(slug);
    }
  };

  if (thematics.length === 0) {
    return (
      <p className="rounded-lg border border-outline-variant/25 bg-surface-container-low/40 px-3 py-2 text-xs text-on-surface-variant">
        {t(locale, "forum.ui.noThematics")}
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {thematics.map((th) => {
        const isActive = activeSlug === th.slug;
        const isOpen = expanded.has(th.slug);
        const title = forumThematicTitle(th, (key) => t(locale, key));
        const entries = entriesBySlug[th.slug] ?? [];
        const folderId = `forum-folder-${th.slug}`;
        const panelId = `forum-folder-panel-${th.slug}`;

        return (
          <li key={th.id} className="rounded-lg">
            <button
              type="button"
              id={folderId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => onFolderClick(th.slug)}
              onKeyDown={(e) => onFolderKeyDown(e, th.slug)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                isActive
                  ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-primary-container)_20%,transparent)]"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <span className="shrink-0 text-outline" aria-hidden>
                {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </span>
              <Folder className="size-4 shrink-0 text-primary/80" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{title}</span>
              <span className="sr-only">
                {isOpen ? t(locale, "forum.ui.collapseThematic") : t(locale, "forum.ui.expandThematic")}
              </span>
            </button>

            {isOpen ? (
              <div id={panelId} role="region" aria-labelledby={folderId} className="ml-3 border-l border-outline-variant/30 pl-2">
                {entries.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-on-surface-variant">{t(locale, "forum.ui.emptyThematic")}</p>
                ) : (
                  <ul className="space-y-0.5 py-1">
                    {entries.map((e) => {
                      const entryHref = `/foro/${e.thematicSlug}/${e.slug}`;
                      const entryActive = pathname === entryHref;
                      return (
                        <li key={e.id}>
                          <Link
                            href={entryHref}
                            className={`block rounded-md px-2 py-1.5 text-xs leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 ${
                              entryActive
                                ? "bg-surface-container-high font-medium text-primary"
                                : "text-on-surface-variant hover:bg-surface-container-high/80 hover:text-on-surface"
                            }`}
                          >
                            {forumEntryTitle(e, (key) => t(locale, key))}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
