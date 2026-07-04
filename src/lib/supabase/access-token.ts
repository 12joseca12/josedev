import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Token JWT de sesión listo para `Authorization: Bearer` hacia josecoded-api. */
export async function getSupabaseAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data: initial } = await supabase.auth.getSession();
  let session = initial.session;

  const expiresAt = session?.expires_at;
  const expiresSoon =
    typeof expiresAt === "number" && expiresAt * 1000 < Date.now() + 60_000;

  if (!session?.access_token || expiresSoon) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error) return session?.access_token ?? null;
    session = refreshed.session ?? session;
  }

  return session?.access_token ?? null;
}
