import type { Metadata } from "next";

import type { Locale } from "@/lib/types";
import { SUPPORTED_LOCALES, getDefaultLocale } from "@/services/literals";

/**
 * Builds a per-page `alternates` block (canonical + hreflang) for an indexable
 * public page. `path` is the locale-agnostic path (e.g. `"/sobre-mi"`,
 * `"/blog/my-post"`, or `""` for the home page) — it is prefixed with each
 * supported locale to produce `canonical` + `languages`.
 *
 * Relative URLs are intentional: Next resolves them against `metadataBase`
 * (set in `src/app/[locale]/layout.tsx`) into absolute canonical/hreflang URLs.
 *
 * P4 SEO fix (H3): the root layout used to set a single `alternates` block
 * that every page without its own `alternates` inherited wholesale — which
 * canonicalized `/foro`, blog articles, etc. to the homepage. Each indexable
 * page must now call this to set its own.
 */
export function buildAlternates(locale: Locale, path = ""): Metadata["alternates"] {
  const normalizedPath = path === "" ? "" : path.startsWith("/") ? path : `/${path}`;
  const defaultLocale = getDefaultLocale();

  const languages: Record<string, string> = {
    "x-default": `/${defaultLocale}${normalizedPath}`,
  };
  for (const supportedLocale of SUPPORTED_LOCALES) {
    languages[supportedLocale] = `/${supportedLocale}${normalizedPath}`;
  }

  return {
    canonical: `/${locale}${normalizedPath}`,
    languages,
  };
}
