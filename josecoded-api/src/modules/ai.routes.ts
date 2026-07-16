import { Hono } from 'hono';
import type { Env } from '../types/env.types';
import { callWorker, toUpstreamFail, upstreamHttpStatus } from '../services/worker.service';
import { resolveAiChatTimeoutMs } from '../services/ai-timeout';
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
      timeoutMs: resolveAiChatTimeoutMs(c.env),
    });
    return c.json(ok(data));
  } catch (e) {
    const status = upstreamHttpStatus(e);
    return c.json(toUpstreamFail(e), status as 401 | 409 | 502 | 504 | 408);
  }
});
