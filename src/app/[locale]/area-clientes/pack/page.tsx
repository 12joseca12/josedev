import type { Metadata } from "next";

import { PackClient } from "@/components/client-portal/pack-client";
import { resolveLocaleParam, t } from "@/services/literals";

type PackPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PackPageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "clientPortal.packMetadataTitle"),
    description: t(locale, "clientPortal.packMetadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function PackPage({ params }: PackPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return <PackClient locale={locale} />;
}
