"use client";

import { Menu, Terminal, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { LanguageSwitcher } from "@/components/nav/language-switcher";
import { NavProfileControl } from "@/components/nav/nav-profile-control";
import dynamic from "next/dynamic";

const TerminalChatPanel = dynamic(
  () => import("@/components/terminal/terminal-chat-panel").then((mod) => mod.TerminalChatPanel),
  { ssr: false },
);
import { isNavLinkActive } from "@/lib/nav-active";
import type { Locale } from "@/lib/types";

export type NavLinkItem = {
  href: string;
  label: string;
};

type Props = {
  locale: Locale;
  brand: string;
  links: NavLinkItem[];
  profileAria: string;
  profileAriaSignedIn: string;
  profileMenuLabel: string;
  profileMenuLabelSignedIn: string;
  terminalAria: string;
  hireMe: string;
  openMenuLabel: string;
  closeMenuLabel: string;
  currentPageLabel: string;
};

const navLinkBaseClass =
  "relative shrink-0 rounded-md px-2.5 py-1.5 font-headline text-sm font-medium uppercase tracking-tight transition-all duration-300";

const navLinkHoverGlowClass =
  "hover:[text-shadow:0_0_8px_color-mix(in_srgb,var(--color-primary-container)_42%,transparent),0_0_18px_color-mix(in_srgb,var(--color-primary-container)_20%,transparent)]";

const navLinkGlowClass =
  "[text-shadow:0_0_10px_color-mix(in_srgb,var(--color-primary-container)_55.00000000000001%,transparent),0_0_22px_color-mix(in_srgb,var(--color-primary-container)_28.000000000000004%,transparent)]";

const navLinkDesktopInactiveClass = `text-slate-400 underline-offset-[6px] decoration-2 decoration-transparent hover:text-primary hover:decoration-primary hover:underline ${navLinkHoverGlowClass}`;


const navLinkDesktopActiveClass = `font-bold text-primary underline decoration-primary decoration-2 underline-offset-[6px] ${navLinkGlowClass}`;

const navLinkMobileBaseClass =
  "rounded-lg px-3 py-3 font-headline text-sm font-medium uppercase tracking-tight transition-all duration-300";

const navLinkMobileInactiveClass = `text-slate-400 hover:text-primary hover:underline hover:decoration-primary hover:decoration-2 hover:underline-offset-4 ${navLinkHoverGlowClass}`;

const navLinkMobileActiveClass = `font-bold text-primary underline decoration-primary decoration-2 underline-offset-4 ${navLinkGlowClass}`;

export function SiteHeaderClient({
  locale,
  brand,
  links,
  profileAria,
  profileAriaSignedIn,
  profileMenuLabel,
  profileMenuLabelSignedIn,
  terminalAria,
  hireMe,
  openMenuLabel,
  closeMenuLabel,
  currentPageLabel,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const panelId = useId();
  const hoverLabelBelow = { "data-hover-label-placement": "below" as const };

  const navLinkA11y = (label: string, active: boolean) =>
    active ? { "aria-current": "page" as const, "aria-label": `${label} (${currentPageLabel})` } : {};

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        <div className="min-w-0 cursor-default font-headline text-base font-bold tracking-tighter text-primary transition-[filter,text-shadow] duration-300 hover:drop-shadow-[0_0_14px_color-mix(in_srgb,var(--color-primary-container)_40%,transparent)] sm:text-xl">
          {brand}
        </div>

        <div className="hidden items-center gap-6 font-headline text-sm font-medium uppercase tracking-tight md:flex lg:gap-8">
          {links.map((item) => {
            const active = isNavLinkActive(item.href, pathname);
            return (
              <a
                key={item.href}
                href={item.href}
                data-hover-label={item.label}
                {...hoverLabelBelow}
                {...navLinkA11y(item.label, active)}
                className={`${navLinkBaseClass} ${active ? navLinkDesktopActiveClass : navLinkDesktopInactiveClass}`}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageSwitcher locale={locale} />
          <NavProfileControl
            variant="icon"
            hoverLabelPlacement="below"
            profileAria={profileAria}
            profileAriaSignedIn={profileAriaSignedIn}
            profileMenuLabel={profileMenuLabel}
            profileMenuLabelSignedIn={profileMenuLabelSignedIn}
          />
          <button
            type="button"
            data-hover-label={terminalAria}
            {...hoverLabelBelow}
            className="rounded-lg p-2 text-primary-container transition-all duration-300 hover:bg-surface-container/60 hover:opacity-90 hover:shadow-[0_0_20px_color-mix(in_srgb,var(--color-primary-container)_20%,transparent)]"
            aria-label={terminalAria}
            aria-expanded={terminalOpen}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTerminalOpen(true);
            }}
          >
            <Terminal className="size-5 sm:size-6" aria-hidden strokeWidth={2} />
          </button>
          <button
            type="button"
            data-hover-label={hireMe}
            {...hoverLabelBelow}
            className="signature-glow hidden rounded-lg px-4 py-2 font-headline text-xs font-bold tracking-tight text-on-primary-fixed shadow-[0_6px_24px_color-mix(in_srgb,var(--color-primary-container)_20%,transparent)] transition-all duration-300 hover:scale-[1.02] hover:opacity-95 hover:shadow-[0_10px_32px_color-mix(in_srgb,var(--color-primary-container)_38%,transparent)] active:scale-[0.98] sm:inline-flex sm:px-6 sm:text-sm"
          >
            {hireMe}
          </button>
          <button
            type="button"
            data-hover-label={open ? closeMenuLabel : openMenuLabel}
            {...hoverLabelBelow}
            className="inline-flex rounded-lg p-2 text-on-surface transition-colors duration-300 hover:bg-surface-container-low/80 hover:text-primary md:hidden"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? closeMenuLabel : openMenuLabel}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-mobile-menu-overlay md:hidden" role="presentation">
              <button
                type="button"
                className="absolute inset-0 bg-background/75 backdrop-blur-md"
                aria-label={closeMenuLabel}
                onClick={() => setOpen(false)}
              />
              <div
                id={panelId}
                className="relative z-10 flex w-full max-w-full flex-col border-t border-outline-variant/25 bg-background/96 pt-[env(safe-area-inset-top)] shadow-[0_0_48px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                role="dialog"
                aria-modal="true"
                aria-label={openMenuLabel}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/20 px-4 py-3">
                  <span className="truncate font-headline text-sm font-bold text-primary">{brand}</span>
                  <button
                    type="button"
                    data-hover-label={closeMenuLabel}
                    className="rounded-lg p-2 text-on-surface transition-colors hover:bg-surface-container-low hover:text-primary"
                    aria-label={closeMenuLabel}
                    onClick={() => setOpen(false)}
                  >
                    <X className="size-6" aria-hidden />
                  </button>
                </div>
                <nav
                  aria-label={brand}
                  className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-5.75rem)] overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4"
                >
                  <div className="flex flex-col gap-1">
                    <div className="mb-1 flex justify-center">
                      <LanguageSwitcher locale={locale} />
                    </div>
                    <NavProfileControl
                      variant="menu"
                      hoverLabelPlacement="below"
                      profileAria={profileAria}
                      profileAriaSignedIn={profileAriaSignedIn}
                      profileMenuLabel={profileMenuLabel}
                      profileMenuLabelSignedIn={profileMenuLabelSignedIn}
                      onNavigate={() => setOpen(false)}
                    />
                    {links.map((item) => {
                      const active = isNavLinkActive(item.href, pathname);
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          data-hover-label={item.label}
                          {...hoverLabelBelow}
                          {...navLinkA11y(item.label, active)}
                          className={`${navLinkMobileBaseClass} ${active ? navLinkMobileActiveClass : navLinkMobileInactiveClass}`}
                          onClick={() => setOpen(false)}
                        >
                          {item.label}
                        </a>
                      );
                    })}
                    <button
                      type="button"
                      data-hover-label={terminalAria}
                      {...hoverLabelBelow}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/35 bg-surface-container-low px-3 py-3 font-headline text-sm font-medium uppercase tracking-tight text-primary transition-colors hover:bg-primary/10"
                      onClick={() => {
                        setOpen(false);
                        setTerminalOpen(true);
                      }}
                    >
                      <Terminal className="size-5" aria-hidden strokeWidth={2} />
                      {terminalAria}
                    </button>
                    <button
                      type="button"
                      data-hover-label={hireMe}
                      className="signature-glow mt-2 w-full rounded-lg px-6 py-3 font-headline text-sm font-bold text-on-primary-fixed shadow-[0_8px_28px_color-mix(in_srgb,var(--color-primary-container)_25%,transparent)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_12px_36px_color-mix(in_srgb,var(--color-primary-container)_40%,transparent)] active:scale-[0.99]"
                    >
                      {hireMe}
                    </button>
                  </div>
                </nav>
              </div>
            </div>,
            document.body,
          )
        : null}

      <TerminalChatPanel locale={locale} open={terminalOpen} onClose={() => setTerminalOpen(false)} />
    </>
  );
}
