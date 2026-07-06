import { dashFontVariables } from "@/components/staff-dash/dash-fonts";
import { ClientShell } from "@/components/client-portal/client-shell";
import { resolveLocaleParam } from "@/services/literals";

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
