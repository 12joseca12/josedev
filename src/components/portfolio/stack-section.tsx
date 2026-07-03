import {
  Blocks,
  Box,
  Braces,
  Cloud,
  Code2,
  Database,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { localizedHref, t } from "@/services/literals";

type Props = {
  locale: Locale;
};

const stackCards = [
  { key: "frontend", Icon: Code2 },
  { key: "backend", Icon: Box },
  { key: "cloud", Icon: Cloud },
  { key: "data", Icon: Database },
  { key: "dx", Icon: Braces },
  { key: "security", Icon: ShieldCheck },
] as const;

const stackChips = [
  { key: "nextjs", Icon: Blocks },
  { key: "react", Icon: Braces },
  { key: "typescript", Icon: Code2 },
  { key: "tailwind", Icon: Sparkles },
  { key: "aws", Icon: Cloud },
  { key: "supabase", Icon: Database },
  { key: "performance", Icon: Zap },
] as const;

export function StackSection({ locale }: Props) {
  return (
    <section
      id="stack"
      aria-labelledby="stack-heading"
      className="mx-auto max-w-[90rem] scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-3xl text-center">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-surface-container-low px-3 py-1.5 font-label text-[10px] uppercase tracking-widest text-primary">
          <span className="size-1.5 rounded-full bg-tertiary shadow-[0_0_10px_color-mix(in_srgb,var(--color-tertiary-fixed)_35%,transparent)]" aria-hidden />
          {t(locale, "stack.eyebrow")}
        </span>
        <h2 id="stack-heading" className="font-headline text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t(locale, "stack.title")}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
          {t(locale, "stack.subtitle")}
        </p>
      </div>

      <div className="relative mt-10 overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-low/40 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:mt-12 sm:p-8">
        <div
          className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/[0.08] blur-[90px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 size-80 rounded-full bg-tertiary/[0.08] blur-[100px]"
          aria-hidden
        />

        <div className="relative z-10 grid gap-4 sm:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="grid gap-4 sm:grid-cols-2">
              {stackCards.map(({ key, Icon }) => (
                <div
                  key={key}
                  className="group rounded-2xl border border-outline-variant/20 bg-surface-container-low/30 p-5 transition-all duration-300 hover:border-primary/30 hover:bg-surface-container-low/50 hover:shadow-[0_0_40px_color-mix(in_srgb,var(--color-primary-container)_8%,transparent)]"
                >
                  <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl border border-outline-variant/20 bg-surface-container-lowest/60 text-primary shadow-[0_0_18px_color-mix(in_srgb,var(--color-primary-container)_8%,transparent)]">
                    <Icon className="size-5" aria-hidden strokeWidth={2} />
                  </div>
                  <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-on-surface">
                    {t(locale, `stack.cards.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                    {t(locale, `stack.cards.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-outline-variant/20 bg-[rgba(8,10,12,0.55)] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] sm:p-6">
              <p className="font-label text-[10px] uppercase tracking-widest text-outline">
                {t(locale, "stack.chipsLabel")}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {stackChips.map(({ key, Icon }) => (
                  <li key={key} className="list-none">
                    <Link
                      href={localizedHref(locale, "/sobre-mi")}
                      aria-label={t(locale, `stack.chips.${key}`)}
                      className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-surface-container-low/20 px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:border-primary/25 hover:text-primary"
                    >
                      <Icon className="size-4 opacity-80" aria-hidden strokeWidth={2} />
                      {t(locale, `stack.chips.${key}`)}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-xl border border-outline-variant/15 bg-surface-container-low/20 p-4">
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  <span className="font-semibold text-on-surface">{t(locale, "stack.noteStrong")} </span>
                  {t(locale, "stack.note")}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low/25 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:mt-6 sm:p-6">
              <h3 className="font-headline text-lg font-extrabold tracking-tight text-on-surface">
                {t(locale, "stack.ctaTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                {t(locale, "stack.ctaDescription")}
              </p>
              <Link
                href={localizedHref(locale, "/sobre-mi")}
                aria-label={t(locale, "stack.ctaButtonAria")}
                className="signature-glow mt-4 inline-flex w-full items-center justify-center rounded-xl px-6 py-3 font-headline text-xs font-bold uppercase tracking-tight text-on-primary-fixed shadow-[0_10px_30px_color-mix(in_srgb,var(--color-primary-container)_15%,transparent)] transition-all duration-300 hover:opacity-95 hover:shadow-[0_12px_40px_color-mix(in_srgb,var(--color-primary-container)_28.000000000000004%,transparent)] active:scale-[0.99] sm:w-auto"
              >
                {t(locale, "stack.ctaButton")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

