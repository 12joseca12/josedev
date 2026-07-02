import { z } from 'zod';

export const aiChatSchema = z.object({
  message: z.string().min(1).max(2000),
  numPredict: z.number().int().min(20).max(1000).optional(),
});
