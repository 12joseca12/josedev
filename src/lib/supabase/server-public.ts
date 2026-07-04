import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase solo con clave publicable (RLS). Para lecturas en servidor
 * (p. ej. blog publicado). Sin cookies de sesión.
 */
export function getSupabasePublicServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url?.trim() || !key?.trim()) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
