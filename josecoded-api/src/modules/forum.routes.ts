import { Hono } from 'hono';
import type { User } from '@supabase/supabase-js';
import type { Env } from '../types/env.types';
import { parseEnv } from '../config/env';
import { optionalUser } from '../middlewares/auth.middleware';
import { forumWriteRateLimit } from '../middlewares/security.middleware';
import { fail, ok } from '../utils/api-response';
import { forumAuthorDisplayFromUser } from '../utils/forum-user';
import {
  ForumModerationDeniedError,
  ForumModerationUnavailableError,
  assertForumContentAllowed,
} from '../services/forum-moderation.service';
import {
  forumAddComment,
  forumCommentExists,
  forumCreateBranch,
  forumCreateEntry,
  forumDeleteComment,
  forumGetEntry,
  forumIsAdmin,
  forumListEntries,
  forumListThematics,
  forumPopular,
  forumSearch,
  forumToggleLike,
  forumToggleUseful,
  forumUpdateComment,
} from '../services/forum.store';
import {
  forumBranchBodySchema,
  forumCreateCommentSchema,
  forumCreateEntrySchema,
  forumUpdateCommentSchema,
  sanitizeSegments,
} from '../schemas/forum.schema';
import { slugFromTitleNoSpaces } from '../utils/forum-slug';

type ForumCtx = { Bindings: Env; Variables: { user?: User } };

