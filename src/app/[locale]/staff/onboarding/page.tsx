import type { Metadata } from "next";

import { StaffOnboardingClient } from "@/components/staff-auth/staff-onboarding-client";
import { resolveLocaleParam, t } from "@/services/literals";

type StaffOnboardingPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: StaffOnboardingPageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "staffAuth.onboardingTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function StaffOnboardingPage({ params }: StaffOnboardingPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return <StaffOnboardingClient locale={locale} />;
}
