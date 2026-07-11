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
    <div className="flex min-h-dvh flex-col bg-dash-bg text-dash-text">
      <header className="sticky top-0 z-50 border-b border-dash-border bg-dash-bg/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-content items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href={localizedHref(locale, "/")}
            className="inline-flex items-center gap-2.5 font-headline text-sm font-bold text-dash-accent-text sm:text-base"
            aria-label={t(locale, "auth.backHomeAria")}
            data-hover-label={t(locale, "auth.backHomeAria")}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dash-border bg-dash-surface"
              aria-hidden
            >
              <Terminal className="size-5 text-dash-accent" strokeWidth={2.1} />
            </span>
            {t(locale, "nav.brand")}
          </Link>
          <Link
            href={localizedHref(locale, "/")}
            className="font-label text-[10px] font-semibold uppercase tracking-widest text-dash-muted transition-colors hover:text-dash-accent-text"
            data-hover-label={t(locale, "auth.backHome")}
          >
            {t(locale, "auth.backHome")}
          </Link>
        </div>
      </header>
      <AuthGatewayClient locale={locale} redirectAfterAuth={redirectAfterAuth} />
    </div>
  );
}
