import { createClient, type User } from '@supabase/supabase-js';
import type { Env } from '../types/env.types';

/** Cuenta admin del chat (debe existir en Supabase Auth). */
export const DEFAULT_ADMIN_SUPERUSER_EMAIL = 'sanchezgaricajosecarlos12@gmail.com';

/** Clave pública para cabecera `apikey` (anon JWT o `sb_publishable_...`). */
export function getSupabaseApiKey(env: Env): string {
  const publishable = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  const anon = env.SUPABASE_ANON_KEY?.trim();
  if (publishable) return publishable;
  if (anon) return anon;
  throw new Error('SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY is required');
}

export function createSupabaseClient(env: Env) {
  return createClient(env.SUPABASE_URL, getSupabaseApiKey(env), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (...args) => fetch(...args),
    },
  });
}

export function createSupabaseServiceClient(env: Env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin chat');
  }
  return createClient(env.SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (...args) => fetch(...args),
    },
  });
}

/**
 * Valida el JWT del navegador contra Supabase Auth.
 * Usa `fetch` directo (más fiable en Cloudflare Workers que supabase-js `getUser`).
 */
export async function verifySupabaseUser(env: Env, jwt: string): Promise<User> {
  const base = env.SUPABASE_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/auth/v1/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey: getSupabaseApiKey(env),
    },
  });

  if (!response.ok) {
    const hint = await response.text().catch(() => '');
    throw new Error(
      `Supabase auth rejected token (${response.status})${hint ? `: ${hint.slice(0, 160)}` : ''}`,
    );
  }

  const payload = (await response.json()) as User;
  if (!payload?.id) {
    throw new Error('Supabase auth returned empty user');
  }
  return payload;
}

