import { ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AuthEntryLink } from "@/components/auth/auth-entry-link";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

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

  return (
    <section
      id="cta"
      aria-labelledby="final-cta-heading"
      className="relative mx-auto max-w-[90rem] scroll-mt-24 border-t border-outline-variant/10 px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-22"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-0 h-[26rem] w-[60rem] -translate-x-1/2 rounded-full bg-primary/[0.10] blur-[110px]" />
        <div className="absolute bottom-0 right-[-20%] h-[22rem] w-[44rem] rounded-full bg-tertiary/[0.08] blur-[110px]" />
      </div>

      <div className="glass-card relative overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-low/30 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10 lg:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-surface-container-low px-3 py-1.5 font-label text-[10px] uppercase tracking-widest text-primary">
              <span className="size-1.5 rounded-full bg-tertiary shadow-[0_0_10px_color-mix(in_srgb,var(--color-tertiary-fixed)_35%,transparent)]" aria-hidden />
              {t(locale, "finalCta.eyebrow")}
            </span>
            <h2
              id="final-cta-heading"
              className="font-headline text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl lg:text-4xl"
            >
              {t(locale, "finalCta.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
              {t(locale, "finalCta.subtitle")}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:col-span-5 lg:justify-end">
            <Suspense fallback={null}>
              <AuthEntryLink
                aria-label={t(locale, "finalCta.loginAria")}
                className="signature-glow group inline-flex w-full items-center justify-center gap-3 rounded-xl px-6 py-3.5 font-headline text-sm font-bold text-on-primary-fixed shadow-[0_10px_30px_color-mix(in_srgb,var(--color-primary-container)_18%,transparent)] transition-all duration-300 hover:scale-[1.01] hover:opacity-95 hover:shadow-[0_14px_44px_color-mix(in_srgb,var(--color-primary-container)_34%,transparent)] active:scale-[0.99] sm:w-auto"
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
              className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-outline-variant/25 bg-surface-variant/15 px-6 py-3.5 font-headline text-sm font-bold text-on-surface backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-tertiary/35 hover:bg-surface-variant/35 hover:shadow-[0_0_34px_color-mix(in_srgb,var(--color-tertiary-fixed)_10%,transparent)] active:translate-y-0 sm:w-auto"
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

