import type { Metadata } from "next";

import { ForumThreadView } from "@/components/forum/forum-thread-view";
import { resolveLocaleParam, t } from "@/services/literals";
import { forumEntryTitle, forumFetchEntryDetail, forumIsApiConfigured } from "@/services/forum-api";

// DESIGN.md / build fix: `forumFetchEntryDetail` usa `cache: "no-store"` (ver
// forum-api.ts) — es inherentemente request-time. Forzar dynamic evita que
// `next build` intente prerenderizar esta ruta estáticamente y dispare ese
// fetch (a un backend LAN/Supabase potencialmente inalcanzable) en build-time.
export const dynamic = "force-dynamic";

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
      <div className="rounded-md border border-dash-border bg-dash-surface p-6 text-sm text-dash-muted">
        {t(locale, "forum.ui.apiUnavailable")}
      </div>
    );
  }

  const initialDetail = await forumFetchEntryDetail(thematicSlug, entrySlug);

  return (
    <ForumThreadView locale={locale} thematicSlug={thematicSlug} entrySlug={entrySlug} initialDetail={initialDetail} />
  );
}
