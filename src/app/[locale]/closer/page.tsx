import type { Metadata } from "next";

import { CloserKanbanClient } from "@/components/staff-dash/closer-kanban-client";
import { resolveLocaleParam, t } from "@/services/literals";

type CloserPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: CloserPageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "staffLeads.closerMetadataTitle"),
    description: t(locale, "staffLeads.closerMetadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function CloserPage({ params }: CloserPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  return <CloserKanbanClient locale={locale} />;
}
