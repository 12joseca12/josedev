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

// DESIGN.md / build fix: este layout fetchea thematics + popular + entries
// por cada thematic (ver forumFetchThematics/forumFetchPopular/forumFetchEntries
// en @/services/forum-api, todas con `next.revalidate` corto — pensadas para
// request-time, no build-time). Es el fetch más pesado del árbol del foro y
// el candidato principal a romper `next build` si el backend (LAN/Supabase)
// no es alcanzable durante el build. Forzar dynamic aquí cubre el layout Y
// hereda a todas las páginas hijas.
export const dynamic = "force-dynamic";

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
      <p className="text-sm text-dash-muted">{t(locale, "forum.ui.loading")}</p>
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
    // DESIGN.md: /foro no está bajo el route group `(site)`, así que no hereda
    // el fix de fondo que WS2 puso en (site)/layout.tsx. Se replica aquí
    // explícitamente para que el foro tenga el fondo/texto correctos en
    // light Y dark.
    <div className="flex min-h-dvh flex-col bg-dash-bg text-dash-text">
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
    </div>
  );
}
