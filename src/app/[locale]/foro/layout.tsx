import type { Metadata } from "next";
import { Suspense } from "react";

import { ForumShell } from "@/components/forum/forum-shell";
import { SiteFooter } from "@/components/portfolio/site-footer";
import { SiteHeader } from "@/components/portfolio/site-header";
import type { Locale } from "@/lib/types";
import { resolveLocaleParam, t } from "@/services/literals";
import {
  forumFetchEntries,
  forumFetchPopular,
  forumFetchThematics,
  forumIsApiConfigured,
} from "@/services/forum-api";
import type { ForumEntrySummaryDTO } from "@/lib/types";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Pick<LayoutProps, "params">): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "screens.forum.metadataTitle"),
    description: t(locale, "screens.forum.metadataDescription"),
  };
}

function ForumShellFallback({ locale }: { locale: Locale }) {
  return (
    <div className="mx-auto flex w-full max-w-content flex-1 items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
      <p className="text-sm text-on-surface-variant">{t(locale, "forum.ui.loading")}</p>
    </div>
  );
}

export default async function ForumLayout({ children, params }: LayoutProps) {
  const locale = resolveLocaleParam((await params).locale);
  const configured = forumIsApiConfigured();
  const [thematics, popular] = configured
    ? await Promise.all([forumFetchThematics(), forumFetchPopular(8)])
    : [null, null];

  const entriesBySlug: Record<string, ForumEntrySummaryDTO[]> = {};
  if (configured && thematics?.length) {
    const pairs = await Promise.all(
      thematics.map(async (th) => [th.slug, (await forumFetchEntries(th.slug)) ?? []] as const),
    );
    for (const [slug, entries] of pairs) {
      entriesBySlug[slug] = entries;
    }
  }

  return (
    <>
      <SiteHeader locale={locale} />
      <main id="main-content" className="flex min-h-[calc(100dvh-4rem)] flex-1 flex-col">
        <Suspense fallback={<ForumShellFallback locale={locale} />}>
          <ForumShell
            locale={locale}
            thematics={thematics ?? []}
            entriesBySlug={entriesBySlug}
            popular={popular ?? []}
            configured={configured}
          >
            {children}
          </ForumShell>
        </Suspense>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
