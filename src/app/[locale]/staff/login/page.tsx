import type { Metadata } from "next";

import { StaffLoginClient } from "@/components/staff-auth/staff-login-client";
import { resolveLocaleParam, t } from "@/services/literals";

type StaffLoginPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: StaffLoginPageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "staffAuth.metadataTitle"),
    description: t(locale, "staffAuth.metadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function StaffLoginPage({ params }: StaffLoginPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return <StaffLoginClient locale={locale} />;
}
