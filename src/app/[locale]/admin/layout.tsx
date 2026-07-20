import type { Metadata } from "next";

import { dashFontVariables } from "@/components/staff-dash/dash-fonts";
import { DashShell } from "@/components/staff-dash/dash-shell";
import { resolveLocaleParam } from "@/services/literals";

// P4 SEO fix (H5): noindex the whole /admin subtree at the layout level so no
// page under it (e.g. admin/page.tsx, which has no metadata of its own) can
// end up indexable by omission.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type AdminLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const locale = resolveLocaleParam((await params).locale);
  return (
    <div className={dashFontVariables}>
      <DashShell locale={locale} section="admin">
        {children}
      </DashShell>
    </div>
  );
}
