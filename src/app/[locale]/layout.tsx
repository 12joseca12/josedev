import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "@/app/globals.css";
import { EmulatorWarmupClient } from "@/components/layout/emulator-warmup-client";
import { ScrollProgressBar } from "@/components/layout/scroll-progress-bar";
import { getRootStyleBlockCss } from "@/lib/stylesVariables";
import type { Locale } from "@/lib/types";
import { SUPPORTED_LOCALES, resolveLocaleParam, t } from "@/services/literals";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams(): { locale: Locale }[] {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<LayoutProps, "params">): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "app.metadata.title"),
    description: t(locale, "app.metadata.description"),
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/${locale}`,
      languages: { es: "/es", en: "/en" },
    },
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
      className={`${spaceGrotesk.variable} ${inter.variable} h-full`}
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
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-skip-link focus:rounded-xl focus:border focus:border-primary/40 focus:bg-surface-container-low focus:px-4 focus:py-2 focus:font-headline focus:text-sm focus:font-semibold focus:text-on-surface focus:shadow-[0_0_32px_color-mix(in_srgb,var(--color-primary-container)_18%,transparent)]"
        >
          {t(locale, "nav.skipToContent")}
        </a>
        {children}
      </body>
    </html>
  );
}
