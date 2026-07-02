import { Hono } from 'hono';
import type { Env } from '../types/env.types';
import { callWorker, toUpstreamFail } from '../services/worker.service';
import { aiChatSchema } from '../schemas/ai.schema';
import { ok, fail } from '../utils/api-response';

export const aiRoutes = new Hono<{ Bindings: Env }>();

aiRoutes.post('/ai/chat', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = aiChatSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      fail('invalid_request', 'Invalid request body', parsed.error.flatten()),
      400,
    );
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
