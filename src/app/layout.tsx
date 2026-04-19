import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getRootStyleBlockCss } from "@/lib/stylesVariables";
import { getDefaultLocale, t } from "@/services/literals";

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

const locale = getDefaultLocale();

export const metadata: Metadata = {
  title: t(locale, "app.metadata.title"),
  description: t(locale, "app.metadata.description"),
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={locale}
      className={`dark ${spaceGrotesk.variable} ${inter.variable} h-full`}
    >
      <head>
        <style
          dangerouslySetInnerHTML={{ __html: getRootStyleBlockCss() }}
          suppressHydrationWarning
        />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:border focus:border-primary/40 focus:bg-surface-container-low focus:px-4 focus:py-2 focus:font-headline focus:text-sm focus:font-semibold focus:text-on-surface focus:shadow-[0_0_32px_rgba(0,229,255,0.18)]"
        >
          {t(locale, "nav.skipToContent")}
        </a>
        {children}
      </body>
    </html>
  );
}
