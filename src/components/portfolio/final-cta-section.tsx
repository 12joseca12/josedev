"use client";

import { ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AuthEntryLink } from "@/components/auth/auth-entry-link";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

import { useScrollReveal } from "@/components/portfolio/use-scroll-reveal";

type Props = {
  locale: Locale;
};

function buildWhatsAppHref(locale: Locale): string {
  const phone = t(locale, "finalCta.whatsappNumberE164").replace(/[^\d]/g, "");
  const text = t(locale, "finalCta.whatsappPrefill");
  const qs = new URLSearchParams({ text }).toString();
  return `https://wa.me/${phone}?${qs}`;
}

export function FinalCtaSection({ locale }: Props) {
  const whatsAppHref = buildWhatsAppHref(locale);
  const revealRef = useScrollReveal<HTMLDivElement>();

  return (
    <section
      id="cta"
      aria-labelledby="final-cta-heading"
      className="mx-auto max-w-content scroll-mt-24 border-t border-dash-border px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-22"
    >
      <div ref={revealRef} className="rounded-md border border-dash-border bg-dash-surface p-6 sm:p-10 lg:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-dash-border bg-dash-bg px-3 py-1.5 font-dash-sans text-[10px] uppercase tracking-widest text-dash-accent-text">
              <span className="size-1.5 rounded-full bg-dash-accent" aria-hidden />
              {t(locale, "finalCta.eyebrow")}
            </span>
            <h2
              id="final-cta-heading"
              className="font-headline text-2xl font-extrabold tracking-tight text-dash-text sm:text-3xl lg:text-4xl"
            >
              {t(locale, "finalCta.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-dash-muted sm:text-base">
              {t(locale, "finalCta.subtitle")}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:col-span-5 lg:justify-end">
            <Suspense fallback={null}>
              <AuthEntryLink
                aria-label={t(locale, "finalCta.loginAria")}
                className="group inline-flex w-full items-center justify-center gap-3 rounded-md border-2 border-dash-accent bg-dash-accent px-6 py-3.5 font-headline text-sm font-bold text-dash-bg transition-opacity duration-200 hover:opacity-90 sm:w-auto"
              >
                {t(locale, "finalCta.login")}
                <ArrowRight className="size-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </AuthEntryLink>
            </Suspense>

            <a
              href={whatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t(locale, "finalCta.whatsappAria")}
              className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-dash-border px-6 py-3.5 font-headline text-sm font-bold text-dash-text transition-colors duration-200 hover:border-dash-accent hover:text-dash-accent-text sm:w-auto"
            >
              <MessageCircle className="size-5 shrink-0" aria-hidden />
              {t(locale, "finalCta.whatsapp")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

