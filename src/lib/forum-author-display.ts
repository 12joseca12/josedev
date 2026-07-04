import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

/** Etiqueta de autor: texto libre del API o clave i18n de semillas. */
export function forumAuthorLine(
  locale: Locale,
  o: { authorDisplay?: string; authorDisplayKey?: string },
): string {
  const d = o.authorDisplay?.trim();
  if (d) return d;
  if (o.authorDisplayKey) return t(locale, o.authorDisplayKey);
  return t(locale, "forum.ui.authorUnknown");
}

export function forumParticipantLabel(locale: Locale, p: { displayName?: string; displayKey?: string }): string {
  const n = p.displayName?.trim();
  if (n) return n;
  if (p.displayKey) return t(locale, p.displayKey);
  return t(locale, "forum.ui.authorUnknown");
}
