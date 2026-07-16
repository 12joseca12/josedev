import { Hono } from 'hono';
import type { User } from '@supabase/supabase-js';
import type { Env } from '../types/env.types';
import { parseEnv } from '../config/env';
import { requireUser } from '../middlewares/auth.middleware';
import { fail, ok } from '../utils/api-response';
import {
  adminChatAdminAiToggleSchema,
  adminChatAdminConversationIdSchema,
  adminChatAdminReplySchema,
} from '../schemas/admin-chat-admin.schema';
import {
  AdminAccessDeniedError,
  assertAdmin,
  getConversationMessagesForAdmin,
  insertAdminMessage,
  listConversationsForAdmin,
  markConversationRead,
  setConversationAiEnabled,
} from '../services/admin-chat.pg-store';

type AdminChatAdminCtx = { Bindings: Env; Variables: { user: User } };

export const adminChatAdminRoutes = new Hono<AdminChatAdminCtx>();

adminChatAdminRoutes.use('*', requireUser);

/** Re-chequeo de rol admin en cada request (el gateway escribe con service-role, bypasea RLS). */
adminChatAdminRoutes.use('*', async (c, next) => {
  const env = parseEnv(c.env);
  const user = c.get('user');
  try {
    await assertAdmin(env, user);
  } catch (e) {
    if (e instanceof AdminAccessDeniedError) {
      return c.json(fail('forbidden', 'Admin role required'), 403);
    }
    console.error(
      JSON.stringify({
        scope: 'admin-chat-admin',
        action: 'assert-admin-failed',
        message: e instanceof Error ? e.message : 'unknown',
      }),
    );
    return c.json(fail('internal_error', 'Unable to verify admin role'), 500);
  }
  return next();
});

function parseConversationIdParam(id: string | undefined): string | null {
  const parsed = adminChatAdminConversationIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

adminChatAdminRoutes.get('/conversations', async (c) => {
  const env = parseEnv(c.env);
  try {
    const conversations = await listConversationsForAdmin(env);
    return c.json(ok(conversations));
  } catch (e) {
    console.error(
      JSON.stringify({
        scope: 'admin-chat-admin',
        action: 'list-conversations-failed',
        message: e instanceof Error ? e.message : 'unknown',
      }),
    );
    return c.json(fail('internal_error', 'Failed to list conversations'), 500);
  }
});

adminChatAdminRoutes.get('/conversations/:id/messages', async (c) => {
  const env = parseEnv(c.env);
  const conversationId = parseConversationIdParam(c.req.param('id'));
  if (!conversationId) {
    return c.json(fail('invalid_request', 'Invalid conversation id'), 400);
  }
  try {
    const messages = await getConversationMessagesForAdmin(env, conversationId);
    return c.json(ok(messages));
  } catch (e) {
    console.error(
      JSON.stringify({
        scope: 'admin-chat-admin',
        action: 'get-messages-failed',
        conversationId,
        message: e instanceof Error ? e.message : 'unknown',
      }),
    );
    return c.json(fail('internal_error', 'Failed to load messages'), 500);
  }
});

adminChatAdminRoutes.post('/conversations/:id/messages', async (c) => {
  const env = parseEnv(c.env);
  const user = c.get('user');
  const conversationId = parseConversationIdParam(c.req.param('id'));
  if (!conversationId) {
    return c.json(fail('invalid_request', 'Invalid conversation id'), 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = adminChatAdminReplySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(fail('invalid_request', 'Invalid body', parsed.error.flatten()), 400);
  }

  try {
    const message = await insertAdminMessage(env, {
      conversationId,
      adminId: user.id,
      content: parsed.data.content,
    });
    return c.json(ok(message), 201);
  } catch (e) {
    console.error(
      JSON.stringify({
        scope: 'admin-chat-admin',
        action: 'insert-admin-message-failed',
        conversationId,
        message: e instanceof Error ? e.message : 'unknown',
      }),
    );
    return c.json(fail('internal_error', 'Failed to send message'), 500);
  }
});

adminChatAdminRoutes.post('/conversations/:id/ai', async (c) => {
  const env = parseEnv(c.env);
  const conversationId = parseConversationIdParam(c.req.param('id'));
  if (!conversationId) {
    return c.json(fail('invalid_request', 'Invalid conversation id'), 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = adminChatAdminAiToggleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(fail('invalid_request', 'Invalid body', parsed.error.flatten()), 400);
  }

  try {
    await setConversationAiEnabled(env, conversationId, parsed.data.enabled);
    return c.json(ok({ conversationId, aiEnabled: parsed.data.enabled }));
  } catch (e) {
    console.error(
      JSON.stringify({
        scope: 'admin-chat-admin',
        action: 'set-ai-enabled-failed',
        conversationId,
        message: e instanceof Error ? e.message : 'unknown',
      }),
    );
    return c.json(fail('internal_error', 'Failed to update AI toggle'), 500);
  }
});

adminChatAdminRoutes.post('/conversations/:id/read', async (c) => {
  const env = parseEnv(c.env);
  const conversationId = parseConversationIdParam(c.req.param('id'));
  if (!conversationId) {
    return c.json(fail('invalid_request', 'Invalid conversation id'), 400);
  }

  try {
    await markConversationRead(env, conversationId);
    return c.json(ok({ conversationId }));
  } catch (e) {
    console.error(
      JSON.stringify({
        scope: 'admin-chat-admin',
        action: 'mark-read-failed',
        conversationId,
        message: e instanceof Error ? e.message : 'unknown',
      }),
    );
    return c.json(fail('internal_error', 'Failed to mark conversation read'), 500);
  }
});
