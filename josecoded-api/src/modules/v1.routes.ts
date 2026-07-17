import { Hono } from 'hono';
import type { Env } from '../types/env.types';
import { ok } from '../utils/api-response';
import { adminChatAdminRoutes } from './admin-chat-admin.routes';
import { adminChatRoutes } from './admin-chat.routes';
import { forumRoutes } from './forum.routes';
import { protectedV1Routes } from './v1-protected.routes';

export const v1Routes = new Hono<{ Bindings: Env }>();

v1Routes.get('/health', (c) => {
  return c.json(
    ok({
      service: 'josecoded-api',
      mode: c.env.API_MODE,
      timestamp: new Date().toISOString(),
      version: 'v1',
    }),
  );
});

v1Routes.route('/forum', forumRoutes);
v1Routes.route('/admin-chat/admin', adminChatAdminRoutes);
v1Routes.route('/admin-chat', adminChatRoutes);
v1Routes.route('/', protectedV1Routes);
