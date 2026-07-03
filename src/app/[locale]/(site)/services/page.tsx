import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { getLiteralsRoot, localizedHref, resolveLocaleParam, t } from "@/services/literals";
import type { Locale } from "@/lib/types";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "screens.services.metadataTitle"),
    description: t(locale, "screens.services.metadataDescription"),
    alternates: {
      canonical: `/${locale}/services`,
      languages: { es: "/es/services", en: "/en/services" },
    },
    openGraph: {
      title: t(locale, "screens.services.metadataTitle"),
      description: t(locale, "screens.services.metadataDescription"),
      type: "website",
    },
  };
}

const TIER_KEYS = ["landing", "custom", "maintenance"] as const;

function ServiceTierCard({ locale, tierKey }: { locale: Locale; tierKey: (typeof TIER_KEYS)[number] }) {
  const tier = getLiteralsRoot(locale).screens.services.tiers[tierKey];
  return (
    <div className="flex flex-col rounded-2xl border border-outline-variant/20 bg-surface-container-low/60 p-6 transition-colors hover:border-primary/30 sm:p-8">
      <h2 className="font-headline text-xl font-bold text-on-surface sm:text-2xl">{tier.title}</h2>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-on-surface-variant sm:text-base">
        {tier.description}
      </p>
      <ul className="mt-6 space-y-2.5">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-on-surface">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden strokeWidth={2.5} />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ServicesPage({ params }: PageProps) {
  const locale = resolveLocaleParam((await params).locale);

  return (
    <main id="main" className="mx-auto w-full max-w-content px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <header className="mx-auto max-w-2xl text-center">
        <span className="font-label text-[10px] font-medium uppercase tracking-widest text-tertiary sm:text-[11px]">
          {t(locale, "screens.services.eyebrow")}
        </span>
        <h1 className="mt-3 font-headline text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
          {t(locale, "screens.services.title")}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-on-surface-variant sm:text-base">
          {t(locale, "screens.services.intro")}
        </p>
      </header>

      <div className="mx-auto mt-12 grid max-w-6xl gap-5 sm:mt-16 sm:gap-6 md:grid-cols-3">
        {TIER_KEYS.map((tierKey) => (
          <ServiceTierCard key={tierKey} locale={locale} tierKey={tierKey} />
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-2xl justify-center sm:mt-16">
        <Link
          href={`${localizedHref(locale, "/")}#contact`}
          aria-label={t(locale, "screens.services.ctaAria")}
          className="signature-glow group inline-flex items-center justify-center gap-3 rounded-xl px-6 py-3.5 font-headline text-sm font-bold text-on-primary-fixed shadow-[0_8px_32px_color-mix(in_srgb,var(--color-primary-container)_15%,transparent)] transition-all duration-300 hover:scale-[1.02] hover:opacity-95 hover:shadow-[0_12px_40px_color-mix(in_srgb,var(--color-primary-container)_35%,transparent)] active:scale-[0.98] sm:px-8 sm:py-4 sm:text-base"
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
