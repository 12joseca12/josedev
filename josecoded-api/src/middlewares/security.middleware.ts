import type { Context, MiddlewareHandler } from 'hono';
import { fail } from '../utils/api-response';
import { parseEnv } from '../config/env';

function getClientId(c: Context): string {
  const forwardedFor = c.req.header('cf-connecting-ip');
  if (forwardedFor && forwardedFor.trim()) return forwardedFor.trim();
  const realIp = c.req.header('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();
  return 'unknown';
}

type FixedWindowRateLimitOptions = {
  limit: number;
  windowMs: number;
  keyPrefix: string;
  /** Si se define, sustituye la IP como clave (p. ej. usuario autenticado). */
  resolveKey?: (c: Context) => string;
};

const fixedWindowBuckets = new Map<string, { windowStart: number; count: number }>();

export function fixedWindowRateLimit(
  opts: FixedWindowRateLimitOptions,
): MiddlewareHandler {
  return async (c, next) => {
    const sub = opts.resolveKey ? opts.resolveKey(c) : getClientId(c);
    const key = `${opts.keyPrefix}:${sub}`;
    const now = Date.now();
    const windowStart = Math.floor(now / opts.windowMs) * opts.windowMs;

    const bucket = fixedWindowBuckets.get(key);
    if (!bucket || bucket.windowStart !== windowStart) {
      fixedWindowBuckets.set(key, { windowStart, count: 1 });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > opts.limit) {
      c.header('Retry-After', String(Math.ceil(opts.windowMs / 1000)));
      return c.json(
        fail('rate_limited', 'Too many requests'),
        429,
      );
    }

    return next();
  };
}

/** Rate limit escrituras del foro (POST/PUT/DELETE); GET/HEAD/OPTIONS pasan sin contar. */
export function forumWriteRateLimit(resolveActorId: (c: Context) => string | undefined): MiddlewareHandler {
  const limit = 48;
  const windowMs = 60_000;
  const inner = fixedWindowRateLimit({
    limit,
    windowMs,
    keyPrefix: 'forum:write',
    resolveKey: (c) => {
      const actor = resolveActorId(c)?.trim();
      if (actor) return actor;
      return getClientId(c);
    },
  });
  return async (c, next) => {
    const m = c.req.method;
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return next();
    return inner(c, next);
  };
}

export const requestId: MiddlewareHandler = async (c, next) => {
  const requestId =
    c.req.header('x-request-id')?.trim() ||
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`);

  c.set('requestId', requestId);
  c.header('x-request-id', requestId);
  await next();
};

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  c.header('x-content-type-options', 'nosniff');
  c.header('x-frame-options', 'DENY');
  c.header('referrer-policy', 'no-referrer');
  c.header('permissions-policy', 'geolocation=(), microphone=(), camera=()');
};

/**
 * Guards the dev-only SSRF-shaped worker proxy (`/api/dev/worker/*`).
 *
 * IMPORTANT (P8): production deployments MUST run with `API_MODE=production`.
 * This guard 404s outright unless `API_MODE === 'development'`, so shipping
 * the wrong mode is the only way this proxy becomes reachable in prod.
 *
 * Fails CLOSED: if we're in development mode but no `DEV_API_KEY` is
 * configured, requests are denied rather than allowed through. The previous
 * behavior (`if (!env.DEV_API_KEY) return next()`) let anyone hit the proxy
 * unauthenticated whenever the key was merely unset, which combined with a
 * misconfigured `API_MODE` could leave the proxy open in prod.
 */
export const devApiKeyGuard: MiddlewareHandler = async (c, next) => {
  const env = parseEnv(c.env);
  if (env.API_MODE !== 'development') return c.json(fail('not_found', 'Not found'), 404);
  if (!env.DEV_API_KEY) return c.json(fail('forbidden', 'Dev proxy is not configured'), 403);

  const provided = c.req.header('x-dev-api-key')?.trim();
  if (!provided) return c.json(fail('unauthorized', 'Missing dev api key'), 401);
  if (provided !== env.DEV_API_KEY) return c.json(fail('forbidden', 'Invalid dev api key'), 403);
  return next();
};
