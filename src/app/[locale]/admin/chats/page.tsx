import type { Metadata } from "next";

import { AdminChatsClient } from "@/components/staff-dash/admin-chats-client";
import { resolveLocaleParam, t } from "@/services/literals";

type AdminChatsPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: AdminChatsPageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "adminChats.metadataTitle"),
    description: t(locale, "adminChats.metadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminChatsPage({ params }: AdminChatsPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return <AdminChatsClient locale={locale} />;
}
