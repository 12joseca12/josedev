import type { Metadata } from "next";
import Link from "next/link";
import { Terminal } from "lucide-react";

import { AuthGatewayClient } from "@/components/auth/auth-gateway-client";
import { getDefaultLocale, t } from "@/services/literals";

const locale = getDefaultLocale();

export const metadata: Metadata = {
  title: t(locale, "auth.metadataTitle"),
  description: t(locale, "auth.metadataDescription"),
  robots: { index: false, follow: false },
};

export default function AuthPage() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-outline-variant/15 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-headline text-sm font-bold text-primary sm:text-base"
            aria-label={t(locale, "auth.backHomeAria")}
            data-hover-label={t(locale, "auth.backHomeAria")}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant/35 bg-surface-container-low shadow-[0_0_18px_rgba(0,229,255,0.18)]"
              aria-hidden
            >
              <Terminal className="size-5 text-primary-container" strokeWidth={2.1} />
            </span>
            {t(locale, "nav.brand")}
          </Link>
          <Link
            href="/"
            className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
            data-hover-label={t(locale, "auth.backHome")}
          >
            {t(locale, "auth.backHome")}
          </Link>
        </div>
      </header>
      <AuthGatewayClient locale={locale} />
    </>
  );
}
