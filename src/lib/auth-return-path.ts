import type { Locale } from "./types";
import { sanitizeInternalNextPath } from "./safe-next-path";

const STORAGE_KEY = "auth:returnTo";

function isAuthPath(path: string): boolean {
  return /^\/(es|en)\/auth(\?|$)/.test(path);
}

/** Guarda la ruta a la que volver tras iniciar sesión. */
export function rememberAuthReturnPath(path: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const safe = sanitizeInternalNextPath(path ?? undefined);
  if (!safe || isAuthPath(safe)) return;
  sessionStorage.setItem(STORAGE_KEY, safe);
}

/** Lee y elimina la ruta guardada. */
export function consumeAuthReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  const safe = sanitizeInternalNextPath(raw ?? undefined);
  if (!safe || isAuthPath(safe)) return null;
  return safe;
}

/** Ruta final tras login: `?next=` → sessionStorage → inicio. */
export function resolvePostAuthPath(locale: Locale, explicitNext: string | null | undefined): string {
  const fromQuery = sanitizeInternalNextPath(explicitNext ?? undefined);
  if (fromQuery && !isAuthPath(fromQuery)) return fromQuery;

  const fromStore = consumeAuthReturnPath();
  if (fromStore) return fromStore;

  return `/${locale}`;
}

/** Enlace a `/auth` conservando la página actual en `?next=`. */
export function buildAuthHref(locale: Locale, returnPath?: string | null): string {
  const safe = returnPath ? sanitizeInternalNextPath(returnPath) : null;
  if (!safe || isAuthPath(safe)) return `/${locale}/auth`;
  return `/${locale}/auth?next=${encodeURIComponent(safe)}`;
}

/** Recarga completa en la ruta de destino (sesión ya persistida). */
export function navigateAfterAuth(target: string): void {
  if (typeof window === "undefined") return;
  const safe = sanitizeInternalNextPath(target) ?? "/";
  window.location.assign(safe);
}

/** Intenta inferir la página de origen desde el referrer interno. */
export function rememberAuthReturnFromReferrer(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const ref = document.referrer;
  if (!ref) return;
  try {
    const refUrl = new URL(ref);
    if (refUrl.origin !== window.location.origin) return;
    rememberAuthReturnPath(`${refUrl.pathname}${refUrl.search}`);
  } catch {
    /* ignore malformed referrer */
  }
}
