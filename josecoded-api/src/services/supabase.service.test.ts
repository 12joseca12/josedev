import type { Env } from '../types/env.types';
import { getSupabaseApiKey, verifySupabaseUser } from './supabase.service';

const baseEnv = {
  API_MODE: 'development',
  WORKER_URL: 'http://127.0.0.1:8787',
  WORKER_INTERNAL_TOKEN: 'local-dev-worker-internal-token',
  CORS_ORIGINS: '',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
} satisfies Env;

describe('supabase.service', () => {
  it('prefers publishable api key when set', () => {
    expect(getSupabaseApiKey(baseEnv)).toBe('sb_publishable_test');
  });

  it('verifySupabaseUser calls auth/v1/user with bearer and apikey', async () => {
    const originalFetch = globalThis.fetch;
    let capturedUrl = '';
    let capturedHeaders: HeadersInit | undefined;

    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedHeaders = init?.headers;
      return new Response(JSON.stringify({ id: 'user-1', email: 'a@b.com' }), { status: 200 });
    }) as typeof fetch;

    try {
      const user = await verifySupabaseUser(baseEnv, 'jwt-test');
      expect(user.id).toBe('user-1');
      expect(capturedUrl).toMatch(/\/auth\/v1\/user$/);
      const headers = capturedHeaders as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer jwt-test');
      expect(headers.apikey).toBe('sb_publishable_test');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
