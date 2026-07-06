import type { Metadata } from "next";

import { AdminPacksClient } from "@/components/staff-dash/admin-packs-client";
import { resolveLocaleParam, t } from "@/services/literals";

type AdminPacksPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: AdminPacksPageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "adminPacks.metadataTitle"),
    description: t(locale, "adminPacks.metadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminPacksPage({ params }: AdminPacksPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return <AdminPacksClient locale={locale} />;
}
