import { ArrowRight, BookOpen, Database, Zap } from "lucide-react";
import Image from "next/image";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
};

const CASE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA2j4C3jmaFfYemzyPdwB18bMpx4OQd1rAywCWB5Sh7mDNB5QS5tGg_u6Z13NKU0FKNlWOV6RBcFh0xKmGJXXVWkwH-qFlqyP41Xhdgr-YX11WeCteqK9L2iuciGeN7eSW_B9lq_VpALBDtrUyFAyKu81fG9LBb1WI9xGFWmhyxBWHlBcyCWQsRN5YgP29gOZ5gqh339u_ZIx-Sr4dC0EKwXF7gShMvFt8fJHhGu3y1z8aYFd3tQzHadJaV4H8pvDskk-MCEcM2jl7D";

export function BentoSection({ locale }: Props) {
  return (
    <section
      id="services"
      className="mx-auto max-w-[90rem] scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-4">
        <div className="group relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-2xl bg-surface-container-low p-6 sm:min-h-0 sm:p-8 md:col-span-2 md:p-10">
          <div className="relative z-10">
            <span className="mb-3 block font-label text-[10px] font-normal uppercase tracking-widest text-primary sm:mb-4">
              {t(locale, "bento.services.eyebrow")}
            </span>
            <h2 className="mb-4 font-headline text-2xl font-bold sm:mb-6 sm:text-3xl">
              {t(locale, "bento.services.title")}
            </h2>
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-on-surface-variant sm:mb-8 sm:text-base">
              {t(locale, "bento.services.description")}
            </p>
            <a
              className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary transition-all group-hover:gap-4"
              href="#plans"
              aria-label={t(locale, "bento.services.ctaAria")}
            >
              {t(locale, "bento.services.cta")}
              <ArrowRight className="size-4 shrink-0" aria-hidden strokeWidth={2.5} />
            </a>
          </div>
          <div className="pointer-events-none absolute bottom-[-15%] right-[-8%] opacity-10 transition-opacity group-hover:opacity-20 sm:bottom-[-20%] sm:right-[-10%]">
            <Database className="size-[72px] sm:size-[120px] md:size-[200px]" aria-hidden strokeWidth={1} />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl bg-surface-container p-6 text-center sm:p-8">
          <span className="mb-1 font-headline text-4xl font-bold text-glow text-primary-fixed-dim sm:mb-2 sm:text-6xl">
            {t(locale, "bento.stats.value")}
          </span>
          <span className="max-w-[12rem] font-label text-[9px] uppercase leading-snug tracking-[0.2em] text-outline sm:text-[10px]">
            {t(locale, "bento.stats.label")}
          </span>
        </div>

        <div
          id="blog"
          className="group flex min-h-[220px] flex-col justify-between rounded-2xl border border-outline-variant/10 bg-surface-container-highest/50 p-6 transition-colors hover:bg-surface-container-highest sm:p-8"
        >
          <BookOpen
            className="size-8 text-tertiary-fixed-dim sm:size-10"
            aria-hidden
            strokeWidth={1.5}
          />
          <div>
            <h3 className="mb-2 font-headline text-lg font-bold sm:text-xl">{t(locale, "bento.blog.title")}</h3>
            <p className="mb-4 text-xs text-on-surface-variant">{t(locale, "bento.blog.description")}</p>
            <a
              className="font-label text-[10px] font-bold text-on-surface transition-colors group-hover:text-tertiary"
              href="#blog-posts"
              aria-label={t(locale, "bento.blog.ctaAria")}
            >
              {t(locale, "bento.blog.cta")}
            </a>
          </div>
        </div>

        <div
          id="portfolio"
          className="grid overflow-hidden rounded-2xl bg-surface-container-low md:col-span-3 md:grid-cols-2"
        >
          <div className="flex flex-col justify-center p-6 sm:p-8 md:p-10">
            <span className="mb-3 block font-label text-[10px] uppercase tracking-widest text-secondary sm:mb-4">
              {t(locale, "bento.caseStudy.eyebrow")}
            </span>
            <h3 className="mb-3 font-headline text-2xl font-bold sm:mb-4 sm:text-3xl">
              {t(locale, "bento.caseStudy.title")}
            </h3>
            <p className="mb-6 text-sm text-on-surface-variant sm:mb-8">{t(locale, "bento.caseStudy.description")}</p>
            <a
              className="inline-flex w-fit rounded-lg border border-outline-variant px-5 py-2 text-xs font-bold uppercase transition-colors hover:bg-surface-variant"
              href="#case"
              aria-label={t(locale, "bento.caseStudy.ctaAria")}
            >
              {t(locale, "bento.caseStudy.cta")}
            </a>
          </div>
          <div className="relative min-h-[200px] sm:min-h-[240px] md:h-auto md:min-h-[280px]">
            <Image
              src={CASE_IMG}
              alt={t(locale, "bento.caseStudy.imageAlt")}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-primary-container p-1">
          <div className="flex h-full min-h-[140px] w-full flex-col items-center justify-center rounded-xl bg-surface-container-lowest p-6 text-center sm:min-h-0 sm:p-8">
            <Zap className="mb-3 size-9 text-primary-container sm:mb-4 sm:size-11" aria-hidden strokeWidth={1.75} />
            <p className="font-headline text-base font-bold leading-tight sm:text-lg">
              {t(locale, "bento.performance.title")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
