import { Hono } from 'hono';
import type { Env } from '../types/env.types';
import { callWorker, toUpstreamFail } from '../services/worker.service';
import { ok } from '../utils/api-response';

export const systemRoutes = new Hono<{ Bindings: Env }>();

systemRoutes.get('/system/status', async (c) => {
  try {
    const data = await callWorker<unknown>(c.env, '/system/status');
    return c.json(ok(data));
  } catch (e) {
    return c.json(toUpstreamFail(e), 502);
  }
});
