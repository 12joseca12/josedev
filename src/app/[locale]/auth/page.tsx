import type { Metadata } from "next";
import Link from "next/link";
import { Terminal } from "lucide-react";

import { AuthGatewayClient } from "@/components/auth/auth-gateway-client";
import { sanitizeInternalNextPath } from "@/lib/safe-next-path";
import { localizedHref, resolveLocaleParam, t } from "@/services/literals";

type AuthPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export async function generateMetadata({ params }: Pick<AuthPageProps, "params">): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "auth.metadataTitle"),
    description: t(locale, "auth.metadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function AuthPage({ params, searchParams }: AuthPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  const sp = await searchParams;
  const redirectAfterAuth = sanitizeInternalNextPath(sp.next);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-outline-variant/15 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-content items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href={localizedHref(locale, "/")}
            className="inline-flex items-center gap-2.5 font-headline text-sm font-bold text-primary sm:text-base"
            aria-label={t(locale, "auth.backHomeAria")}
            data-hover-label={t(locale, "auth.backHomeAria")}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant/35 bg-surface-container-low shadow-[0_0_18px_color-mix(in_srgb,var(--color-primary-container)_18%,transparent)]"
              aria-hidden
            >
              <Terminal className="size-5 text-primary-container" strokeWidth={2.1} />
            </span>
            {t(locale, "nav.brand")}
          </Link>
          <Link
            href={localizedHref(locale, "/")}
            className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
            data-hover-label={t(locale, "auth.backHome")}
          >
            {t(locale, "auth.backHome")}
          </Link>
        </div>
      </header>
      <AuthGatewayClient locale={locale} redirectAfterAuth={redirectAfterAuth} />
    </>
  );
}
