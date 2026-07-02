import type { MiddlewareHandler } from 'hono';
import type { User } from '@supabase/supabase-js';
import { parseEnv } from '../config/env';
import { fail } from '../utils/api-response';
import { verifySupabaseUser } from '../services/supabase.service';
import type { Env } from '../types/env.types';

type AuthContext = {
  Bindings: Env;
  Variables: { user: User };
};

export const optionalUser: MiddlewareHandler<{ Bindings: Env; Variables: { user?: User } }> = async (c, next) => {
  const auth = c.req.header('authorization') ?? c.req.header('Authorization');
  if (!auth) return next();
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token) return next();
  const env = parseEnv(c.env);
  try {
    const user = await verifySupabaseUser(env, token);
    c.set('user', user);
  } catch {
    // Lectura anónima: token inválido se ignora.
  }
  return next();
};

export const requireUser: MiddlewareHandler<AuthContext> = async (c, next) => {
  const auth = c.req.header('authorization') ?? c.req.header('Authorization');
  if (!auth) return c.json(fail('unauthorized', 'Missing authorization header'), 401);

  const match = auth.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token) return c.json(fail('unauthorized', 'Invalid authorization header'), 401);

  const env = parseEnv(c.env);
  try {
    const user = await verifySupabaseUser(env, token);
    c.set('user', user);
    return next();
  } catch (e) {
    console.error(
      JSON.stringify({
        scope: 'auth',
        action: 'require-user-failed',
        message: e instanceof Error ? e.message : 'unknown',
      }),
    );
    return c.json(fail('unauthorized', 'Invalid or expired session'), 401);
  }
};

