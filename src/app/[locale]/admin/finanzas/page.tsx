import type { Metadata } from "next";

import { FinanzasClient } from "@/components/staff-dash/finanzas-client";
import { resolveLocaleParam, t } from "@/services/literals";

type AdminFinanzasPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: AdminFinanzasPageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "finanzas.metadataTitle"),
    description: t(locale, "finanzas.metadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminFinanzasPage({ params }: AdminFinanzasPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return <FinanzasClient locale={locale} />;
}
