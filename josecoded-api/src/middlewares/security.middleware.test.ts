import { Hono } from 'hono';
import type { Env } from '../types/env.types';
import { devApiKeyGuard } from './security.middleware';

const prodRequiredEnv = {
  WORKER_URL: 'https://example.com',
  WORKER_INTERNAL_TOKEN: 'test-internal-token-12345',
  CORS_ORIGINS: 'http://localhost:3000',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key-12345',
} as const;

function appWith() {
  const app = new Hono<{ Bindings: Env }>();
  app.use('/api/dev/worker/*', devApiKeyGuard);
  app.get('/api/dev/worker/*', (c) => c.text('ok'));
  return app;
}

describe('devApiKeyGuard', () => {
  it('404s in production mode regardless of DEV_API_KEY', async () => {
    const res = await appWith().request(
      'http://x/api/dev/worker/system/status',
      {},
      { ...prodRequiredEnv, API_MODE: 'production', DEV_API_KEY: 'super-secret-key' },
    );
    expect(res.status).toBe(404);
  });

  it('fails CLOSED in dev mode when DEV_API_KEY is not configured', async () => {
    const res = await appWith().request(
      'http://x/api/dev/worker/system/status',
      {},
      { API_MODE: 'development' },
    );
    expect(res.status).toBe(403);
    const json = (await res.json()) as { ok: boolean; error?: { code?: string } };
    expect(json.ok).toBe(false);
    expect(json.error?.code).toBe('forbidden');
  });

  it('denies dev mode requests missing the x-dev-api-key header', async () => {
    const res = await appWith().request(
      'http://x/api/dev/worker/system/status',
      {},
      { API_MODE: 'development', DEV_API_KEY: 'super-secret-key' },
    );
    expect(res.status).toBe(401);
  });

  it('denies dev mode requests with a wrong x-dev-api-key', async () => {
    const res = await appWith().request(
      'http://x/api/dev/worker/system/status',
      { headers: { 'x-dev-api-key': 'wrong' } },
      { API_MODE: 'development', DEV_API_KEY: 'super-secret-key' },
    );
    expect(res.status).toBe(403);
  });

  it('allows dev mode requests with the correct x-dev-api-key', async () => {
    const res = await appWith().request(
      'http://x/api/dev/worker/system/status',
      { headers: { 'x-dev-api-key': 'super-secret-key' } },
      { API_MODE: 'development', DEV_API_KEY: 'super-secret-key' },
    );
    expect(res.status).toBe(200);
  });
});
