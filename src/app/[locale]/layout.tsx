import type { Metadata } from "next";
import "@/app/globals.css";
import { EmulatorWarmupClient } from "@/components/layout/emulator-warmup-client";
import { ScrollProgressBar } from "@/components/layout/scroll-progress-bar";
import { dashFontVariables } from "@/components/staff-dash/dash-fonts";
import { getRootStyleBlockCss } from "@/lib/stylesVariables";
import type { Locale } from "@/lib/types";
import { SUPPORTED_LOCALES, resolveLocaleParam, t } from "@/services/literals";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams(): { locale: Locale }[] {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

// P4 SEO fix (M3): unknown locales (e.g. /fr) 404 instead of soft-rendering as
// Spanish. `src/proxy.ts` already redirects any first path segment that isn't
// a supported locale, so in practice `[locale]` should only ever be "es"/"en" —
// this is defense-in-depth for direct/edge-cache hits that bypass that redirect.
export const dynamicParams = false;

export async function generateMetadata({ params }: Pick<LayoutProps, "params">): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://josecoded.com"),
    title: {
      default: t(locale, "app.metadata.title"),
      template: "%s · Jose Dev",
    },
    description: t(locale, "app.metadata.description"),
    // No blanket `alternates` here on purpose (P4 SEO fix, H3): a layout-level
    // `alternates` gets inherited wholesale by every page that doesn't define
    // its own, which canonicalized /foro, blog articles, etc. to the homepage.
    // Each indexable page sets its own via `buildAlternates` (src/lib/seo/alternates.ts).
    // `robots` is intentionally omitted too — indexable is next/metadata's
    // default, and declaring `index: true` here is what let admin/foro-new
    // silently inherit "indexable" instead of the noindex their layouts set.
    openGraph: {
      title: t(locale, "app.metadata.title"),
      description: t(locale, "app.metadata.description"),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t(locale, "app.metadata.title"),
      description: t(locale, "app.metadata.description"),
    },
  };
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const locale = resolveLocaleParam((await params).locale);

  return (
    <html
      lang={locale}
      className={`${dashFontVariables} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':matchMedia('(prefers-color-scheme:dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();",
          }}
        />
        <style
          dangerouslySetInnerHTML={{ __html: getRootStyleBlockCss() }}
          suppressHydrationWarning
        />
      </head>
      <body className="flex min-h-full flex-col">
        <ScrollProgressBar />
        <EmulatorWarmupClient />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-skip-link focus:rounded-md focus:border focus:border-dash-accent/40 focus:bg-dash-surface focus:px-4 focus:py-2 focus:font-headline focus:text-sm focus:font-semibold focus:text-dash-text focus:shadow-[0_0_24px_color-mix(in_srgb,var(--color-dash-accent)_18%,transparent)]"
        >
          {t(locale, "nav.skipToContent")}
        </a>
        {children}
      </body>
    </html>
  );
}
