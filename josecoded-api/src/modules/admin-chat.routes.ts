import { Hono } from 'hono';
import type { User } from '@supabase/supabase-js';
import type { Env } from '../types/env.types';
import { parseEnv } from '../config/env';
import { requireUser, optionalUser } from '../middlewares/auth.middleware';
import { fail, ok } from '../utils/api-response';
import {
  adminChatMeetingSchema,
  adminChatN8nInboundSchema,
  adminChatSendSchema,
} from '../schemas/admin-chat.schema';
import {
  ensureConversation,
  getThread,
  insertUserMessage,
  scheduleMeetingOnMessage,
} from '../services/admin-chat.pg-store';
import { applyInboundFromN8n, runAssistantPipeline } from '../services/admin-chat-n8n.service';

type ChatCtx = { Bindings: Env; Variables: { user?: User } };

export const adminChatRoutes = new Hono<ChatCtx>();

adminChatRoutes.get('/thread', requireUser, async (c) => {
  const env = parseEnv(c.env);
  const user = c.get('user') as User;
  try {
    const thread = await getThread(env, user.id);
    return c.json(ok(thread));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Chat unavailable';
    if (msg.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return c.json(fail('internal_error', 'Chat database not configured'), 503);
    }
    console.error(JSON.stringify({ scope: 'admin-chat', action: 'thread-failed', message: msg }));
    return c.json(fail('internal_error', 'Chat unavailable'), 500);
  }
});

adminChatRoutes.post('/messages', requireUser, async (c) => {
  const env = parseEnv(c.env);
  const user = c.get('user') as User;
  const body = await c.req.json().catch(() => null);
  const parsed = adminChatSendSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(fail('invalid_request', 'Invalid body', parsed.error.flatten()), 400);
  }

  try {
    const conversationId = await ensureConversation(env, user.id);
    const userMessage = await insertUserMessage(env, {
      conversationId,
      userId: user.id,
      content: parsed.data.content,
    });

    const thread = await getThread(env, user.id);

    c.executionCtx.waitUntil(
      runAssistantPipeline(env, {
        conversationId,
        messageId: userMessage.id,
        userId: user.id,
        userEmail: user.email ?? '',
        text: parsed.data.content,
      }).catch((err) => {
        console.error(
          JSON.stringify({
            scope: 'admin-chat',
            action: 'assistant-pipeline-failed',
            conversationId,
            message: err instanceof Error ? err.message : 'unknown',
          }),
        );
      }),
    );

    return c.json(ok({ userMessage, thread }), 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send message';
    console.error(JSON.stringify({ scope: 'admin-chat', action: 'messages-failed', message: msg }));
    return c.json(fail('internal_error', 'Failed to send message'), 500);
  }
});

adminChatRoutes.post('/meeting', requireUser, async (c) => {
  const env = parseEnv(c.env);
  const user = c.get('user') as User;
  const body = await c.req.json().catch(() => null);
  const parsed = adminChatMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(fail('invalid_request', 'Invalid body', parsed.error.flatten()), 400);
  }

  try {
    const updated = await scheduleMeetingOnMessage(env, {
      ...parsed.data,
      userId: user.id,
    });
    if (!updated) {
      return c.json(fail('not_found', 'Meeting message not found'), 404);
    }

    await applyInboundFromN8n(env, {
      conversationId: parsed.data.conversationId,
      reply: `Solicitud registrada: ${parsed.data.date} a las ${parsed.data.time} (hora local). El administrador revisará la propuesta y te confirmará por este canal.`,
      showMeetingPicker: false,
    });

    const thread = await getThread(env, user.id);
    return c.json(ok({ message: updated, thread }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to schedule meeting';
    console.error(JSON.stringify({ scope: 'admin-chat', action: 'meeting-failed', message: msg }));
    return c.json(fail('internal_error', 'Failed to schedule meeting'), 500);
  }
});

/** Callback desde n8n (sin JWT de usuario). */
adminChatRoutes.post('/n8n/inbound', optionalUser, async (c) => {
  const env = parseEnv(c.env);
  const secret = env.N8N_CHAT_WEBHOOK_SECRET;
  const provided = c.req.header('x-n8n-chat-secret');
  if (!secret || provided !== secret) {
    return c.json(fail('unauthorized', 'Invalid n8n secret'), 401);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = adminChatN8nInboundSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(fail('invalid_request', 'Invalid body', parsed.error.flatten()), 400);
  }

  try {
    await applyInboundFromN8n(env, parsed.data);
    return c.json(ok({ accepted: true }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Inbound failed';
    console.error(JSON.stringify({ scope: 'admin-chat', action: 'n8n-inbound-failed', message: msg }));
    return c.json(fail('internal_error', 'Inbound failed'), 500);
  }
});
