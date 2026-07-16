import { Hono } from 'hono';
import { nativeRateLimit } from './native-rate-limit.middleware';

function appWith(limiter: any) {
  const app = new Hono<any>();
  app.use('/ai/*', nativeRateLimit(() => limiter, { keyPrefix: 'ai' }));
  app.get('/ai/ping', (c) => c.text('ok'));
  return app;
}

describe('nativeRateLimit', () => {
  it('deja pasar cuando el binding permite', async () => {
    const res = await appWith({ limit: async () => ({ success: true }) })
      .request('http://x/ai/ping', { headers: { 'cf-connecting-ip': '1.1.1.1' } });
    expect(res.status).toBe(200);
  });

  it('responde 429 cuando el binding niega', async () => {
    const res = await appWith({ limit: async () => ({ success: false }) })
      .request('http://x/ai/ping', { headers: { 'cf-connecting-ip': '1.1.1.1' } });
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBeTruthy();
  });

  it('fail-open si no hay binding (dev local)', async () => {
    const res = await appWith(undefined)
      .request('http://x/ai/ping', { headers: { 'cf-connecting-ip': '1.1.1.1' } });
    expect(res.status).toBe(200);
  });

  it('responde 503 fail-closed cuando el binding lanza error', async () => {
    const res = await appWith({ limit: async () => { throw new Error('binding unavailable'); } })
      .request('http://x/ai/ping', { headers: { 'cf-connecting-ip': '1.1.1.1' } });
    expect(res.status).toBe(503);
    expect(res.headers.get('retry-after')).toBeTruthy();
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: { code: 'rate_limited', message: 'Too many requests' } });
  });
});
