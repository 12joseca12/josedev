import { z } from 'zod';

export const adminChatSendSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

export const adminChatN8nInboundSchema = z.object({
  conversationId: z.string().uuid(),
  reply: z.string().trim().min(1).max(8000),
  showMeetingPicker: z.boolean().optional(),
});

export const adminChatMeetingSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});
