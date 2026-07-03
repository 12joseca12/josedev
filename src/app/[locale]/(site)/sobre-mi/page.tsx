import type { Metadata } from "next";

import { SobreMiEngineeringShowcase, SobreMiStackPortfolio } from "@/components/sobre-mi";
import { resolveLocaleParam, t } from "@/services/literals";

const catinfoSourceUrl = process.env.NEXT_PUBLIC_3CATINFO_REPO_URL?.trim() || null;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "screens.sobreMi.metadataTitle"),
    description: t(locale, "screens.sobreMi.metadataDescription"),
    alternates: {
      canonical: `/${locale}/sobre-mi`,
      languages: { es: "/es/sobre-mi", en: "/en/sobre-mi" },
    },
    openGraph: {
      title: t(locale, "screens.sobreMi.metadataTitle"),
      description: t(locale, "screens.sobreMi.metadataDescription"),
      type: "website",
    },
  };
}

export default async function SobreMiPage({ params }: PageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
    >
      <SobreMiStackPortfolio locale={locale} />
      <SobreMiEngineeringShowcase locale={locale} sourceUrl={catinfoSourceUrl} />
    </main>
  );
}
