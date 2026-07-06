import type { Metadata } from "next";

import { ProyectoClient } from "@/components/client-portal/proyecto-client";
import { resolveLocaleParam, t } from "@/services/literals";

type ProyectoPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: ProyectoPageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "clientPortal.proyectoMetadataTitle"),
    description: t(locale, "clientPortal.proyectoMetadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function ProyectoPage({ params }: ProyectoPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return <ProyectoClient locale={locale} />;
}
