"use client";

import {
  Cpu,
  Database,
  Gauge,
  Layers3,
  Search,
  Server,
  Settings2,
  Wrench,
} from "lucide-react";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

import { useScrollReveal } from "@/components/portfolio/use-scroll-reveal";

type Props = {
  locale: Locale;
};

const items = [
  { key: "ui", Icon: Layers3 },
  { key: "frontend", Icon: Cpu },
  { key: "backend", Icon: Server },
  { key: "supabase", Icon: Database },
  { key: "seo", Icon: Search },
  { key: "performance", Icon: Gauge },
  { key: "automations", Icon: Settings2 },
  { key: "maintenance", Icon: Wrench },
] as const;

export function ServicesSummarySection({ locale }: Props) {
  const revealRef = useScrollReveal<HTMLDivElement>();

  return (
    <section
      id="plans"
      className="mx-auto max-w-content scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
      aria-labelledby="services-summary-heading"
    >
      <div ref={revealRef}>
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
          <span className="mb-3 block font-dash-sans text-[10px] font-normal uppercase tracking-widest text-dash-accent-text">
            {t(locale, "servicesSummary.eyebrow")}
          </span>
          <h2
            id="services-summary-heading"
            className="font-headline text-2xl font-bold tracking-tight text-dash-text sm:text-3xl lg:text-4xl"
          >
            {t(locale, "servicesSummary.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-dash-muted sm:text-base">
            {t(locale, "servicesSummary.subtitle")}
          </p>
        </div>

        <ul
          className="mx-auto grid max-w-5xl list-none gap-3 p-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
          aria-label={t(locale, "servicesSummary.listAria")}
        >
          {items.map(({ key, Icon }) => (
            <li
              key={key}
              className="group rounded-md border border-dash-border bg-dash-surface p-5 transition-colors duration-200 hover:border-dash-accent sm:p-6"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-sm border border-dash-border text-dash-muted transition-colors duration-200 group-hover:border-dash-accent group-hover:text-dash-accent-text">
                  <Icon className="size-5" aria-hidden strokeWidth={2.1} />
                </span>
              </div>

              <h3 className="font-headline text-base font-bold leading-snug text-dash-text">
                {t(locale, `servicesSummary.items.${key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-dash-muted">
                {t(locale, `servicesSummary.items.${key}.description`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

