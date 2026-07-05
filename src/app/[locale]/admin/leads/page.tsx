import type { Metadata } from "next";

import { AdminLeadsClient } from "@/components/staff-dash/admin-leads-client";
import { resolveLocaleParam, t } from "@/services/literals";

type AdminLeadsPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: AdminLeadsPageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "staffLeads.adminMetadataTitle"),
    description: t(locale, "staffLeads.adminMetadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminLeadsPage({ params }: AdminLeadsPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return <AdminLeadsClient locale={locale} />;
}