function adminIds(env: Env): string[] {
  return (env.FORUM_ADMIN_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function requireSession(c: { get: (k: 'user') => User | undefined }): User | undefined {
  return c.get('user');
}

function parseLimitOffset(c: { req: { query: (k: string) => string | undefined } }, defLimit: number, maxLimit: number) {
  const rawL = Number(c.req.query('limit'));
  const rawO = Number(c.req.query('offset'));
  const limit = Number.isFinite(rawL) ? Math.min(maxLimit, Math.max(1, rawL)) : defLimit;
  const offset = Number.isFinite(rawO) ? Math.max(0, rawO) : 0;
  return { limit, offset };
}

export const forumRoutes = new Hono<ForumCtx>();

forumRoutes.use('*', optionalUser);
forumRoutes.use('*', forumWriteRateLimit((c) => c.get('user')?.id));

forumRoutes.get('/thematics', async (c) => {
  const env = parseEnv(c.env);
  return c.json(ok(await forumListThematics(env)));
});

forumRoutes.get('/thematics/:slug/entries', async (c) => {
  const env = parseEnv(c.env);
  const { limit, offset } = parseLimitOffset(c, 50, 100);
  const list = await forumListEntries(env, c.req.param('slug'), { limit, offset });
  if (!list) return c.json(fail('not_found', 'Thematic not found'), 404);
  return c.json(ok(list));
});

forumRoutes.get('/entries/:thematicSlug/:entrySlug', async (c) => {
  const env = parseEnv(c.env);
  const user = c.get('user');
  const userId = user?.id;
  const detail = await forumGetEntry(env, c.req.param('thematicSlug'), c.req.param('entrySlug'), userId);
  if (!detail) return c.json(fail('not_found', 'Entry not found'), 404);
  const canModerate = userId ? forumIsAdmin(userId, adminIds(env)) : false;
  return c.json(ok({ ...detail, canModerate }));
});

forumRoutes.get('/popular', async (c) => {
  const env = parseEnv(c.env);
  const { limit, offset } = parseLimitOffset(c, 10, 50);
  return c.json(ok(await forumPopular(env, limit, offset)));
});

forumRoutes.get('/search', async (c) => {
  const env = parseEnv(c.env);
  const q = c.req.query('q') ?? '';
  const rawL = Number(c.req.query('limit'));
  const lim = Number.isFinite(rawL) ? Math.min(80, Math.max(1, rawL)) : 40;
  return c.json(ok(await forumSearch(env, q, { limit: lim })));
});

forumRoutes.post('/entries', async (c) => {
  const env = parseEnv(c.env);
  const user = requireSession(c);
  if (!user) return c.json(fail('unauthorized', 'Authentication required'), 401);
  const body = await c.req.json().catch(() => null);
  const parsed = forumCreateEntrySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(fail('invalid_request', 'Invalid body', parsed.error.flatten()), 400);
  }
  const segments = sanitizeSegments(parsed.data.segments);
  const rawNt = parsed.data.newThematic;
  const newThematic = rawNt
    ? {
        slug: rawNt.slug ?? slugFromTitleNoSpaces(rawNt.titleDisplay, 80),
        titleDisplay: rawNt.titleDisplay,
        descriptionDisplay: rawNt.descriptionDisplay,
      }
    : undefined;
  const authorDisplay = forumAuthorDisplayFromUser(user);
  try {
    await assertForumContentAllowed(env, [
      { title: parsed.data.title, segments },
      ...(newThematic
        ? [{ title: newThematic.titleDisplay, segments: [{ type: 'text' as const, content: newThematic.descriptionDisplay ?? '' }] }]
        : []),
    ]);
  } catch (e) {
    if (e instanceof ForumModerationDeniedError) {
      return c.json(fail('content_rejected', 'Content rejected by moderation'), 422);
    }
    if (e instanceof ForumModerationUnavailableError) {
      return c.json(fail('moderation_unavailable', 'Moderation service unavailable'), 503);
    }
    throw e;
  }
  const res = await forumCreateEntry(env, {
    thematicSlug: parsed.data.thematicSlug,
    newThematic,
    slug: parsed.data.slug,
    title: parsed.data.title,
    segments,
    authorId: user.id,
    authorDisplay,
  });
  if (!res.ok) {
    if (res.code === 'not_found') return c.json(fail('not_found', 'Thematic not found'), 404);
    return c.json(fail('conflict', 'Thematic slug already exists'), 409);
  }
  return c.json(ok(res.entry), 201);
});

forumRoutes.post('/entries/:thematicSlug/:entrySlug/comments', async (c) => {
  const env = parseEnv(c.env);
  const user = requireSession(c);
  if (!user) return c.json(fail('unauthorized', 'Authentication required'), 401);
  const body = await c.req.json().catch(() => null);
  const parsed = forumCreateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(fail('invalid_request', 'Invalid body', parsed.error.flatten()), 400);
  }
  const segments = sanitizeSegments(parsed.data.segments);
  const authorDisplay = forumAuthorDisplayFromUser(user);
  try {
    await assertForumContentAllowed(env, [{ segments }]);
  } catch (e) {
    if (e instanceof ForumModerationDeniedError) {
      return c.json(fail('content_rejected', 'Content rejected by moderation'), 422);
    }
    if (e instanceof ForumModerationUnavailableError) {
      return c.json(fail('moderation_unavailable', 'Moderation service unavailable'), 503);
    }
    throw e;
  }
  const res = await forumAddComment(env, {
    thematicSlug: c.req.param('thematicSlug'),
    entrySlug: c.req.param('entrySlug'),
    authorId: user.id,
    authorDisplay,
    segments,
    parentCommentId: parsed.data.parentCommentId ?? null,
  });
  if (!res.ok) return c.json(fail('not_found', 'Entry not found'), 404);
  return c.json(ok(res.comment), 201);
});

forumRoutes.put('/entries/:thematicSlug/:entrySlug/comments/:commentId', async (c) => {
  const env = parseEnv(c.env);
  const user = requireSession(c);
  if (!user) return c.json(fail('unauthorized', 'Authentication required'), 401);
  const body = await c.req.json().catch(() => null);
  const parsed = forumUpdateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(fail('invalid_request', 'Invalid body', parsed.error.flatten()), 400);
  }
  const segments = sanitizeSegments(parsed.data.segments);
  try {
    await assertForumContentAllowed(env, [{ segments }]);
  } catch (e) {
    if (e instanceof ForumModerationDeniedError) {
      return c.json(fail('content_rejected', 'Content rejected by moderation'), 422);
    }
    if (e instanceof ForumModerationUnavailableError) {
      return c.json(fail('moderation_unavailable', 'Moderation service unavailable'), 503);
    }
    throw e;
  }
  const isAdmin = forumIsAdmin(user.id, adminIds(env));
  const res = await forumUpdateComment(env, {
    commentId: c.req.param('commentId'),
    userId: user.id,
    isAdmin,
    segments,
  });
  if (!res.ok) {
    if (res.code === 'forbidden') return c.json(fail('forbidden', 'Forbidden'), 403);
    return c.json(fail('not_found', 'Comment not found'), 404);
  }
  return c.json(ok({ updated: true }));
});

