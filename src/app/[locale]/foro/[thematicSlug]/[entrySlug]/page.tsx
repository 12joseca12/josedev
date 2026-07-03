import type { Metadata } from "next";

import { ForumThreadView } from "@/components/forum/forum-thread-view";
import { resolveLocaleParam, t } from "@/services/literals";
import { forumEntryTitle, forumFetchEntryDetail, forumIsApiConfigured } from "@/services/forum-api";

type PageProps = {
  params: Promise<{ locale: string; thematicSlug: string; entrySlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, thematicSlug, entrySlug } = await params;
  const locale = resolveLocaleParam(rawLocale);
  const titleBase = t(locale, "screens.forum.metadataTitle");
  if (!forumIsApiConfigured()) {
    return { title: titleBase, description: t(locale, "screens.forum.metadataDescription") };
  }
  const detail = await forumFetchEntryDetail(thematicSlug, entrySlug);
  const entryTitle = detail ? forumEntryTitle(detail.entry, (key) => t(locale, key)) : entrySlug;
  return {
    title: `${entryTitle} · ${titleBase}`,
    description: t(locale, "screens.forum.metadataDescription"),
  };
}

export default async function ForumEntryPage({ params }: PageProps) {
  const { locale: rawLocale, thematicSlug, entrySlug } = await params;
  const locale = resolveLocaleParam(rawLocale);

  if (!forumIsApiConfigured()) {
    return (
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-6 text-sm text-on-surface-variant">
        {t(locale, "forum.ui.apiUnavailable")}
      </div>
    );
  }

  const initialDetail = await forumFetchEntryDetail(thematicSlug, entrySlug);

  return (
    <ForumThreadView locale={locale} thematicSlug={thematicSlug} entrySlug={entrySlug} initialDetail={initialDetail} />
  );
}
