import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con **service role** — bypassa RLS y habilita el Admin API
 * (`auth.admin.*`). Server-only: NUNCA importar desde un componente/módulo de
 * cliente (`SUPABASE_SERVICE_ROLE_KEY` no tiene prefijo `NEXT_PUBLIC_`, así
 * que Next ya no lo expondría al bundle del browser, pero el helper en sí no
 * es sensible al contexto — la disciplina de "solo desde server actions" la
 * pone el caller). Usar SOLO dentro de server actions que ya re-verificaron
 * admin server-side (ver `src/app/[locale]/admin/clientes/[id]/actions.ts`)
 * — este cliente en sí no chequea nada, confía en que el caller ya lo hizo.
 *
 * No existía un cliente service-role en `src/` (josedev, Next.js) antes de
 * esto — el service-role existente en el repo vive en `josecoded-api/`
 * (Cloudflare Worker, proyecto Node separado) y no es reusable acá.
 */
export function getSupabaseServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim()) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required for the service-role client");
  if (!key?.trim()) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for the service-role client");

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
