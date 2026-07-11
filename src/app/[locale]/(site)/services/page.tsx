import type { Metadata } from "next";

import { resolveLocaleParam, t } from "@/services/literals";

import { ServicesPageContent } from "@/components/services/services-page-content";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "screens.services.metadataTitle"),
    description: t(locale, "screens.services.metadataDescription"),
    alternates: {
      canonical: `/${locale}/services`,
      languages: { es: "/es/services", en: "/en/services" },
    },
    openGraph: {
      title: t(locale, "screens.services.metadataTitle"),
      description: t(locale, "screens.services.metadataDescription"),
      type: "website",
    },
  };
}

export default async function ServicesPage({ params }: PageProps) {
  const locale = resolveLocaleParam((await params).locale);

  return <ServicesPageContent locale={locale} />;
}
