import type { Metadata } from "next";
import Link from "next/link";

import { ForumEntriesListReveal } from "@/components/forum/forum-entries-list-reveal";
import { localizedHref, resolveLocaleParam, t } from "@/services/literals";
import {
  forumFetchEntries,
  forumFetchThematics,
  forumIsApiConfigured,
  forumThematicDescription,
  forumThematicTitle,
} from "@/services/forum-api";

// DESIGN.md / build fix: fetchea thematics+entries en request-time (ver
// forum-api.ts). Forzar dynamic evita que el export estático de `next build`
// dispare ese fetch en build-time.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string; thematicSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, thematicSlug } = await params;
  const locale = resolveLocaleParam(rawLocale);
  const titleBase = t(locale, "screens.forum.metadataTitle");
  let label = thematicSlug;
  if (forumIsApiConfigured()) {
    const list = await forumFetchThematics();
    const th = list?.find((x) => x.slug === thematicSlug);
    if (th) label = forumThematicTitle(th, (key) => t(locale, key));
  }
  return {
    title: `${label} · ${titleBase}`,
    description: t(locale, "screens.forum.metadataDescription"),
  };
}

export default async function ForumThematicPage({ params }: PageProps) {
  const { locale: rawLocale, thematicSlug } = await params;
  const locale = resolveLocaleParam(rawLocale);

  if (!forumIsApiConfigured()) {
    return (
      <div className="rounded-md border border-dash-border bg-dash-surface p-6 text-sm text-dash-muted">
        {t(locale, "forum.ui.apiUnavailable")}
      </div>
    );
  }

  const [thematics, entries] = await Promise.all([forumFetchThematics(), forumFetchEntries(thematicSlug)]);

  const thematic = thematics?.find((th) => th.slug === thematicSlug);

  if (!thematic || !entries) {
    return (
      <div className="rounded-md border border-dash-border bg-dash-surface p-6 text-sm text-dash-muted">
        {t(locale, "forum.ui.thematicNotFound")}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-8">
      <header className="space-y-2">
        <nav className="font-dash-sans text-[10px] uppercase tracking-widest text-dash-muted">
          <Link href={localizedHref(locale, "/foro")} className="text-dash-accent-text hover:underline">
            {t(locale, "forum.ui.breadcrumbForum")}
          </Link>
          <span aria-hidden className="mx-2 text-dash-border">
            /
          </span>
          <span className="text-dash-muted">{thematicSlug}</span>
        </nav>
        <h1 className="font-headline text-2xl font-bold tracking-tight text-dash-text sm:text-3xl">
          {forumThematicTitle(thematic, (key) => t(locale, key))}
        </h1>
        {(() => {
          const desc = forumThematicDescription(thematic, (key) => t(locale, key));
          return desc ? <p className="max-w-2xl text-sm text-dash-muted">{desc}</p> : null;
        })()}
      </header>

      <ForumEntriesListReveal thematicSlug={thematicSlug} entries={entries} locale={locale} />
    </div>
  );
}
