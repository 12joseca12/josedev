import type { Metadata } from "next";

import { dashFontVariables } from "@/components/staff-dash/dash-fonts";
import { ClientShell } from "@/components/client-portal/client-shell";
import { resolveLocaleParam } from "@/services/literals";

// P4 SEO fix (H5): noindex the whole /area-clientes subtree at the layout
// level — same rationale as admin/layout.tsx.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type ClientAreaLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function ClientAreaLayout({ children, params }: ClientAreaLayoutProps) {
  const locale = resolveLocaleParam((await params).locale);
  return (
    <div className={dashFontVariables}>
      <ClientShell locale={locale}>{children}</ClientShell>
    </div>
  );
}
