import Link from "next/link";

import { ForumNewEntryForm } from "@/components/forum/forum-new-entry-form";
import { localizedHref, resolveLocaleParam, t } from "@/services/literals";
import { forumFetchThematics, forumIsApiConfigured } from "@/services/forum-api";

type PageProps = { params: Promise<{ locale: string }> };

export default async function ForumNewPage({ params }: PageProps) {
  const locale = resolveLocaleParam((await params).locale);

  if (!forumIsApiConfigured()) {
    return (
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-6 text-sm text-on-surface-variant">
        {t(locale, "forum.ui.apiUnavailable")}
      </div>
    );
  }

  const thematics = (await forumFetchThematics()) ?? [];

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
          <span className="text-on-surface-variant">new</span>
        </nav>
        <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {t(locale, "forum.ui.newEntryTitlePage")}
        </h1>
        <p className="max-w-2xl text-sm text-on-surface-variant">{t(locale, "forum.ui.newEntryIntro")}</p>
      </header>
      <ForumNewEntryForm locale={locale} thematics={thematics} />
    </div>
  );
}
