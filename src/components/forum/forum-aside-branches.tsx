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
    <section className="rounded-xl border border-outline-variant/25 bg-surface-container-low/40 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
      <h2 className="mb-3 font-label text-[10px] uppercase tracking-widest text-outline">
        {t(locale, "forum.ui.branchesTitle")}
      </h2>
      <ul className="space-y-0 font-mono text-[11px] leading-relaxed text-on-surface-variant" aria-label={t(locale, "forum.ui.branchesTitle")}>
        {branches.map((b, idx) => (
          <li key={b.entryId} className="flex min-w-0 items-start gap-1">
            <span className="shrink-0 text-outline" aria-hidden>
              {idx === branches.length - 1 ? "└──" : "├──"}
            </span>
            <Link
              href={localizedHref(locale, `/foro/${b.thematicSlug}/${b.slug}`)}
              className="min-w-0 truncate text-primary underline-offset-2 hover:underline"
            >
              {b.slug}
              <span className="ms-1 text-on-surface-variant">← {t(locale, b.labelKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
