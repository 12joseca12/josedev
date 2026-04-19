import { BentoSection } from "@/components/portfolio/bento-section";
import { ContactSection } from "@/components/portfolio/contact-section";
import { FaqSection } from "@/components/portfolio/faq-section";
import { HeroSection } from "@/components/portfolio/hero-section";
import { DifferentialsSection } from "@/components/portfolio/differentials-section";
import { ServicesSummarySection } from "@/components/portfolio/services-summary-section";
import { SiteFooter } from "@/components/portfolio/site-footer";
import { SiteHeader } from "@/components/portfolio/site-header";
import { getDefaultLocale, t } from "@/services/literals";

export default function Home() {
  const locale = getDefaultLocale();
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
    <>
      <SiteHeader locale={locale} />
      <main className="relative overflow-x-clip" id="main" tabIndex={-1}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <HeroSection locale={locale} />
        <BentoSection locale={locale} />
        <ServicesSummarySection locale={locale} />
        <DifferentialsSection locale={locale} />
        <FaqSection locale={locale} />
        <ContactSection locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
