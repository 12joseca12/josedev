import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para el flujo de staff (login/onboarding/MFA): guarda la sesión
 * en cookies (no localStorage) para que src/proxy.ts —que corre en el servidor y
 * solo puede leer cookies— vea la misma sesión que el browser. El cliente público
 * en client.ts usa localStorage porque /area-clientes todavía no tiene guard de
 * proxy; si eso cambia, migrar también ese cliente a este mismo patrón.
 */
export function getSupabaseSSRBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
