import { SiteFooter } from "@/components/portfolio/site-footer";
import { SiteHeader } from "@/components/portfolio/site-header";
import { resolveLocaleParam } from "@/services/literals";

type SiteLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function SiteLayout({ children, params }: SiteLayoutProps) {
  const locale = resolveLocaleParam((await params).locale);

  return (
    <div className="flex min-h-full flex-col bg-dash-bg text-dash-text">
      <SiteHeader locale={locale} />
      {children}
      <SiteFooter locale={locale} />
    </div>
  );
}
