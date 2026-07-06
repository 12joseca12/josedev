import { isSupportedLocale } from "@/services/literals";

export const STAFF_LOGIN_PATH = "/staff/login";
export const STAFF_ONBOARDING_PATH = "/staff/onboarding";

/** Quita el prefijo de locale para poder matchear rutas de staff sin importar /es o /en. */
export function stripLocale(pathname: string): string {
  const segments = pathname.split("/");
  if (isSupportedLocale(segments[1])) {
    return "/" + segments.slice(2).join("/");
  }
  return pathname;
}

export function isStaffLoginPath(path: string): boolean {
  return path === STAFF_LOGIN_PATH || path.startsWith(STAFF_LOGIN_PATH + "/");
}

export function isStaffOnboardingPath(path: string): boolean {
  return path === STAFF_ONBOARDING_PATH || path.startsWith(STAFF_ONBOARDING_PATH + "/");
}

export function isAdminPath(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/");
}

export function isCloserPath(path: string): boolean {
  return path === "/closer" || path.startsWith("/closer/");
}

export function isClientAreaPath(path: string): boolean {
  return path === "/area-clientes" || path.startsWith("/area-clientes/");
}
