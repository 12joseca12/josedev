import type { AuthErrorUiAction } from "@/lib/auth-error-codes";
import { resolveAuthErrorLiteralKey, resolveAuthErrorUiAction } from "@/lib/auth-error-codes";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

export type { AuthErrorUiAction };
export { resolveAuthErrorLiteralKey, resolveAuthErrorUiAction };

/** Mensaje legible para el usuario (nunca devuelve claves tipo `auth.x.y`). */
export function resolveAuthErrorMessage(locale: Locale, error: unknown): string {
  const key = resolveAuthErrorLiteralKey(error);
  const text = t(locale, key);
  if (text !== key) return text;

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === "string" && message && !message.includes(".") && message.length < 120) {
      return message;
    }
  }

  return t(locale, "auth.errorGeneric");
}
