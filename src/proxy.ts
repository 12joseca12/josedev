import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupportedLocale } from "@/services/literals";
import {
  isAdminPath,
  isClientAreaPath,
  isCloserPath,
  isStaffLoginPath,
  isStaffOnboardingPath,
  stripLocale,
} from "@/lib/staff-routes";

const DEFAULT_LOCALE = "es";

function resolveLocaleFromHeader(acceptLanguage: string | null): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const preferred = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0]?.trim().slice(0, 2).toLowerCase())
    .find((lang) => lang && isSupportedLocale(lang));
  return preferred ?? DEFAULT_LOCALE;
}

/**
 * Resuelve el rol de staff (admin|closer) para el usuario autenticado, con lookup
 * fresco en cada request (sin cache) — revocación instantánea es una decisión de
 * arquitectura explícita, ver DESIGN.md / ADR Capa 1 (Auth/Roles/MFA).
 */
export async function resolveStaffRole(
  supabase: ReturnType<typeof createServerClient>,
): Promise<"admin" | "closer" | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("staff_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  // Fail-closed: cualquier error de lookup se trata como "sin rol", nunca se asume acceso.
  if (error || !data) return null;
  return data.role as "admin" | "closer";
}

/**
 * Resuelve si el usuario autenticado tiene una fila en `clients` (acceso al área de
 * clientes), con lookup fresco en cada request — mismo criterio fail-closed que
 * resolveStaffRole.
 */
export async function resolveClientAccess(
  supabase: ReturnType<typeof createServerClient>,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Fail-closed: cualquier error de lookup se trata como "sin acceso".
  if (error || !data) return false;
  return true;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const firstSegment = pathname.split("/")[1];
  if (!isSupportedLocale(firstSegment)) {
    const locale = resolveLocaleFromHeader(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = firstSegment;
  const bareStaffPath = stripLocale(pathname);
  const touchesStaffSurface =
    isStaffLoginPath(bareStaffPath) ||
    isStaffOnboardingPath(bareStaffPath) ||
    isAdminPath(bareStaffPath) ||
    isCloserPath(bareStaffPath);
  const touchesClientArea = isClientAreaPath(bareStaffPath);

  if (!touchesStaffSurface && !touchesClientArea) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (touchesClientArea) {
    const isClient = await resolveClientAccess(supabase);
    if (isClient) {
      return response;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL(`/${locale}/auth`, request.url));
    }
    return NextResponse.redirect(new URL(`/${locale}/perfil`, request.url));
  }

  const role = await resolveStaffRole(supabase);

  if (isStaffLoginPath(bareStaffPath)) {
    // Ya logueado con rol de staff: no tiene sentido ver el login de nuevo.
    if (role === "admin") {
      return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
    }
    if (role === "closer") {
      return NextResponse.redirect(new URL(`/${locale}/closer`, request.url));
    }
    return response;
  }

  if (isStaffOnboardingPath(bareStaffPath)) {
    // Onboarding es para cualquier rol de staff (admin o closer) — el propio
    // componente decide si falta cambiar password y/o enrolar MFA.
    if (!role) {
      return NextResponse.rewrite(new URL(`/${locale}/not-found`, request.url), { status: 404 });
    }
    return response;
  }

  const needsAdmin = isAdminPath(bareStaffPath);
  const needsCloser = isCloserPath(bareStaffPath);
  const hasAccess = (needsAdmin && role === "admin") || (needsCloser && role === "closer");

  if (!hasAccess) {
    // 404, no 403 — ruta no listada, no confirmamos su existencia a quien no tiene rol.
    return NextResponse.rewrite(new URL(`/${locale}/not-found`, request.url), { status: 404 });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
