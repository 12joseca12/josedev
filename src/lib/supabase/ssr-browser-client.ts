import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para el flujo de staff (login/onboarding/MFA): guarda la sesión
 * en cookies (no localStorage) para que src/proxy.ts —que corre en el servidor y
 * solo puede leer cookies— vea la misma sesión que el browser. `/area-clientes`
 * también tiene guard de proxy (`resolveClientAccess` en `src/proxy.ts`), pero el
 * cliente público en client.ts usa localStorage porque su modelo de sesión es
 * cookies-vs-localStorage por diseño, no por falta de guard.
 */
export function getSupabaseSSRBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
