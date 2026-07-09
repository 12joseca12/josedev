import { SOBRE_MI_CATEGORY_CONFIG } from "@/lib/sobre-mi-stack-config";
import type { Locale, SobreMiCategoryKey } from "@/lib/types";
import { t } from "@/services/literals";

import { useScrollReveal } from "@/components/portfolio/use-scroll-reveal";

import { SobreMiTechCard } from "./sobre-mi-tech-card";

type Props = {
  locale: Locale;
  category: SobreMiCategoryKey;
};

export function SobreMiCategoryBlock({ locale, category }: Props) {
  const config = SOBRE_MI_CATEGORY_CONFIG[category];
  const headingId = `sobre-mi-category-${category}`;
  const revealRef = useScrollReveal<HTMLElement>();

  return (
    <section ref={revealRef} className="min-w-0" aria-labelledby={headingId}>
      <header className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mb-5">
        <span className="font-dash-mono text-sm font-bold tabular-nums text-dash-accent-text sm:text-base">
          {t(locale, `sobreMiStack.categories.${category}.index`)}
        </span>
        <span className="font-dash-mono text-sm text-dash-muted sm:text-base" aria-hidden>
          //
        </span>
        <h2 id={headingId} className="font-headline text-sm font-extrabold uppercase tracking-wide text-dash-text sm:text-base">
          {t(locale, `sobreMiStack.categories.${category}.title`)}
        </h2>
      </header>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="lg:col-span-5">
          <SobreMiTechCard
            locale={locale}
            variant="primary"
            tech={config.primary}
            badgeTechs={config.primaryBadges}
          />
        </div>
        <ul className="grid list-none grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-7 lg:gap-4">
          {config.items.map((tech) => (
            <li key={tech} className="min-w-0">
              <SobreMiTechCard locale={locale} variant="detail" tech={tech} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
