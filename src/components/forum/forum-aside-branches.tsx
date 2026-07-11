import Link from "next/link";
import type { ForumBranchLinkDTO, Locale } from "@/lib/types";
import { localizedHref, t } from "@/services/literals";

type Props = {
  locale: Locale;
  branches: ForumBranchLinkDTO[];
};

export function ForumAsideBranches({ locale, branches }: Props) {
  if (branches.length === 0) return null;
  return (
    <section className="rounded-md border border-dash-border bg-dash-surface p-4">
      <h2 className="mb-3 font-dash-sans text-[10px] uppercase tracking-widest text-dash-muted">
        {t(locale, "forum.ui.branchesTitle")}
      </h2>
      <ul className="space-y-0 font-dash-mono text-[11px] leading-relaxed text-dash-muted" aria-label={t(locale, "forum.ui.branchesTitle")}>
        {branches.map((b, idx) => (
          <li key={b.entryId} className="flex min-w-0 items-start gap-1">
            <span className="shrink-0 text-dash-muted" aria-hidden>
              {idx === branches.length - 1 ? "└──" : "├──"}
            </span>
            <Link
              href={localizedHref(locale, `/foro/${b.thematicSlug}/${b.slug}`)}
              className="min-w-0 truncate text-dash-accent-text underline-offset-2 hover:underline"
            >
              {b.slug}
              <span className="ms-1 text-dash-muted">← {t(locale, b.labelKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
