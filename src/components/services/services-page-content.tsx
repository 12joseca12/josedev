"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { useScrollReveal } from "@/components/portfolio/use-scroll-reveal";
import { getLiteralsRoot, localizedHref, t } from "@/services/literals";
import type { Locale } from "@/lib/types";

type Props = {
  locale: Locale;
};

const TIER_KEYS = ["landing", "custom", "maintenance"] as const;

function ServiceTierCard({ locale, tierKey }: { locale: Locale; tierKey: (typeof TIER_KEYS)[number] }) {
  const tier = getLiteralsRoot(locale).screens.services.tiers[tierKey];
  return (
    <div className="flex flex-col rounded-md border border-dash-border bg-dash-surface p-6 transition-colors duration-200 hover:border-dash-accent sm:p-8">
      <h2 className="font-headline text-xl font-bold text-dash-text sm:text-2xl">{tier.title}</h2>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-dash-muted sm:text-base">
        {tier.description}
      </p>
      <ul className="mt-6 space-y-2.5">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-dash-text">
            <Check className="mt-0.5 size-4 shrink-0 text-dash-accent-text" aria-hidden strokeWidth={2.5} />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ServicesPageContent({ locale }: Props) {
  const headerRef = useScrollReveal<HTMLDivElement>();
  const tiersRef = useScrollReveal<HTMLDivElement>();
  const ctaRef = useScrollReveal<HTMLDivElement>();

  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-content px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div ref={headerRef} className="mx-auto max-w-2xl text-center">
        <span className="font-dash-sans text-[10px] font-medium uppercase tracking-widest text-dash-accent-text sm:text-[11px]">
          {t(locale, "screens.services.eyebrow")}
        </span>
        <h1 className="mt-3 font-headline text-3xl font-bold tracking-tight text-dash-text sm:text-4xl">
          {t(locale, "screens.services.title")}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-dash-muted sm:text-base">
          {t(locale, "screens.services.intro")}
        </p>
      </div>

      <div ref={tiersRef} className="mx-auto mt-12 grid max-w-6xl gap-5 sm:mt-16 sm:gap-6 md:grid-cols-3">
        {TIER_KEYS.map((tierKey) => (
          <ServiceTierCard key={tierKey} locale={locale} tierKey={tierKey} />
        ))}
      </div>

      <div ref={ctaRef} className="mx-auto mt-12 flex max-w-2xl justify-center sm:mt-16">
        <Link
          href={`${localizedHref(locale, "/")}#contact`}
          aria-label={t(locale, "screens.services.ctaAria")}
          className="group inline-flex items-center justify-center gap-3 rounded-md border-2 border-dash-accent bg-dash-accent px-6 py-3.5 font-headline text-sm font-bold text-dash-bg transition-opacity duration-200 hover:opacity-90 sm:px-8 sm:py-4 sm:text-base"
        >
          {t(locale, "screens.services.cta")}
          <ArrowRight
            className="size-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1.5"
            aria-hidden
            strokeWidth={2.25}
          />
        </Link>
      </div>
    </main>
  );
}
