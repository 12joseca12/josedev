import type { Metadata } from "next";

import { AdminClientesClient } from "@/components/staff-dash/admin-clientes-client";
import { resolveLocaleParam, t } from "@/services/literals";

type AdminClientesPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: AdminClientesPageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "adminClientes.metadataTitle"),
    description: t(locale, "adminClientes.metadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminClientesPage({ params }: AdminClientesPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return <AdminClientesClient locale={locale} />;
}
