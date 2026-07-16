import { z } from 'zod';
import type { ApiMode, Env } from '../types/env.types';

const apiModeSchema = z.enum(['development', 'production'] satisfies ApiMode[]);

const envSchema = z.object({
  API_MODE: apiModeSchema.default('development'),
  WORKER_URL: z.string().url(),
  WORKER_INTERNAL_TOKEN: z.string().min(10),
  CORS_ORIGINS: z.string().default(''),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10).optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(10).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  FORUM_USE_MOCK: z.enum(['true', 'false']).optional(),
  FORUM_USE_DATABASE: z.enum(['true', 'false']).optional(),
  FORUM_MODERATION_DISABLED: z.enum(['true', 'false']).optional(),
  DEV_API_KEY: z.string().min(10).optional(),
  WORKER_TIMEOUT_MS: z.string().regex(/^\d+$/).optional(),
  AI_CHAT_TIMEOUT_MS: z.string().regex(/^\d+$/).optional(),
  FORUM_ADMIN_USER_IDS: z.string().optional(),
  ADMIN_SUPERUSER_EMAIL: z.string().email().optional(),
  ADMIN_SUPERUSER_ID: z.string().uuid().optional(),
  ADMIN_CHAT_WORKER_PATH: z.string().min(2).optional(),
  ADMIN_CHAT_WORKER_TIMEOUT_MS: z.string().regex(/^\d+$/).optional(),
  EMULATOR_SESSION_TIMEOUT_MS: z.string().regex(/^\d+$/).optional(),
  N8N_CHAT_WEBHOOK_URL: z.string().url().optional(),
  N8N_CHAT_WEBHOOK_SECRET: z.string().min(8).optional(),
  PUBLIC_API_BASE_URL: z.string().url().optional(),
}).refine(
  (data) => Boolean(data.SUPABASE_ANON_KEY?.trim() || data.SUPABASE_PUBLISHABLE_KEY?.trim()),
  {
    message: 'Set SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY',
    path: ['SUPABASE_ANON_KEY'],
  },
);

const REQUIRED_BINDING_KEYS = [
  'WORKER_URL',
  'WORKER_INTERNAL_TOKEN',
  'SUPABASE_URL',
] as const;

/** Valores solo para `wrangler dev` sin `.dev.vars`: placeholders Supabase; el foro usa Postgres si hay `SUPABASE_SERVICE_ROLE_KEY` en `.dev.vars`. */
const LOCAL_DEV_ENV_PLACEHOLDERS = {
  WORKER_URL: 'http://127.0.0.1:8787',
  WORKER_INTERNAL_TOKEN: 'local-dev-worker-internal-token',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'local-dev-supabase-anon-key-placeholder',
} as const;

function isEmptyBinding(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

/**
 * Convierte bindings de Wrangler en un objeto parseable y, en modo desarrollo,
 * rellena placeholders si faltan **todas** las variables obligatorias (típico en local sin `.dev.vars`).
 */
export function normalizeEnvBindings(raw: unknown): Record<string, unknown> {
  const base =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};

  for (const key of Object.keys(base)) {
    if (base[key] === '') base[key] = undefined;
  }

  const mode: ApiMode = base.API_MODE === 'production' ? 'production' : 'development';
  base.API_MODE = mode;

  // En development, rellenar solo las claves vacías (p. ej. wrangler.jsonc con WORKER_URL pero sin Supabase).
  if (mode === 'development') {
    for (const k of REQUIRED_BINDING_KEYS) {
      if (isEmptyBinding(base[k])) {
        base[k] = LOCAL_DEV_ENV_PLACEHOLDERS[k];
      }
    }
    const hasSupabaseKey =
      !isEmptyBinding(base.SUPABASE_ANON_KEY) || !isEmptyBinding(base.SUPABASE_PUBLISHABLE_KEY);
    if (!hasSupabaseKey) {
      base.SUPABASE_ANON_KEY = LOCAL_DEV_ENV_PLACEHOLDERS.SUPABASE_ANON_KEY;
    }
  }

  return base;
}

export function parseEnv(raw: unknown): Env {
  const parsed = envSchema.safeParse(normalizeEnvBindings(raw));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    throw new Error(`Invalid environment: ${JSON.stringify(issues)}`);
  }
  return parsed.data;
}
