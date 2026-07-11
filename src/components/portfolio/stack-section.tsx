"use client";

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

import { useScrollReveal } from "@/components/portfolio/use-scroll-reveal";

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
  const revealRef = useScrollReveal<HTMLDivElement>();

  return (
    <section
      id="stack"
      aria-labelledby="stack-heading"
      className="mx-auto max-w-content scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div ref={revealRef}>
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-dash-border bg-dash-surface px-3 py-1.5 font-dash-sans text-[10px] uppercase tracking-widest text-dash-accent-text">
            <span className="size-1.5 rounded-full bg-dash-accent" aria-hidden />
            {t(locale, "stack.eyebrow")}
          </span>
          <h2 id="stack-heading" className="font-headline text-3xl font-extrabold tracking-tight text-dash-text sm:text-4xl">
            {t(locale, "stack.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-dash-muted sm:text-base">
            {t(locale, "stack.subtitle")}
          </p>
        </div>

        <div className="mt-10 rounded-lg border border-dash-border bg-dash-surface p-4 sm:mt-12 sm:p-8">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="grid gap-4 sm:grid-cols-2">
                {stackCards.map(({ key, Icon }) => (
                  <div
                    key={key}
                    className="rounded-md border border-dash-border p-5 transition-colors duration-200 hover:border-dash-accent"
                  >
                    <div className="mb-4 inline-flex size-10 items-center justify-center rounded-sm border border-dash-border text-dash-accent-text">
                      <Icon className="size-5" aria-hidden strokeWidth={2} />
                    </div>
                    <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-dash-text">
                      {t(locale, `stack.cards.${key}.title`)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-dash-muted">
                      {t(locale, `stack.cards.${key}.description`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-md border border-dash-border p-5 sm:p-6">
                <p className="font-dash-sans text-[10px] uppercase tracking-widest text-dash-muted">
                  {t(locale, "stack.chipsLabel")}
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {stackChips.map(({ key, Icon }) => (
                    <li key={key} className="list-none">
                      <Link
                        href={localizedHref(locale, "/sobre-mi")}
                        aria-label={t(locale, `stack.chips.${key}`)}
                        className="inline-flex items-center gap-2 rounded-full border border-dash-border px-3 py-2 text-xs font-semibold text-dash-text transition-colors hover:border-dash-accent hover:text-dash-accent-text"
                      >
                        <Icon className="size-4 opacity-80" aria-hidden strokeWidth={2} />
                        {t(locale, `stack.chips.${key}`)}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 rounded-md border border-dash-border p-4">
                  <p className="text-sm leading-relaxed text-dash-muted">
                    <span className="font-semibold text-dash-text">{t(locale, "stack.noteStrong")} </span>
                    {t(locale, "stack.note")}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-md border border-dash-border p-5 sm:mt-6 sm:p-6">
                <h3 className="font-headline text-lg font-extrabold tracking-tight text-dash-text">
                  {t(locale, "stack.ctaTitle")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-dash-muted">
                  {t(locale, "stack.ctaDescription")}
                </p>
                <Link
                  href={localizedHref(locale, "/sobre-mi")}
                  aria-label={t(locale, "stack.ctaButtonAria")}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-md border-2 border-dash-accent bg-dash-accent px-6 py-3 font-headline text-xs font-bold uppercase tracking-tight text-dash-bg transition-opacity duration-200 hover:opacity-90 sm:w-auto"
                >
                  {t(locale, "stack.ctaButton")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