forumRoutes.delete('/entries/:thematicSlug/:entrySlug/comments/:commentId', async (c) => {
  const env = parseEnv(c.env);
  const user = requireSession(c);
  if (!user) return c.json(fail('unauthorized', 'Authentication required'), 401);
  const isAdmin = forumIsAdmin(user.id, adminIds(env));
  const res = await forumDeleteComment(env, {
    commentId: c.req.param('commentId'),
    userId: user.id,
    isAdmin,
  });
  if (!res.ok) {
    if (res.code === 'forbidden') return c.json(fail('forbidden', 'Forbidden'), 403);
    return c.json(fail('not_found', 'Comment not found'), 404);
  }
  return c.json(ok({ deleted: true }));
});

forumRoutes.post('/entries/:thematicSlug/:entrySlug/comments/:commentId/like', async (c) => {
  const env = parseEnv(c.env);
  const user = requireSession(c);
  if (!user) return c.json(fail('unauthorized', 'Authentication required'), 401);
  const r = await forumToggleLike(env, { commentId: c.req.param('commentId'), userId: user.id });
  if (!r.ok) return c.json(fail('not_found', 'Comment not found'), 404);
  return c.json(ok({ liked: r.liked, likeCount: r.likeCount }));
});

forumRoutes.post('/entries/:thematicSlug/:entrySlug/comments/:commentId/useful', async (c) => {
  const env = parseEnv(c.env);
  const user = requireSession(c);
  if (!user) return c.json(fail('unauthorized', 'Authentication required'), 401);
  const r = await forumToggleUseful(env, { commentId: c.req.param('commentId'), userId: user.id });
  if (!r.ok) return c.json(fail('not_found', 'Comment not found'), 404);
  return c.json(ok({ useful: r.useful, usefulCount: r.usefulCount }));
});

forumRoutes.post('/entries/:thematicSlug/:entrySlug/comments/:commentId/branch', async (c) => {
  const env = parseEnv(c.env);
  const user = requireSession(c);
  if (!user) return c.json(fail('unauthorized', 'Authentication required'), 401);
  if (!(await forumCommentExists(env, c.req.param('commentId')))) {
    return c.json(fail('not_found', 'Comment not found'), 404);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = forumBranchBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(fail('invalid_request', 'Invalid body', parsed.error.flatten()), 400);
  }
  const segments = sanitizeSegments(parsed.data.segments);
  const authorDisplay = forumAuthorDisplayFromUser(user);
  try {
    await assertForumContentAllowed(env, [{ title: parsed.data.title, segments }]);
  } catch (e) {
    if (e instanceof ForumModerationDeniedError) {
      return c.json(fail('content_rejected', 'Content rejected by moderation'), 422);
    }
    if (e instanceof ForumModerationUnavailableError) {
      return c.json(fail('moderation_unavailable', 'Moderation service unavailable'), 503);
    }
    throw e;
  }
  const res = await forumCreateBranch(env, {
    parentThematicSlug: c.req.param('thematicSlug'),
    parentEntrySlug: c.req.param('entrySlug'),
    fromCommentId: c.req.param('commentId'),
    authorId: user.id,
    authorDisplay,
    title: parsed.data.title,
    slug: parsed.data.slug,
    segments,
  });
  if (!res.ok) {
    if (res.code === 'not_found') return c.json(fail('not_found', 'Not found'), 404);
    if (res.redirect) {
      return c.json(
        fail('conflict', 'Branch already exists', {
          redirect: res.redirect,
        }),
        409,
      );
    }
    return c.json(fail('conflict', 'Slug conflict'), 409);
  }
  return c.json(ok(res.entry), 201);
});
