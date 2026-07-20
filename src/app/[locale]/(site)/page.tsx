import type { Metadata } from "next";

import { BentoSection } from "@/components/portfolio/bento-section";
import { ContactSection } from "@/components/portfolio/contact-section";
import { FaqSection } from "@/components/portfolio/faq-section";
import { FinalCtaSection } from "@/components/portfolio/final-cta-section";
import { HeroSection } from "@/components/portfolio/hero-section";
import { DifferentialsSection } from "@/components/portfolio/differentials-section";
import { StackSection } from "@/components/portfolio/stack-section";
import { buildAlternates } from "@/lib/seo/alternates";
import { resolveLocaleParam, t } from "@/services/literals";

type PageProps = { params: Promise<{ locale: string }> };

// P4 SEO fix (H3): the home page's canonical/hreflang used to come from the
// root layout's blanket `alternates` (now removed) — set it explicitly here
// instead, since this is the one page that block was really meant for.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    alternates: buildAlternates(locale, ""),
  };
}

export default async function Home({ params }: PageProps) {
  const locale = resolveLocaleParam((await params).locale);
  const faqKeys = ["projectTypes", "cost", "timeline", "maintenance", "remote"] as const;
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqKeys.map((key) => ({
      "@type": "Question",
      name: t(locale, `faq.q.${key}`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(locale, `faq.a.${key}`),
      },
    })),
  };

  return (
    <main className="relative overflow-x-clip" id="main" tabIndex={-1}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HeroSection locale={locale} />
      <DifferentialsSection locale={locale} />
      <StackSection locale={locale} />
      <BentoSection locale={locale} />
      <FaqSection locale={locale} />
      <ContactSection locale={locale} />
      <FinalCtaSection locale={locale} />
    </main>
  );
}
