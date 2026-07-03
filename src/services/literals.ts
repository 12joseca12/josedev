import type { Locale } from "@/lib/types";

import literalsEs from "@/lib/literals.json";
import literalsEn from "@/lib/literalsEn.json";

const LITERALS_BY_LOCALE = {
  es: literalsEs,
  en: literalsEn,
} as const;

type LiteralsTree = (typeof LITERALS_BY_LOCALE)[Locale];

function getPathValue(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function t(locale: Locale, key: string): string {
  const fromLocale = getPathValue(LITERALS_BY_LOCALE[locale], key);
  if (typeof fromLocale === "string") return fromLocale;

  const fallback = getPathValue(LITERALS_BY_LOCALE.es, key);
  if (typeof fallback === "string") return fallback;

  return key;
}

export function getDefaultLocale(): Locale {
  return "es";
}

export function getLiteralsRoot(locale: Locale): LiteralsTree {
  return LITERALS_BY_LOCALE[locale];
}

export const SUPPORTED_LOCALES: readonly Locale[] = ["es", "en"];

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Narrows a raw `[locale]` route param (typed `string` by Next.js) to a supported `Locale`, falling back to the default. */
export function resolveLocaleParam(value: string): Locale {
  return isSupportedLocale(value) ? value : getDefaultLocale();
}

/** Prefixes an internal absolute path with the current locale, e.g. `localizedHref("en", "/blog")` -> `/en/blog`. */
export function localizedHref(locale: Locale, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized === "/" ? "" : normalized}`;
}
