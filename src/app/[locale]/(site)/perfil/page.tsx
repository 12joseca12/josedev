import type { Metadata } from "next";

import { ProfileScreen } from "@/components/profile/profile-screen";
import { resolveLocaleParam, t } from "@/services/literals";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "profilePage.metadataTitle"),
    description: t(locale, "profilePage.metadataDescription"),
    robots: { index: false, follow: false },
    alternates: { canonical: `/${locale}/perfil` },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-content flex-1 justify-center px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <ProfileScreen locale={locale} />
    </main>
  );
}
