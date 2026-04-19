import {
  ArrowRight,
  Braces,
  Cloud,
  Code2,
  Smartphone,
} from "lucide-react";
import Image from "next/image";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
};

const PREVIEW_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuACz7VphIvcmKsVwdb5gf_3QvUhbPqKmnhVjHZrl_aiv248e2n_N1kmjoh-yhvhW-06D0DXuabBHa3BnrU77fmKESoim2CodXKLYIOrIJtmHPqCwLjxyr8vFP9_ex59chVWPyPXbSbxX6VASZELp6AN-GVnJD_GqNB_oolhq-A1xer37nNOqEu0zm4E7Gr7MTNm2im_Gbd_GRkDoLcyOF9CjEHnMh2vL3Wo6_EuZV5fLVcl95HnmiOtocLcw_YL66nEJstZoTbpDnP3";

const stackIcons = [
  { Icon: Braces, key: "react" as const },
  { Icon: Code2, key: "typescript" as const },
  { Icon: Cloud, key: "aws" as const },
  { Icon: Smartphone, key: "swift" as const },
];

export function HeroSection({ locale }: Props) {
  return (
    <section className="relative mx-auto flex w-full max-w-[90rem] flex-col justify-center overflow-x-clip px-4 pb-8 pt-4 sm:min-h-0 sm:px-6 sm:pb-10 sm:pt-6 lg:min-h-0 lg:px-8 lg:pb-12 lg:pt-8">
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-[280px] w-[280px] max-w-full rounded-full bg-primary/10 blur-[80px] sm:-left-32 sm:-top-32 sm:h-[400px] sm:w-[400px] sm:blur-[100px] lg:-left-40 lg:-top-40 lg:h-[600px] lg:w-[600px] lg:blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 top-1/3 h-[220px] w-[220px] max-w-full rounded-full bg-tertiary/10 blur-[70px] sm:-right-24 sm:top-1/2 sm:h-[320px] sm:w-[320px] sm:blur-[90px] lg:-right-40 lg:h-[400px] lg:w-[400px]"
        aria-hidden
      />

      <div className="relative z-10 grid min-w-0 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-7">
          <div className="group/badge mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-outline-variant/20 bg-surface-container-low px-3 py-1.5 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(0,229,255,0.12)] sm:mb-5">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-tertiary" />
            <span className="font-label text-[9px] font-medium uppercase leading-tight tracking-[0.1em] text-tertiary sm:text-[10px]">
              {t(locale, "hero.badge")}
            </span>
          </div>

          <h1 className="mb-6 max-w-full break-words font-headline font-bold tracking-tighter text-on-surface sm:mb-8">
            <span className="block text-[clamp(1.75rem,7vw,2.75rem)] leading-[1.08] sm:text-5xl md:text-7xl lg:text-8xl lg:leading-[0.92]">
              {t(locale, "hero.line1")}
            </span>
            <span
              className="hero-accent-text mt-1 pb-0.5 text-[clamp(1.85rem,8vw,3.25rem)] font-bold leading-[1.08] sm:mt-0 sm:text-5xl md:text-7xl lg:text-8xl lg:leading-[0.92]"
            >
              {t(locale, "hero.line2Highlight")}
            </span>
            <span className="mt-1 block text-[clamp(1.75rem,7vw,2.75rem)] leading-[1.08] sm:text-5xl md:text-7xl lg:text-8xl lg:leading-[0.92]">
              {t(locale, "hero.line3")}
            </span>
          </h1>

          <p className="mb-8 max-w-xl text-base font-light leading-relaxed text-on-surface-variant sm:mb-10 sm:text-lg md:text-xl">
            {t(locale, "hero.description")}
          </p>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <a
              data-hover-label={t(locale, "hero.ctaPrimaryAria")}
              className="signature-glow group inline-flex w-full items-center justify-center gap-3 rounded-xl px-6 py-3.5 font-headline text-sm font-bold text-on-primary-fixed shadow-[0_8px_32px_rgba(0,229,255,0.15)] transition-all duration-300 hover:scale-[1.02] hover:opacity-95 hover:shadow-[0_12px_40px_rgba(0,229,255,0.35)] active:scale-[0.98] sm:w-auto sm:px-8 sm:py-4 sm:text-base"
              href="#portfolio"
              aria-label={t(locale, "hero.ctaPrimaryAria")}
            >
              {t(locale, "hero.ctaPrimary")}
              <ArrowRight
                className="size-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1.5"
                aria-hidden
                strokeWidth={2.25}
              />
            </a>
            <a
              data-hover-label={t(locale, "hero.ctaSecondary")}
              className="inline-flex w-full items-center justify-center rounded-xl border border-outline-variant/25 bg-surface-variant/20 px-6 py-3.5 font-headline text-sm font-bold text-on-surface backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-surface-variant/45 hover:shadow-[0_0_28px_rgba(195,245,255,0.12)] active:translate-y-0 sm:w-auto sm:px-8 sm:py-4 sm:text-base"
              href="#stack"
            >
              {t(locale, "hero.ctaSecondary")}
            </a>
          </div>

          <div
            id="stack"
            className="mt-12 scroll-mt-24 opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0 sm:mt-16"
          >
            <div className="flex flex-col gap-2">
              <span className="font-label text-[9px] uppercase tracking-widest text-outline sm:text-[10px]">
                {t(locale, "hero.stackFocus")}
              </span>
              <ul className="flex flex-wrap gap-3 sm:gap-4">
                {stackIcons.map(({ Icon, key }) => (
                  <li key={key} aria-label={t(locale, `hero.icons.${key}`)} className="list-none">
                    <span className="inline-flex rounded-lg p-1.5 text-on-surface-variant transition-all duration-300 hover:scale-110 hover:text-primary hover:drop-shadow-[0_0_10px_rgba(0,229,255,0.35)]">
                      <Icon className="size-7 sm:size-8" aria-hidden strokeWidth={1.75} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="relative mt-4 min-w-0 lg:col-span-5 lg:mt-0 lg:pb-14">
          <div className="glass-card group/code relative z-20 rounded-2xl border border-outline-variant/20 p-4 shadow-2xl transition-all duration-500 hover:border-primary/25 hover:shadow-[0_0_48px_rgba(0,229,255,0.12)] sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-error/40" aria-hidden />
              <div className="h-3 w-3 rounded-full bg-tertiary/40" aria-hidden />
              <div className="h-3 w-3 rounded-full bg-primary/40" aria-hidden />
            </div>
            <div className="min-w-0 font-mono text-[11px] leading-relaxed sm:text-xs md:text-sm">
              <div className="min-w-0 space-y-2 break-words [overflow-wrap:anywhere] whitespace-normal">
                <p className="text-tertiary">
                  <span className="text-on-surface-variant">{t(locale, "hero.code.const")}</span>{" "}
                  {t(locale, "hero.code.engineer")} = {"{"}
                </p>
                <p className="pl-3 text-primary sm:pl-4">
                  {t(locale, "hero.code.nameKey")}:{" "}
                  <span className="text-on-surface">&quot;{t(locale, "hero.code.nameVal")}&quot;</span>,
                </p>
                <p className="pl-3 text-primary sm:pl-4">
                  {t(locale, "hero.code.roleKey")}:{" "}
                  <span className="text-on-surface">&quot;{t(locale, "hero.code.roleVal")}&quot;</span>,
                </p>
                <p className="pl-3 text-primary sm:pl-4">
                  {t(locale, "hero.code.focusKey")}: [
                  <span className="text-on-surface">
                    &quot;{t(locale, "hero.code.focusPerformance")}&quot;
                  </span>
                  ,{" "}
                  <span className="text-on-surface">
                    &quot;{t(locale, "hero.code.focusScalability")}&quot;
                  </span>
                  ],
                </p>
                <p className="pl-3 text-primary sm:pl-4">
                  {t(locale, "hero.code.stackKey")}: ({t(locale, "hero.code.stackLambda")}) =&gt;{" "}
                  <span className="text-on-surface">{t(locale, "hero.code.stackExpr")}</span>
                </p>
                <p className="text-tertiary">{"}"};</p>
              </div>
            </div>
          </div>

          <div className="relative z-30 mt-8 w-full max-w-[280px] sm:max-w-sm lg:absolute lg:bottom-[-3rem] lg:right-0 lg:mt-0 lg:max-w-[min(16rem,100%)] lg:w-64">
            <div className="glass-card rounded-3xl border border-outline-variant/20 p-3 shadow-2xl transition-all duration-500 hover:border-tertiary/25 hover:shadow-[0_0_40px_rgba(69,254,201,0.1)] sm:p-4">
              <Image
                src={PREVIEW_IMG}
                alt={t(locale, "hero.preview.imageAlt")}
                width={256}
                height={400}
                className="mb-3 aspect-[9/16] w-full rounded-2xl object-cover sm:mb-4"
                sizes="(max-width: 1024px) 90vw, 256px"
              />
              <div className="flex items-center justify-between px-1 sm:px-2">
                <span className="font-headline text-[10px] font-bold tracking-tighter sm:text-xs">
                  {t(locale, "hero.preview.title")}
                </span>
                <span className="font-label text-[9px] text-tertiary sm:text-[10px]">
                  {t(locale, "hero.preview.status")}
                </span>
              </div>
            </div>
          </div>

          <div
            className="pointer-events-none absolute right-0 top-0 -z-10 hidden h-full w-full rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-3xl sm:block"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}
