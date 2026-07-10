import Link from "next/link";

import { ForumNewEntryForm } from "@/components/forum/forum-new-entry-form";
import { localizedHref, resolveLocaleParam, t } from "@/services/literals";
import { forumFetchThematics, forumIsApiConfigured } from "@/services/forum-api";

// DESIGN.md / build fix: fetchea thematics en request-time para poblar el
// selector del formulario (ver forum-api.ts). Forzar dynamic evita que
// `next build` dispare ese fetch en build-time al intentar prerenderizar.
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }> };

export default async function ForumNewPage({ params }: PageProps) {
  const locale = resolveLocaleParam((await params).locale);

  if (!forumIsApiConfigured()) {
    return (
      <div className="rounded-md border border-dash-border bg-dash-surface p-6 text-sm text-dash-muted">
        {t(locale, "forum.ui.apiUnavailable")}
      </div>
    );
  }

  const thematics = (await forumFetchThematics()) ?? [];

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
          <span className="text-dash-muted">new</span>
        </nav>
        <h1 className="font-headline text-2xl font-bold tracking-tight text-dash-text sm:text-3xl">
          {t(locale, "forum.ui.newEntryTitlePage")}
        </h1>
        <p className="max-w-2xl text-sm text-dash-muted">{t(locale, "forum.ui.newEntryIntro")}</p>
      </header>
      <ForumNewEntryForm locale={locale} thematics={thematics} />
    </div>
  );
}
