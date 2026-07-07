"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Menu, Terminal, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { LanguageSwitcher } from "@/components/nav/language-switcher";
import { NavProfileControl } from "@/components/nav/nav-profile-control";
import { ThemeToggle } from "@/components/nav/theme-toggle";
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
  openMenuLabel: string;
  closeMenuLabel: string;
  currentPageLabel: string;
};

const navLinkBaseClass =
  "relative shrink-0 rounded-sm px-2.5 py-1.5 font-headline text-sm font-medium transition-colors duration-200";

const navLinkDesktopInactiveClass =
  "text-dash-muted underline-offset-[6px] decoration-2 decoration-transparent hover:text-dash-accent-text hover:decoration-dash-accent hover:underline";

const navLinkDesktopActiveClass =
  "font-bold text-dash-accent-text underline decoration-dash-accent decoration-2 underline-offset-[6px]";

const navLinkMobileBaseClass =
  "rounded-sm px-3 py-3 font-headline text-sm font-medium transition-colors duration-200";

const navLinkMobileInactiveClass =
  "text-dash-muted hover:text-dash-accent-text hover:underline hover:decoration-dash-accent hover:decoration-2 hover:underline-offset-4";

const navLinkMobileActiveClass =
  "border-l-2 border-dash-accent bg-dash-accent/10 font-bold text-dash-accent-text";

export function SiteHeaderClient({
  locale,
  brand,
  links,
  profileAria,
  profileAriaSignedIn,
  profileMenuLabel,
  profileMenuLabelSignedIn,
  terminalAria,
  openMenuLabel,
  closeMenuLabel,
  currentPageLabel,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const panelId = useId();
  const hoverLabelBelow = { "data-hover-label-placement": "below" as const };
  const drawerPanelRef = useRef<HTMLDivElement>(null);
  const drawerBackdropRef = useRef<HTMLButtonElement>(null);

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

  // Drawer slide-in (~200ms, power2.out). Gated by prefers-reduced-motion via
  // gsap.matchMedia — with motion, we play the slide-in tween; without it,
  // the drawer just appears (no transform), so it's fully usable with zero
  // motion (DESIGN.md Motion/Accessibility).
  useGSAP(
    () => {
      if (!open) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (drawerPanelRef.current) {
          gsap.from(drawerPanelRef.current, { xPercent: 100, duration: 0.2, ease: "power2.out" });
        }
        if (drawerBackdropRef.current) {
          gsap.from(drawerBackdropRef.current, { autoAlpha: 0, duration: 0.2, ease: "power2.out" });
        }
        return () => mm.kill();
      });
    },
    { dependencies: [open] },
  );

  return (
    <>
      <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        <div className="min-w-0 cursor-default font-dash-mono text-base font-bold tracking-tight text-dash-text sm:text-xl">
          {brand}
        </div>

        <div className="hidden items-center gap-6 lg:gap-8 md:flex">
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

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher locale={locale} />
          <ThemeToggle locale={locale} />
          <div className="hidden md:block">
            <NavProfileControl
              variant="menu"
              hoverLabelPlacement="below"
              profileAria={profileAria}
              profileAriaSignedIn={profileAriaSignedIn}
              profileMenuLabel={profileMenuLabel}
              profileMenuLabelSignedIn={profileMenuLabelSignedIn}
            />
          </div>
          <button
            type="button"
            data-hover-label={terminalAria}
            {...hoverLabelBelow}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-dash-muted transition-colors duration-200 hover:bg-dash-border/40 hover:text-dash-accent-text"
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
            data-hover-label={open ? closeMenuLabel : openMenuLabel}
            {...hoverLabelBelow}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-dash-text transition-colors duration-200 hover:bg-dash-border/40 hover:text-dash-accent-text md:hidden"
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
                ref={drawerBackdropRef}
                type="button"
                className="absolute inset-0 bg-black/50"
                aria-label={closeMenuLabel}
                onClick={() => setOpen(false)}
              />
              <div
                ref={drawerPanelRef}
                id={panelId}
                className="relative z-10 ml-auto flex h-full w-full max-w-xs flex-col border-l border-dash-border bg-dash-bg pt-[env(safe-area-inset-top)] shadow-[0_0_48px_rgba(0,0,0,0.35)]"
                role="dialog"
                aria-modal="true"
                aria-label={openMenuLabel}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-dash-border px-4 py-3">
                  <span className="truncate font-dash-mono text-sm font-bold text-dash-text">{brand}</span>
                  <button
                    type="button"
                    data-hover-label={closeMenuLabel}
                    className="rounded-md p-2 text-dash-muted transition-colors hover:bg-dash-border/40 hover:text-dash-accent-text"
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
                    <div className="mb-1 flex items-center justify-center gap-2">
                      <LanguageSwitcher locale={locale} />
                      <ThemeToggle locale={locale} />
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
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-dash-border px-3 py-3 font-headline text-sm font-medium text-dash-muted transition-colors hover:border-dash-accent/40 hover:text-dash-accent-text"
                      onClick={() => {
                        setOpen(false);
                        setTerminalOpen(true);
                      }}
                    >
                      <Terminal className="size-5" aria-hidden strokeWidth={2} />
                      {terminalAria}
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
