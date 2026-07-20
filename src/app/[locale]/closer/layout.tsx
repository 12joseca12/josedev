import type { Metadata } from "next";

import { dashFontVariables } from "@/components/staff-dash/dash-fonts";
import { DashShell } from "@/components/staff-dash/dash-shell";
import { resolveLocaleParam } from "@/services/literals";

// P4 SEO fix (H5): noindex the whole /closer subtree at the layout level —
// same rationale as admin/layout.tsx.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type CloserLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function CloserLayout({ children, params }: CloserLayoutProps) {
  const locale = resolveLocaleParam((await params).locale);
  return (
    <div className={dashFontVariables}>
      <DashShell locale={locale} section="closer">
        {children}
      </DashShell>
    </div>
  );
}
