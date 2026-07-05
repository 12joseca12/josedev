import { dashFontVariables } from "@/components/staff-dash/dash-fonts";
import { DashShell } from "@/components/staff-dash/dash-shell";
import { resolveLocaleParam } from "@/services/literals";

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
