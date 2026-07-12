import type { Metadata } from "next";

import { AssetsClient } from "@/components/client-portal/assets-client";
import { resolveLocaleParam, t } from "@/services/literals";

type AssetsPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: AssetsPageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "clientPortal.assetsMetadataTitle"),
    description: t(locale, "clientPortal.assetsMetadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function AssetsPage({ params }: AssetsPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return <AssetsClient locale={locale} />;
}
