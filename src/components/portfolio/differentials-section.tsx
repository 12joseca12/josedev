"use client";

import { Eye, Gauge, Handshake, Layers3 } from "lucide-react";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

import { useScrollReveal } from "@/components/portfolio/use-scroll-reveal";

type Props = {
  locale: Locale;
};

const items = [
  { key: "transparency", Icon: Eye, span: "md:col-span-7" },
  { key: "customDev", Icon: Layers3, span: "md:col-span-5" },
  { key: "trifecta", Icon: Handshake, span: "md:col-span-5" },
  { key: "futureProof", Icon: Gauge, span: "md:col-span-7" },
] as const;

export function DifferentialsSection({ locale }: Props) {
  const revealRef = useScrollReveal<HTMLDivElement>();

  return (
    <section
      className="mx-auto max-w-content border-t border-dash-border px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
      aria-labelledby="differentials-heading"
    >
      <div ref={revealRef}>
        <div className="mb-10 sm:mb-12">
          <span className="mb-3 block font-dash-sans text-[10px] font-normal uppercase tracking-[0.3em] text-dash-accent-text">
            {t(locale, "differentials.eyebrow")}
          </span>
          <h2
            id="differentials-heading"
            className="font-headline text-3xl font-bold tracking-tight text-dash-text sm:text-4xl md:text-5xl"
          >
            {t(locale, "differentials.title")}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-dash-muted sm:text-base">
            {t(locale, "differentials.subtitle")}
          </p>
        </div>

        <ul className="grid list-none gap-4 p-0 md:grid-cols-12 md:gap-6 md:auto-rows-[280px]" aria-label={t(locale, "differentials.listAria")}>
          {items.map(({ key, Icon, span }) => (
            <li
              key={key}
              className={`${span} group rounded-md border border-dash-border bg-dash-surface p-6 transition-colors duration-200 hover:border-dash-accent sm:p-8`}
            >
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <span
                    className="flex size-11 items-center justify-center rounded-sm border border-dash-border text-dash-accent-text"
                    aria-hidden
                  >
                    <Icon className="size-5" strokeWidth={2.2} aria-hidden />
                  </span>
                  <span className="font-dash-mono text-[10px] text-dash-muted">
                    {t(locale, `differentials.items.${key}.tag`)}
                  </span>
                </div>

                <div>
                  <h3 className="mt-6 font-headline text-xl font-bold text-dash-text sm:text-2xl">
                    {t(locale, `differentials.items.${key}.title`)}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-dash-muted">
                    {t(locale, `differentials.items.${key}.description`)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

