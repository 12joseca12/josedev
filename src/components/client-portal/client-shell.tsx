"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getSupabaseSSRBrowserClient } from "@/lib/supabase/ssr-browser-client";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type ClientShellProps = {
  locale: Locale;
  children: React.ReactNode;
};

type NavItem = { href: string; labelKey: string };

function navItemsFor(locale: Locale): NavItem[] {
  return [
    { href: `/${locale}/area-clientes/proyecto`, labelKey: "clientPortal.navProyecto" },
    { href: `/${locale}/area-clientes/tareas`, labelKey: "clientPortal.navTareas" },
    { href: `/${locale}/area-clientes/pack`, labelKey: "clientPortal.navPack" },
    { href: `/${locale}/perfil`, labelKey: "clientPortal.navPerfil" },
  ];
}

/**
 * Shell propio del portal cliente (DESIGN.md/Navigation): nav propia y distinta
 * de la pública y de la de staff, nunca mezclada. Espeja la estructura de
 * DashShell (src/components/staff-dash/dash-shell.tsx) y sus tokens `dash-*`:
 * sidebar fija en desktop, header compacto + tab bar inferior en mobile
 * (targets ≥44px). Dark-locked vía la clase `dark` en el root (Fase 4a): el
 * portal queda siempre oscuro sin importar el modo global del público.
 */
export function ClientShell({ locale, children }: ClientShellProps) {
  const pathname = usePathname();
  const items = navItemsFor(locale);

  async function signOut() {
    const supabase = getSupabaseSSRBrowserClient();
    await supabase.auth.signOut();
    window.location.assign(`/${locale}/auth`);
  }

  const brand = (
    <span className="font-dash-mono text-sm font-bold text-dash-text">
      {t(locale, "clientPortal.shellBrand")}
      <span className="text-dash-muted"> / {t(locale, "clientPortal.shellBrandSuffix")}</span>
    </span>
  );

  const roleLabel = t(locale, "clientPortal.roleClient");

  return (
    <div className="dark flex min-h-dvh bg-dash-bg font-dash-sans text-dash-text">
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
            {t(locale, "clientPortal.signOut")}
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
          {t(locale, "clientPortal.signOut")}
        </button>
      </nav>
    </div>
  );
}
