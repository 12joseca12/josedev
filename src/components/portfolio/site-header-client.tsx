"use client";

import { Menu, Terminal, UserCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

export type NavLinkItem = {
  href: string;
  label: string;
};

type Props = {
  brand: string;
  links: NavLinkItem[];
  profileAria: string;
  profileMenuLabel: string;
  terminalAria: string;
  hireMe: string;
  openMenuLabel: string;
  closeMenuLabel: string;
};

export function SiteHeaderClient({
  brand,
  links,
  profileAria,
  profileMenuLabel,
  terminalAria,
  hireMe,
  openMenuLabel,
  closeMenuLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

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
      <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        <div className="min-w-0 cursor-default font-headline text-base font-bold tracking-tighter text-primary transition-[filter,text-shadow] duration-300 hover:drop-shadow-[0_0_14px_rgba(0,229,255,0.4)] sm:text-xl">
          {brand}
        </div>

        <div className="hidden items-center gap-6 font-headline text-sm font-medium uppercase tracking-tight md:flex lg:gap-8">
          {links.map((item) => (
            <a
              key={item.href}
              data-hover-label={item.label}
              className="relative shrink-0 py-1 text-slate-400 transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-gradient-to-r after:from-primary after:to-tertiary after:transition-transform after:duration-300 hover:text-primary hover:after:scale-x-100"
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/auth"
            data-hover-label={profileAria}
            aria-label={profileAria}
            className="rounded-lg p-2 text-on-surface-variant transition-all duration-300 hover:bg-surface-container-low/80 hover:text-primary hover:shadow-[0_0_18px_rgba(0,229,255,0.15)]"
          >
            <UserCircle className="size-5 sm:size-6" aria-hidden strokeWidth={2} />
          </Link>
          <button
            type="button"
            data-hover-label={terminalAria}
            className="rounded-lg p-2 text-primary-container transition-all duration-300 hover:bg-surface-container/60 hover:opacity-90 hover:shadow-[0_0_20px_rgba(0,229,255,0.2)]"
            aria-label={terminalAria}
          >
            <Terminal className="size-5 sm:size-6" aria-hidden strokeWidth={2} />
          </button>
          <button
            type="button"
            data-hover-label={hireMe}
            className="signature-glow hidden rounded-lg px-4 py-2 font-headline text-xs font-bold tracking-tight text-on-primary-fixed shadow-[0_6px_24px_rgba(0,229,255,0.2)] transition-all duration-300 hover:scale-[1.02] hover:opacity-95 hover:shadow-[0_10px_32px_rgba(0,229,255,0.38)] active:scale-[0.98] sm:inline-flex sm:px-6 sm:text-sm"
          >
            {hireMe}
          </button>
          <button
            type="button"
            data-hover-label={open ? closeMenuLabel : openMenuLabel}
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
            <div className="fixed inset-0 z-[200] md:hidden" role="presentation">
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
                    <Link
                      href="/auth"
                      data-hover-label={profileAria}
                      aria-label={profileAria}
                      className="rounded-lg px-3 py-3 font-headline text-sm font-medium uppercase tracking-tight text-slate-400 transition-all duration-300 hover:bg-surface-container-low hover:pl-4 hover:text-primary hover:shadow-[inset_3px_0_0_0_var(--color-primary)]"
                      onClick={() => setOpen(false)}
                    >
                      {profileMenuLabel}
                    </Link>
                    {links.map((item) => (
                      <a
                        key={item.href}
                        data-hover-label={item.label}
                        className="rounded-lg px-3 py-3 font-headline text-sm font-medium uppercase tracking-tight text-slate-400 transition-all duration-300 hover:bg-surface-container-low hover:pl-4 hover:text-primary hover:shadow-[inset_3px_0_0_0_var(--color-primary)]"
                        href={item.href}
                        onClick={() => setOpen(false)}
                      >
                        {item.label}
                      </a>
                    ))}
                    <button
                      type="button"
                      data-hover-label={hireMe}
                      className="signature-glow mt-2 w-full rounded-lg px-6 py-3 font-headline text-sm font-bold text-on-primary-fixed shadow-[0_8px_28px_rgba(0,229,255,0.25)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_12px_36px_rgba(0,229,255,0.4)] active:scale-[0.99]"
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
    </>
  );
}
