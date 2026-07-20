import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { buildAlternates } from "@/lib/seo/alternates";
import { localizedHref, resolveLocaleParam, t } from "@/services/literals";
import {
  forumEntryTitle,
  forumFetchSearch,
  forumFetchThematics,
  forumIsApiConfigured,
  forumThematicTitle,
} from "@/services/forum-api";

// DESIGN.md / build fix: esta página depende de un fetch a la API del foro en
// request-time (thematics + búsqueda, sin cache larga — ver forum-api.ts,
// `revalidate: 30`/`10`). Forzarla a dynamic evita que `next build` intente
// generarla estáticamente e invoque ese fetch en build-time (donde el backend
// LAN/Supabase puede no estar disponible), que es lo que rompía el export
// estático del foro.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

// P4 SEO fix (H3): this page previously had no `generateMetadata` at all, so
// it inherited the root layout's blanket `alternates` — canonicalizing /foro
// to the homepage. Title/description stay inherited from foro/layout.tsx.
export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    alternates: buildAlternates(locale, "/foro"),
  };
}

export default async function ForumIndexPage({ params, searchParams }: PageProps) {
  const locale = resolveLocaleParam((await params).locale);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  if (!forumIsApiConfigured()) {
    return (
      <div className="rounded-md border border-dash-border bg-dash-surface p-6 text-sm text-dash-muted">
        {t(locale, "forum.ui.apiUnavailable")}
      </div>
    );
  }

  const thematics = (await forumFetchThematics()) ?? [];

  if (q) {
    const results = await forumFetchSearch(q);
    if (!results) {
      return (
        <div className="rounded-md border border-dash-border bg-dash-surface p-6 text-sm text-dash-muted">
          {t(locale, "forum.ui.errorGeneric")}
        </div>
      );
    }

    return (
      <div className="min-w-0 space-y-8">
        <header className="space-y-2">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-dash-text sm:text-3xl">
            {t(locale, "forum.ui.searchResultsTitle")}
          </h1>
          <p className="text-sm text-dash-muted">
            <span className="font-dash-mono text-dash-accent-text">{q}</span>
          </p>
        </header>
        {results.entries.length === 0 && results.thematics.length === 0 ? (
          <p className="rounded-md border border-dash-border bg-dash-surface p-6 text-sm text-dash-muted">
            {t(locale, "forum.ui.emptySearch")}
          </p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {results.entries.length > 0 ? (
              <section aria-labelledby="search-entries">
                <h2 id="search-entries" className="mb-3 font-headline text-sm font-bold text-dash-text">
                  {t(locale, "forum.ui.entriesListHeading")}
                </h2>
                <ul className="space-y-2">
                  {results.entries.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={localizedHref(locale, `/foro/${e.thematicSlug}/${e.slug}`)}
                        className="block rounded-md border border-dash-border bg-dash-surface p-3 text-sm text-dash-text transition-colors hover:border-dash-accent/50"
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
                <h2 id="search-thematics" className="mb-3 font-headline text-sm font-bold text-dash-text">
                  {t(locale, "forum.ui.navThematics")}
                </h2>
                <ul className="space-y-2">
                  {results.thematics.map((th) => (
                    <li key={th.id}>
                      <Link
                        href={localizedHref(locale, `/foro/${th.slug}`)}
                        className="block rounded-md border border-dash-border bg-dash-surface p-3 text-sm text-dash-text transition-colors hover:border-dash-accent/50"
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
        <h1 className="font-headline text-2xl font-bold tracking-tight text-dash-text sm:text-3xl">
          {t(locale, "screens.forum.title")}
        </h1>
        <p className="max-w-2xl text-sm text-dash-muted">{t(locale, "forum.ui.homeEmptyHint")}</p>
      </header>
      <p className="rounded-md border border-dash-border bg-dash-surface p-6 text-sm text-dash-muted">
        {t(locale, "forum.ui.noThematics")}
      </p>
      <Link
        href={localizedHref(locale, "/foro/new")}
        className="inline-flex rounded-md bg-dash-accent px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-dash-bg transition-opacity hover:opacity-90"
      >
        {t(locale, "forum.ui.navNewEntry")}
      </Link>
    </div>
  );
}
