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
