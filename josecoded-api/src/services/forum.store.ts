import type { Env } from '../types/env.types';
import type {
  ForumCommentDTO,
  ForumEntryDetailDTO,
  ForumEntrySummaryDTO,
  ForumSegment,
  ForumThematicDTO,
} from '../types/forum.types';
import * as mock from './forum.mock-store';
import * as pg from './forum.pg-store';

/**
 * Foro en Postgres por defecto cuando existe `SUPABASE_SERVICE_ROLE_KEY`.
 * Mock explícito: `FORUM_USE_MOCK=true` (p. ej. `pnpm dev -- --mock`) o `FORUM_USE_DATABASE=false`.
 */
export function forumUsesDatabase(env: Env): boolean {
  if (env.FORUM_USE_MOCK === 'true') return false;
  if (env.FORUM_USE_DATABASE === 'false') return false;
  return Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export async function forumListThematics(env: Env): Promise<ForumThematicDTO[]> {
  if (forumUsesDatabase(env)) return pg.forumPgListThematics(env);
  return mock.forumListThematics();
}

export async function forumListEntries(
  env: Env,
  thematicSlug: string,
  opts?: { limit?: number; offset?: number },
): Promise<ForumEntrySummaryDTO[] | null> {
  if (forumUsesDatabase(env)) return pg.forumPgListEntries(env, thematicSlug, opts);
  return mock.forumListEntries(thematicSlug, opts);
}

export async function forumPopular(
  env: Env,
  limit: number,
  offset?: number,
): Promise<ForumEntrySummaryDTO[]> {
  if (forumUsesDatabase(env)) return pg.forumPgPopular(env, limit, offset ?? 0);
  return mock.forumPopular(limit, offset ?? 0);
}

export async function forumSearch(
  env: Env,
  q: string,
  opts?: { limit?: number },
): Promise<{ thematics: ForumThematicDTO[]; entries: ForumEntrySummaryDTO[] }> {
  if (forumUsesDatabase(env)) return pg.forumPgSearch(env, q, opts);
  return mock.forumSearch(q, opts);
}

export async function forumGetEntry(
  env: Env,
  thematicSlug: string,
  entrySlug: string,
  userId: string | undefined,
): Promise<ForumEntryDetailDTO | null> {
  if (forumUsesDatabase(env)) return pg.forumPgGetEntry(env, thematicSlug, entrySlug, userId);
  return mock.forumGetEntry(thematicSlug, entrySlug, userId);
}

export async function forumCreateEntry(
  env: Env,
  input: {
    thematicSlug?: string;
    newThematic?: { slug: string; titleDisplay: string; descriptionDisplay?: string };
    slug: string;
    title: string;
    segments: ForumSegment[];
    authorId: string;
    authorDisplay: string;
  },
): Promise<{ ok: true; entry: ForumEntrySummaryDTO } | { ok: false; code: 'not_found' | 'conflict_thematic' }> {
  if (forumUsesDatabase(env)) return pg.forumPgCreateEntry({ env, ...input });
  return mock.forumCreateEntry(input);
}

export async function forumAddComment(
  env: Env,
  input: {
    thematicSlug: string;
    entrySlug: string;
    authorId: string;
    authorDisplay: string;
    segments: ForumSegment[];
    parentCommentId: string | null;
  },
): Promise<{ ok: true; comment: ForumCommentDTO } | { ok: false; code: 'not_found' }> {
  if (forumUsesDatabase(env)) return pg.forumPgAddComment({ env, ...input });
  return mock.forumAddComment(input);
}

export async function forumUpdateComment(
  env: Env,
  input: {
    commentId: string;
    userId: string;
    isAdmin: boolean;
    segments: ForumSegment[];
  },
): Promise<{ ok: true } | { ok: false; code: 'not_found' | 'forbidden' }> {
  if (forumUsesDatabase(env)) return pg.forumPgUpdateComment({ env, ...input });
  return mock.forumUpdateComment(input);
}

export async function forumDeleteComment(
  env: Env,
  input: {
    commentId: string;
    userId: string;
    isAdmin: boolean;
  },
): Promise<{ ok: true } | { ok: false; code: 'not_found' | 'forbidden' }> {
  if (forumUsesDatabase(env)) return pg.forumPgDeleteComment({ env, ...input });
  return mock.forumDeleteComment(input);
}

export async function forumCommentExists(env: Env, commentId: string): Promise<boolean> {
  if (forumUsesDatabase(env)) return pg.forumPgCommentExists(env, commentId);
  return mock.forumCommentExists(commentId);
}

export async function forumCreateBranch(
  env: Env,
  input: {
    parentThematicSlug: string;
    parentEntrySlug: string;
    fromCommentId: string;
    authorId: string;
    authorDisplay: string;
    title: string;
    slug: string;
    segments: ForumSegment[];
  },
): Promise<
  | { ok: true; entry: ForumEntrySummaryDTO }
  | { ok: false; code: 'not_found' | 'conflict'; redirect?: { thematicSlug: string; entrySlug: string } }
> {
  if (forumUsesDatabase(env)) return pg.forumPgCreateBranch({ env, ...input });
  return mock.forumCreateBranch(input);
}

export async function forumToggleLike(
  env: Env,
  input: { commentId: string; userId: string },
): Promise<{ ok: true; liked: boolean; likeCount: number } | { ok: false }> {
  if (forumUsesDatabase(env)) return pg.forumPgToggleLike(env, input);
  return mock.forumToggleLike(input);
}

export async function forumToggleUseful(
  env: Env,
  input: { commentId: string; userId: string },
): Promise<{ ok: true; useful: boolean; usefulCount: number } | { ok: false }> {
  if (forumUsesDatabase(env)) return pg.forumPgToggleUseful(env, input);
  return mock.forumToggleUseful(input);
}

export { forumIsAdmin, forumResetMock } from './forum.mock-store';
