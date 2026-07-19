import { Hono } from 'hono';
import type { User } from '@supabase/supabase-js';
import type { Env } from '../types/env.types';
import { requireUser } from '../middlewares/auth.middleware';
import { ok } from '../utils/api-response';
import { callWorker, toUpstreamFail } from '../services/worker.service';

export const protectedV1Routes = new Hono<{ Bindings: Env; Variables: { user: User } }>();

protectedV1Routes.use('*', requireUser);

protectedV1Routes.get('/auth/me', (c) => {
  const user = c.get('user');
  return c.json(ok({ user }));
});

protectedV1Routes.get('/system/status', async (c) => {
  try {
    const data = await callWorker<unknown>(c.env, '/system/status');
    return c.json(ok(data));
  } catch (e) {
    return c.json(toUpstreamFail(e), 502);
  }
});
