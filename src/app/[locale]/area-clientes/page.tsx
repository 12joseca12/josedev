import type { Metadata } from "next";

import { resolveLocaleParam, t } from "@/services/literals";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "clientAreaPage.metadataTitle"),
    description: t(locale, "clientAreaPage.metadataDescription"),
    robots: { index: false, follow: false },
    alternates: { canonical: `/${locale}/area-clientes` },
  };
}

export default async function ClientAreaPage({ params }: PageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return (
    <h1 className="font-dash-mono text-2xl font-bold tracking-tight text-dash-text">
      {t(locale, "clientAreaPage.h1")}
    </h1>
  );
}
