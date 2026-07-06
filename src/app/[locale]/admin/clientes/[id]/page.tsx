import type { Metadata } from "next";

import { AdminClienteDetailClient } from "@/components/staff-dash/admin-cliente-detail-client";
import { resolveLocaleParam, t } from "@/services/literals";

type AdminClienteDetailPageProps = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: AdminClienteDetailPageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "adminClienteDetail.metadataTitle"),
    description: t(locale, "adminClienteDetail.metadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminClienteDetailPage({ params }: AdminClienteDetailPageProps) {
  const { locale: rawLocale, id } = await params;
  const locale = resolveLocaleParam(rawLocale);
  return <AdminClienteDetailClient locale={locale} clientId={id} />;
}
