import { Hono } from 'hono';
import type { User } from '@supabase/supabase-js';
import type { Env } from '../types/env.types';
import { requireUser } from '../middlewares/auth.middleware';
import { ok, fail } from '../utils/api-response';
import { callWorker, toUpstreamFail } from '../services/worker.service';
import { aiChatSchema } from '../schemas/ai.schema';

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

protectedV1Routes.post('/ai/chat', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = aiChatSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(fail('invalid_request', 'Invalid request body', parsed.error.flatten()), 400);
  }
  try {
    const data = await callWorker<unknown>(c.env, '/ai/chat', {
      method: 'POST',
      body: parsed.data,
    });
    return c.json(ok(data));
  } catch (e) {
    return c.json(toUpstreamFail(e), 502);
  }
});
