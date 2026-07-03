import type { Metadata } from "next";
import Link from "next/link";

import { localizedHref, resolveLocaleParam, t } from "@/services/literals";
import {
  forumEntryTitle,
  forumFetchEntries,
  forumFetchThematics,
  forumIsApiConfigured,
  forumThematicDescription,
  forumThematicTitle,
} from "@/services/forum-api";

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
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-6 text-sm text-on-surface-variant">
        {t(locale, "forum.ui.apiUnavailable")}
      </div>
    );
  }

  const [thematics, entries] = await Promise.all([forumFetchThematics(), forumFetchEntries(thematicSlug)]);

  const thematic = thematics?.find((th) => th.slug === thematicSlug);

  if (!thematic || !entries) {
    return (
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-6 text-sm text-on-surface-variant">
        {t(locale, "forum.ui.thematicNotFound")}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-8">
      <header className="space-y-2">
        <nav className="font-label text-[10px] uppercase tracking-widest text-outline">
          <Link href={localizedHref(locale, "/foro")} className="text-primary hover:underline">
            {t(locale, "forum.ui.breadcrumbForum")}
          </Link>
          <span aria-hidden className="mx-2 text-outline-variant">
            /
          </span>
          <span className="text-on-surface-variant">{thematicSlug}</span>
        </nav>
        <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {forumThematicTitle(thematic, (key) => t(locale, key))}
        </h1>
        {(() => {
          const desc = forumThematicDescription(thematic, (key) => t(locale, key));
          return desc ? <p className="max-w-2xl text-sm text-on-surface-variant">{desc}</p> : null;
        })()}
      </header>

      <section aria-labelledby={`entries-${thematicSlug}`} className="space-y-4">
        <h2 id={`entries-${thematicSlug}`} className="font-headline text-lg font-bold text-on-surface">
          {t(locale, "forum.ui.entriesListHeading")}
        </h2>
        {entries.length === 0 ? (
          <p className="rounded-xl border border-outline-variant/25 bg-surface-container-low/40 p-6 text-sm text-on-surface-variant">
            {t(locale, "forum.ui.emptyThematic")}
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => (
              <li key={e.id}>
                <Link
                  href={localizedHref(locale, `/foro/${e.thematicSlug}/${e.slug}`)}
                  className="block rounded-xl border border-outline-variant/25 bg-surface-container-low/40 p-4 transition-colors hover:border-primary/35 hover:bg-surface-container-low/70"
                >
                  <span className="font-headline text-base font-semibold text-on-surface">
                    {forumEntryTitle(e, (key) => t(locale, key))}
                  </span>
                  <span className="mt-1 block text-xs text-on-surface-variant">
                    {e.commentCount} · {e.likeCount} · {e.usefulCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
