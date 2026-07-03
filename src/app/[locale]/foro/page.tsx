import Link from "next/link";
import { redirect } from "next/navigation";

import { localizedHref, resolveLocaleParam, t } from "@/services/literals";
import {
  forumEntryTitle,
  forumFetchSearch,
  forumFetchThematics,
  forumIsApiConfigured,
  forumThematicTitle,
} from "@/services/forum-api";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function ForumIndexPage({ params, searchParams }: PageProps) {
  const locale = resolveLocaleParam((await params).locale);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  if (!forumIsApiConfigured()) {
    return (
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-6 text-sm text-on-surface-variant">
        {t(locale, "forum.ui.apiUnavailable")}
      </div>
    );
  }

  const thematics = (await forumFetchThematics()) ?? [];

  if (q) {
    const results = await forumFetchSearch(q);
    if (!results) {
      return (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-6 text-sm text-on-surface-variant">
          {t(locale, "forum.ui.errorGeneric")}
        </div>
      );
    }

    return (
      <div className="min-w-0 space-y-8">
        <header className="space-y-2">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {t(locale, "forum.ui.searchResultsTitle")}
          </h1>
          <p className="text-sm text-on-surface-variant">
            <span className="font-mono text-primary">{q}</span>
          </p>
        </header>
        {results.entries.length === 0 && results.thematics.length === 0 ? (
          <p className="rounded-xl border border-outline-variant/25 bg-surface-container-low/40 p-6 text-sm text-on-surface-variant">
            {t(locale, "forum.ui.emptySearch")}
          </p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {results.entries.length > 0 ? (
              <section aria-labelledby="search-entries">
                <h2 id="search-entries" className="mb-3 font-headline text-sm font-bold text-on-surface">
                  {t(locale, "forum.ui.entriesListHeading")}
                </h2>
                <ul className="space-y-2">
                  {results.entries.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={localizedHref(locale, `/foro/${e.thematicSlug}/${e.slug}`)}
                        className="block rounded-lg border border-outline-variant/20 bg-surface-container-low/40 p-3 text-sm text-on-surface transition-colors hover:border-primary/35"
                      >
                        {forumEntryTitle(e, (key) => t(locale, key))}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {results.thematics.length > 0 ? (
              <section aria-labelledby="search-thematics">
                <h2 id="search-thematics" className="mb-3 font-headline text-sm font-bold text-on-surface">
                  {t(locale, "forum.ui.navThematics")}
                </h2>
                <ul className="space-y-2">
                  {results.thematics.map((th) => (
                    <li key={th.id}>
                      <Link
                        href={localizedHref(locale, `/foro/${th.slug}`)}
                        className="block rounded-lg border border-outline-variant/20 bg-surface-container-low/40 p-3 text-sm text-on-surface transition-colors hover:border-primary/35"
                      >
                        {forumThematicTitle(th, (key) => t(locale, key))}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  if (thematics.length > 0) {
    redirect(localizedHref(locale, `/foro/${thematics[0].slug}`));
  }

  return (
    <div className="min-w-0 space-y-6">
      <header className="space-y-3">
        <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {t(locale, "screens.forum.title")}
        </h1>
        <p className="max-w-2xl text-sm text-on-surface-variant">{t(locale, "forum.ui.homeEmptyHint")}</p>
      </header>
      <p className="rounded-xl border border-outline-variant/25 bg-surface-container-low/40 p-6 text-sm text-on-surface-variant">
        {t(locale, "forum.ui.noThematics")}
      </p>
      <Link
        href={localizedHref(locale, "/foro/new")}
        className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-on-primary-fixed transition-opacity hover:opacity-95"
      >
        {t(locale, "forum.ui.navNewEntry")}
      </Link>
    </div>
  );
}
