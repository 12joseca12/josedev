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
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-content flex-1 items-center justify-center px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
        {t(locale, "clientAreaPage.h1")}
      </h1>
    </main>
  );
}
