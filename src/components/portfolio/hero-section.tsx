"use client";

import { ArrowRight, Braces, Cloud, Code2, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { TerminalTrafficDots } from "@/components/terminal/terminal-traffic-dots";
import type { Locale } from "@/lib/types";
import { localizedHref, t } from "@/services/literals";

type Props = {
  locale: Locale;
};

const stackIcons = [
  { Icon: Braces, key: "react" as const },
  { Icon: Code2, key: "typescript" as const },
  { Icon: Cloud, key: "aws" as const },
  { Icon: Smartphone, key: "swift" as const },
];

/**
 * Home hero (DESIGN.md "Home Hero (revised)"): un headline fuerte + una
 * línea de apoyo corta, exactamente 2 CTAs discretos (sin cards por
 * audiencia), terminal/CLI degradado a elemento secundario debajo del fold.
 */
export function HeroSection({ locale }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const ctasRef = useRef<HTMLDivElement>(null);

  // DESIGN.md Motion: entrance stagger sutil (headline → línea → CTAs) al
  // montar, gateado por prefers-reduced-motion. Sin motion, todo es visible
  // de inmediato (no hay estado oculto que dependa de la animación).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const targets = [headlineRef.current, descriptionRef.current, ctasRef.current].filter(
          (el): el is Exclude<typeof el, null> => el !== null,
        );
        if (targets.length === 0) return;
        gsap.from(targets, {
          autoAlpha: 0,
          y: 16,
          duration: 0.32,
          ease: "power2.out",
          stagger: 0.09,
        });
        return () => mm.kill();
      });
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className="relative w-full pb-8 pt-10 sm:pb-10 sm:pt-14 lg:pb-14 lg:pt-20">
      <div className="mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-dash-border bg-dash-surface px-3 py-1.5 sm:mb-6">
            <span className="h-2 w-2 shrink-0 rounded-full bg-dash-accent" aria-hidden />
            <span className="font-dash-sans text-[10px] font-medium uppercase leading-tight tracking-[0.1em] text-dash-muted">
              {t(locale, "hero.badge")}
            </span>
          </span>

          <h1
            ref={headlineRef}
            className="max-w-full break-words font-headline text-[clamp(1.75rem,6vw,2.875rem)] font-bold leading-[1.15] tracking-tight text-dash-text sm:text-[2.75rem] sm:leading-[1.15] lg:text-[2.875rem]"
          >
            {t(locale, "hero.headline")}
          </h1>

          <p
            ref={descriptionRef}
            className="mt-5 max-w-xl font-dash-sans text-base leading-relaxed text-dash-muted sm:mt-6 sm:text-lg"
          >
            {t(locale, "hero.description")}
          </p>

          <div ref={ctasRef} className="mt-8 flex w-full flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
            <Link
              data-hover-label={t(locale, "hero.ctaPrimaryAria")}
              aria-label={t(locale, "hero.ctaPrimaryAria")}
              href={localizedHref(locale, "/sobre-mi")}
              className="group inline-flex w-full items-center justify-center gap-2.5 rounded-md border-2 border-dash-accent bg-dash-accent px-6 py-3 font-headline text-sm font-bold text-dash-bg transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent sm:w-auto sm:px-7"
            >
              {t(locale, "hero.ctaPrimary")}
              <ArrowRight
                className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden
                strokeWidth={2.25}
              />
            </Link>
            <Link
              data-hover-label={t(locale, "hero.ctaSecondaryAria")}
              aria-label={t(locale, "hero.ctaSecondaryAria")}
              href={localizedHref(locale, "/services")}
              className="inline-flex w-full items-center justify-center rounded-md border border-dash-border px-6 py-3 font-headline text-sm font-bold text-dash-text transition-colors duration-200 hover:border-dash-accent hover:text-dash-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent sm:w-auto sm:px-7"
            >
              {t(locale, "hero.ctaSecondary")}
            </Link>
          </div>
        </div>

        {/* Terminal/CLI: elemento secundario debajo del fold, capado en mobile
            (sin scroll horizontal), no es navegación primaria. */}
        <div className="mx-auto mt-16 max-w-3xl sm:mt-20 lg:mt-24">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-dash-border" aria-hidden />
            <span className="font-dash-sans text-[10px] font-medium uppercase tracking-[0.2em] text-dash-muted">
              {t(locale, "hero.terminal.label")}
            </span>
            <span className="h-px flex-1 bg-dash-border" aria-hidden />
          </div>

          <div className="mx-auto w-full max-w-xl overflow-hidden rounded-lg border border-dash-border bg-dash-surface">
            <div className="flex items-center justify-between gap-3 border-b border-dash-border px-3 py-2.5 sm:px-4">
              <TerminalTrafficDots />
              <div />
            </div>
            <div className="min-w-0 overflow-x-hidden px-3 py-3 font-dash-mono text-[11px] leading-relaxed sm:px-4 sm:py-3.5 sm:text-xs">
              <div className="min-w-0 space-y-1.5 break-words [overflow-wrap:anywhere] whitespace-normal text-dash-muted">
                <p>
                  {t(locale, "hero.terminal.const")} {t(locale, "hero.terminal.engineer")} = {"{"}
                </p>
                <p className="pl-3 sm:pl-4">
                  {t(locale, "hero.terminal.nameKey")}:{" "}
                  <span className="text-dash-text">&quot;{t(locale, "hero.terminal.nameVal")}&quot;</span>,
                </p>
                <p className="pl-3 sm:pl-4">
                  {t(locale, "hero.terminal.roleKey")}:{" "}
                  <span className="text-dash-text">&quot;{t(locale, "hero.terminal.roleVal")}&quot;</span>,
                </p>
                <p className="pl-3 sm:pl-4">
                  {t(locale, "hero.terminal.statusKey")}:{" "}
                  <span className="text-dash-accent-text">&quot;{t(locale, "hero.terminal.statusVal")}&quot;</span>,
                </p>
                <p className="pl-3 sm:pl-4">
                  {t(locale, "hero.terminal.stackKey")}:{" "}
                  <span className="text-dash-text">&quot;{t(locale, "hero.terminal.stackVal")}&quot;</span>,
                </p>
                <p>{"}"};</p>
              </div>
            </div>
          </div>

          <p className="mx-auto mt-4 max-w-xl text-center font-dash-sans text-xs leading-relaxed text-dash-muted">
            {t(locale, "hero.terminal.hint")}
          </p>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4" aria-label={t(locale, "hero.aboutFocus")}>
            {stackIcons.map(({ Icon, key }) => (
              <li key={key} aria-label={t(locale, `hero.icons.${key}`)} className="list-none">
                <Link
                  href={localizedHref(locale, "/sobre-mi")}
                  aria-label={t(locale, `hero.icons.${key}`)}
                  className="inline-flex rounded-md p-1.5 text-dash-muted transition-colors duration-200 hover:text-dash-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
                >
                  <Icon className="size-6 sm:size-7" aria-hidden strokeWidth={1.75} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
