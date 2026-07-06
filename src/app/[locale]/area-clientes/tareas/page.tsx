import type { Metadata } from "next";

import { TareasClient } from "@/components/client-portal/tareas-client";
import { resolveLocaleParam, t } from "@/services/literals";

type TareasPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: TareasPageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "clientPortal.tareasMetadataTitle"),
    description: t(locale, "clientPortal.tareasMetadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function TareasPage({ params }: TareasPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return <TareasClient locale={locale} />;
}
