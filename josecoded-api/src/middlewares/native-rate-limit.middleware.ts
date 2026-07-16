import type { Context, MiddlewareHandler } from 'hono';
import { fail } from '../utils/api-response';
import type { Env } from '../types/env.types';

export type RateLimiterBinding = { limit(opts: { key: string }): Promise<{ success: boolean }> };

function getClientId(c: Context): string {
  const ip = c.req.header('cf-connecting-ip')?.trim() || c.req.header('x-real-ip')?.trim();
  return ip || 'unknown';
}

/** Rate-limit con el binding nativo de Cloudflare (global, entre isolates).
 *  Sin binding (dev local) hace fail-open para no romper `wrangler dev`. */
export function nativeRateLimit(
  getLimiter: (env: Env) => RateLimiterBinding | undefined,
  opts: { keyPrefix: string },
): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const limiter = getLimiter(c.env);
    if (!limiter) return next();
    const key = `${opts.keyPrefix}:${getClientId(c)}`;
    let success: boolean;
    try {
      ({ success } = await limiter.limit({ key }));
    } catch {
      // Fail-closed: si el binding del rate limiter falla, bloqueamos para
      // proteger el LLM auto-hospedado en vez de dejar pasar (fail-open).
      c.header('Retry-After', '60');
      return c.json(fail('rate_limited', 'Too many requests'), 503);
    }
    if (!success) {
      c.header('Retry-After', '60');
      return c.json(fail('rate_limited', 'Too many requests'), 429);
    }
    return next();
  };
}
