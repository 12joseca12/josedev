"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-browser-client";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type DashSection = "admin" | "closer";

type DashShellProps = {
  locale: Locale;
  section: DashSection;
  children: React.ReactNode;
};

type NavItem = { href: string; labelKey: string };

function navItemsFor(section: DashSection, locale: Locale): NavItem[] {
  if (section === "admin") {
    return [{ href: `/${locale}/admin/leads`, labelKey: "staffLeads.navAdminLeads" }];
  }
  return [{ href: `/${locale}/closer`, labelKey: "staffLeads.navCloserBoard" }];
}

/**
 * Shell contenido del portal staff (DESIGN.md/Navigation): sidebar propia,
 * nunca mezclada con el header público. Desktop: sidebar fija a la izquierda;
 * mobile: header compacto arriba + tab bar inferior (targets ≥44px).
 */
export function DashShell({ locale, section, children }: DashShellProps) {
  const pathname = usePathname();
  const items = navItemsFor(section, locale);

  async function signOut() {
    const supabase = getSupabaseSSRBrowserClient();
    await supabase.auth.signOut();
    window.location.assign(`/${locale}/staff/login`);
  }

  const brand = (
    <span className="font-dash-mono text-sm font-bold text-dash-text">
      {t(locale, "staffLeads.shellBrand")}
      <span className="text-dash-muted"> / {t(locale, "staffLeads.shellBrandSuffix")}</span>
    </span>
  );

  const roleLabel = t(locale, section === "admin" ? "staffLeads.roleAdmin" : "staffLeads.roleCloser");

  return (
    <div className="flex min-h-dvh bg-dash-bg font-dash-sans text-dash-text">
      {/* Sidebar desktop */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-dash-border bg-dash-surface md:flex">
        <div className="flex items-center gap-2 border-b border-dash-border px-5 py-4">{brand}</div>
        <nav aria-label={roleLabel} className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block border-l-2 px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent ${
                      active
                        ? "border-dash-accent bg-dash-bg text-dash-accent-text"
                        : "border-transparent text-dash-muted hover:text-dash-text"
                    }`}
                  >
                    {t(locale, item.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-dash-border p-3">
          <span className="mb-2 block px-3 font-dash-mono text-[10px] uppercase tracking-widest text-dash-muted">
            {roleLabel}
          </span>
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-lg border border-dash-border px-3 py-2 text-left text-[13px] text-dash-muted transition-colors hover:border-dash-accent hover:text-dash-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
          >
            {t(locale, "staffLeads.signOut")}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header mobile */}
        <header className="flex items-center justify-between border-b border-dash-border bg-dash-surface px-4 py-3 md:hidden">
          {brand}
          <span className="font-dash-mono text-[10px] uppercase tracking-widest text-dash-muted">
            {roleLabel}
          </span>
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 py-5 pb-24 md:px-8 md:py-6 md:pb-8">
          {children}
        </main>
      </div>

      {/* Tab bar mobile (DESIGN.md: dashboards colapsan a bottom bar bajo md) */}
      <nav
        aria-label={roleLabel}
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-dash-border bg-dash-surface md:hidden"
      >
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-1 touch-manipulation items-center justify-center text-[13px] font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dash-accent ${
                active ? "text-dash-accent-text" : "text-dash-muted"
              }`}
            >
              {t(locale, item.labelKey)}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-14 flex-1 touch-manipulation items-center justify-center text-[13px] font-medium text-dash-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dash-accent"
        >
          {t(locale, "staffLeads.signOut")}
        </button>
      </nav>
    </div>
  );
}
