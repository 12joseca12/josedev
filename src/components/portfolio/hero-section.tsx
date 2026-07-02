import {
  ArrowRight,
  Braces,
  Cloud,
  Code2,
  Smartphone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
    <section className="relative isolate w-full overflow-x-clip pb-8 pt-4 sm:pb-10 sm:pt-6 lg:pb-12 lg:pt-8">
      <div
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[min(92vh,56rem)] w-[100dvw] min-w-full -translate-x-1/2 overflow-visible"
        aria-hidden
      >
        <div className="absolute -top-[10%] left-[clamp(-4rem,8vw,6rem)] aspect-square w-[min(78vw,28rem)] max-w-[36rem] rounded-full bg-primary/[0.11] blur-[min(5.5rem,14vw)] sm:-top-[12%] sm:w-[min(72vw,34rem)] sm:max-w-[40rem] sm:blur-[min(6.5rem,11vw)] lg:left-[clamp(0rem,12vw,10rem)] lg:w-[min(58vw,42rem)] lg:max-w-[42rem] lg:blur-[min(8.75rem,9vw)]" />
        <div className="absolute right-[clamp(-3rem,8vw,5rem)] top-[28%] aspect-square w-[min(62vw,22rem)] max-w-[30rem] rounded-full bg-tertiary/[0.11] blur-[min(4.5rem,12vw)] sm:top-[32%] sm:w-[min(56vw,26rem)] sm:max-w-[34rem] sm:blur-[min(5.75rem,10vw)] lg:right-[clamp(0rem,10vw,8rem)] lg:top-[30%] lg:w-[min(48vw,32rem)] lg:max-w-[36rem] lg:blur-[min(7.5rem,8vw)]" />
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-background via-background/40 to-transparent opacity-90" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[90rem] min-w-0 px-4 sm:px-6 lg:px-8">
        <div className="grid min-w-0 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-6 xl:col-span-7">
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
            <Link
              data-hover-label={t(locale, "hero.ctaSecondary")}
              aria-label={t(locale, "hero.ctaSecondaryAria")}
              className="inline-flex w-full items-center justify-center rounded-xl border border-outline-variant/25 bg-surface-variant/20 px-6 py-3.5 font-headline text-sm font-bold text-on-surface backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-surface-variant/45 hover:shadow-[0_0_28px_rgba(195,245,255,0.12)] active:translate-y-0 sm:w-auto sm:px-8 sm:py-4 sm:text-base"
              href="/sobre-mi"
            >
              {t(locale, "hero.ctaSecondary")}
            </Link>
          </div>

          <div
            id="stack-preview"
            className="mt-12 scroll-mt-24 opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0 sm:mt-16"
          >
            <div className="flex flex-col gap-2">
              <span className="font-label text-[9px] uppercase tracking-widest text-outline sm:text-[10px]">
                {t(locale, "hero.aboutFocus")}
              </span>
              <ul className="flex flex-wrap gap-3 sm:gap-4">
                {stackIcons.map(({ Icon, key }) => (
                  <li key={key} aria-label={t(locale, `hero.icons.${key}`)} className="list-none">
                    <Link
                      href="/sobre-mi"
                      aria-label={t(locale, `hero.icons.${key}`)}
                      className="inline-flex rounded-lg p-1.5 text-on-surface-variant transition-all duration-300 hover:scale-110 hover:text-primary hover:drop-shadow-[0_0_10px_rgba(0,229,255,0.35)]"
                    >
                      <Icon className="size-7 sm:size-8" aria-hidden strokeWidth={1.75} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="relative mt-4 min-w-0 pb-12 sm:pb-14 lg:col-span-6 lg:mt-0 lg:pb-16 xl:col-span-5 xl:pb-20">
          <div className="relative flex w-full flex-col items-center gap-8 sm:gap-10 lg:px-0">
            <div
              className="pointer-events-none absolute left-1/2 top-[40%] -z-10 h-[min(24rem,85vw)] w-[min(28rem,110vw)] -translate-x-1/2 -translate-y-1/2 rounded-[40%] bg-gradient-to-b from-primary/[0.1] via-tertiary/[0.06] to-transparent opacity-70 blur-3xl sm:top-[42%] sm:h-[min(28rem,75vw)] sm:w-[min(32rem,95vw)] sm:opacity-80 lg:inset-0 lg:h-full lg:w-full lg:translate-x-0 lg:translate-y-0 lg:rounded-[2rem] lg:bg-gradient-to-br lg:from-primary/[0.07] lg:via-tertiary/[0.04] lg:to-transparent lg:opacity-[0.5] lg:blur-3xl"
              aria-hidden
            />

            <div className="glass-card group/terminal relative z-10 mx-auto flex w-full max-w-[min(36rem,100%)] flex-col overflow-hidden rounded-2xl border border-outline-variant/25 bg-surface-container-low/25 p-1 shadow-[0_8px_48px_rgba(0,0,0,0.42),0_0_0_1px_rgba(0,229,255,0.06),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.03] backdrop-blur-xl transition-[border-color,box-shadow] duration-500 sm:max-w-[min(40rem,100%)] sm:rounded-2xl sm:shadow-[0_12px_56px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,229,255,0.08)] lg:mx-0 lg:max-w-none lg:min-h-[18rem] lg:shadow-[0_20px_72px_rgba(0,0,0,0.5),0_0_0_1px_rgba(0,229,255,0.1),inset_0_1px_0_rgba(255,255,255,0.07)] hover:border-primary/30 hover:shadow-[0_12px_56px_rgba(0,0,0,0.45),0_0_40px_rgba(0,229,255,0.1),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center justify-between gap-3 rounded-t-xl border-b border-outline-variant/20 bg-surface-container/40 px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="flex items-center gap-2" aria-hidden>
                  <div className="size-2.5 rounded-full bg-mac-close/90 shadow-[0_0_6px_rgba(255,95,87,0.45)] sm:size-3" />
                  <div className="size-2.5 rounded-full bg-mac-minimize/90 shadow-[0_0_6px_rgba(254,188,46,0.35)] sm:size-3" />
                  <div className="size-2.5 rounded-full bg-mac-maximize/90 shadow-[0_0_6px_rgba(40,200,64,0.35)] sm:size-3" />
                </div>
                <div />
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-2 sm:flex-row sm:items-stretch sm:gap-4 sm:p-3 lg:gap-5 lg:p-4 xl:flex-col xl:items-stretch">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-outline-variant/15 bg-hero-terminal-surface px-3 py-3 font-mono text-[11px] leading-relaxed shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] sm:order-1 sm:px-4 sm:py-3.5 sm:text-xs md:text-sm lg:text-[13px] lg:leading-relaxed xl:order-2 xl:flex-none xl:min-h-[14rem] xl:text-sm">
                  <div className="min-h-0 min-w-0 flex-1 space-y-2 break-words [overflow-wrap:anywhere] whitespace-normal">
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
                        {t(locale, "hero.code.statusKey")}:{" "}
                        <span className="text-on-surface">&quot;{t(locale, "hero.preview.status")}&quot;</span>,
                      </p>
                      <p className="pl-3 text-primary sm:pl-4">
                        {t(locale, "hero.code.phoneKey")}:{" "}
                        <span className="text-on-surface">&quot;{t(locale, "hero.code.phoneVal")}&quot;</span>,
                      </p>
                      <p className="pl-3 text-primary sm:pl-4">
                        {t(locale, "hero.code.emailKey")}:{" "}
                        <span className="text-on-surface">&quot;{t(locale, "hero.code.emailVal")}&quot;</span>,
                      </p>
                      <p className="text-tertiary">{"}"};</p>
                    </div>
                </div>

                <div className="flex w-full min-w-0 justify-center sm:order-2 sm:w-auto sm:shrink-0 sm:justify-end xl:order-1 xl:justify-end">
                  <div className="glass-card flex w-full max-w-[18rem] flex-col overflow-hidden rounded-xl border border-outline-variant/20 bg-black/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] sm:w-64 sm:max-w-none lg:w-72 xl:w-72">
                    <div className="relative aspect-square w-full overflow-hidden bg-black">
                      <Image
                        src={PREVIEW_IMG}
                        alt={t(locale, "hero.preview.imageAlt")}
                        width={420}
                        height={420}
                        className="h-full w-full object-cover opacity-90 transition-opacity duration-500 group-hover/terminal:opacity-100"
                        sizes="(max-width: 640px) 72vw, (max-width: 1023px) 40vw, (max-width: 1535px) 240px, 288px"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="pointer-events-none absolute -inset-x-[min(40%,8rem)] -inset-y-[12%] -z-10 hidden rounded-[45%] bg-gradient-to-br from-primary/[0.07] via-primary/[0.02] to-transparent blur-3xl sm:block"
            aria-hidden
          />
        </div>
        </div>
      </div>
    </section>
  );
}
