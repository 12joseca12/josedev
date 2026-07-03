import type { Metadata } from "next";

import { resolveLocaleParam, t } from "@/services/literals";

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
  };
}

export default async function ServicesPage({ params }: PageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return (
    <main className="mx-auto w-full max-w-[90rem] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
        {t(locale, "screens.services.title")}
      </h1>
    </main>
  );
}
