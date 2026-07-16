import { z } from 'zod';

/** Body de `POST /admin-chat/admin/conversations/:id/messages`. */
export const adminChatAdminReplySchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

/** Body de `POST /admin-chat/admin/conversations/:id/ai`. */
export const adminChatAdminAiToggleSchema = z.object({
  enabled: z.boolean(),
});

/** Valida el `:id` de conversación en los params de ruta. */
export const adminChatAdminConversationIdSchema = z.string().uuid();
