import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types/env.types';
import { healthRoutes } from './modules/health.routes';
import { systemRoutes } from './modules/system.routes';
import { emulatorRoutes } from './modules/emulator.routes';
import { devWorkerProxyRoutes } from './modules/dev-worker-proxy.routes';
import { v1Routes } from './modules/v1.routes';
import { parseEnv } from './config/env';
import {
  requestId,
  securityHeaders,
} from './middlewares/security.middleware';
import { nativeRateLimit } from './middlewares/native-rate-limit.middleware';
import { fail } from './utils/api-response';

const app = new Hono<{ Bindings: Env }>();

app.use('*', requestId);
app.use('*', securityHeaders);

app.use('*', async (c, next) => {
  const env = parseEnv(c.env);
  const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  const localhostDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  const corsMiddleware = cors({
    origin: (origin) => {
      if (!origin) return '';
      if (allowedOrigins.length > 0) {
        return allowedOrigins.includes(origin) ? origin : '';
      }
      if (env.API_MODE === 'development' && localhostDev.test(origin)) {
        return origin;
      }
      return '';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  });
  return corsMiddleware(c, next);
});

// Basic abuse protection for expensive endpoints (native Cloudflare binding, cross-isolate).
app.use('/demo/android/*', nativeRateLimit((env) => env.EMULATOR_RATE_LIMITER, { keyPrefix: 'emu' }));

app.route('/', healthRoutes);
app.route('/', systemRoutes);
app.route('/', emulatorRoutes);
app.route('/', devWorkerProxyRoutes);
app.route('/api/v1', v1Routes);

app.notFound((c) => {
  return c.json(
    fail('not_found', 'Route not found'),
    404,
  );
});

app.onError((error, c) => {
  // If env is invalid, fail early with a controlled response.
  if (error instanceof Error && error.message.startsWith('Invalid environment:')) {
    return c.json(fail('internal_error', 'API misconfigured'), 500);
  }
  return c.json(
    fail('internal_error', 'Internal API error', error instanceof Error ? error.message : undefined),
    500,
  );
});

export default app;
