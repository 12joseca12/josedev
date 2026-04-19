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
  return (
    <section
      id="plans"
      className="mx-auto max-w-[90rem] scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
      aria-labelledby="services-summary-heading"
    >
      <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
        <span className="mb-3 block font-label text-[10px] font-normal uppercase tracking-widest text-primary">
          {t(locale, "servicesSummary.eyebrow")}
        </span>
        <h2
          id="services-summary-heading"
          className="font-headline text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
        >
          {t(locale, "servicesSummary.title")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
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
            className="group rounded-2xl border border-outline-variant/20 bg-surface-container-low/30 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-surface-container-low/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.22)] sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-outline-variant/25 bg-surface-container-high/50 text-on-surface-variant transition-all duration-300 group-hover:border-primary/35 group-hover:text-primary">
                <Icon className="size-5" aria-hidden strokeWidth={2.1} />
              </span>
              <span
                className="h-10 w-10 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                aria-hidden
              />
            </div>

            <h3 className="font-headline text-base font-bold leading-snug text-on-surface">
              {t(locale, `servicesSummary.items.${key}.title`)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              {t(locale, `servicesSummary.items.${key}.description`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

