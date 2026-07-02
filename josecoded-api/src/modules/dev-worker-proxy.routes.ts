import { Hono } from 'hono';
import type { Env } from '../types/env.types';
import { devApiKeyGuard, fixedWindowRateLimit } from '../middlewares/security.middleware';
import { fail } from '../utils/api-response';
import { callWorker, toUpstreamFail } from '../services/worker.service';

export const devWorkerProxyRoutes = new Hono<{ Bindings: Env }>();

devWorkerProxyRoutes.use('/api/dev/worker/*', devApiKeyGuard);
devWorkerProxyRoutes.use(
  '/api/dev/worker/*',
  fixedWindowRateLimit({
    limit: 60,
    windowMs: 60_000,
    keyPrefix: 'dev-worker-proxy',
  }),
);

const allowedMethods = new Set(['GET', 'POST', 'PUT', 'DELETE'] as const);

devWorkerProxyRoutes.all('/api/dev/worker/*', async (c) => {
  const method = c.req.method.toUpperCase();
  if (!allowedMethods.has(method as (typeof allowedMethods extends Set<infer T> ? T : never))) {
    return c.json(fail('invalid_request', 'Method not allowed'), 405);
  }

  const upstreamPath = c.req.path.replace(/^\/api\/dev\/worker/, '');
  if (!upstreamPath || upstreamPath === '/') {
    return c.json(fail('invalid_request', 'Missing upstream path'), 400);
  }

  const body =
    method === 'POST' || method === 'PUT' || method === 'DELETE'
      ? await c.req.json().catch(() => undefined)
      : undefined;

  try {
    const data = await callWorker<unknown>(c.env, upstreamPath, {
      method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
      ...(body !== undefined ? { body } : {}),
    });
    return c.json(data);
  } catch (e) {
    return c.json(toUpstreamFail(e), 502);
  }
});

