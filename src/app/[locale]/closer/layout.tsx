import { dashFontVariables } from "@/components/staff-dash/dash-fonts";
import { DashShell } from "@/components/staff-dash/dash-shell";
import { resolveLocaleParam } from "@/services/literals";

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
