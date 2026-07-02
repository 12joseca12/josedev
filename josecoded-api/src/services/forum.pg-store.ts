import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types/env.types';
import type {
  ForumBranchLinkDTO,
  ForumCommentDTO,
  ForumEntryDetailDTO,
  ForumEntrySummaryDTO,
  ForumParticipantDTO,
  ForumSegment,
  ForumThematicDTO,
} from '../types/forum.types';

function adminClient(env: Env): SupabaseClient {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for forum database');
  return createClient(env.SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (...a: Parameters<typeof fetch>) => fetch(...a) },
  });
}

function mapThematic(r: {
  id: string;
  slug: string;
  title_display: string;
  description_display: string | null;
}): ForumThematicDTO {
  return {
    id: r.id,
    slug: r.slug,
    titleDisplay: r.title_display,
    descriptionDisplay: r.description_display ?? undefined,
  };
}

function mapEntrySummary(
  r: {
    id: string;
    slug: string;
    title_display: string;
    author_id: string;
    author_display: string;
    created_at: string;
    parent_entry_id: string | null;
    branch_from_comment_id: string | null;
    thematic_slug: string;
    comment_count?: number;
    like_count?: number;
    useful_count?: number;
  },
): ForumEntrySummaryDTO {
  return {
    id: r.id,
    thematicSlug: r.thematic_slug,
    slug: r.slug,
    titleDisplay: r.title_display,
    authorId: r.author_id,
    authorDisplay: r.author_display,
    commentCount: r.comment_count ?? 0,
    likeCount: r.like_count ?? 0,
    usefulCount: r.useful_count ?? 0,
    createdAt: r.created_at,
    parentEntryId: r.parent_entry_id,
    branchFromCommentId: r.branch_from_comment_id,
  };
}

async function commentCountsForEntry(sb: SupabaseClient, entryId: string) {
  const { data: cs } = await sb.from('forum_comments').select('like_count,useful_count').eq('entry_id', entryId);
  const list = cs ?? [];
  return {
    commentCount: list.length,
    likeCount: list.reduce((s, c) => s + (c.like_count ?? 0), 0),
    usefulCount: list.reduce((s, c) => s + (c.useful_count ?? 0), 0),
  };
}

export async function forumPgListThematics(env: Env): Promise<ForumThematicDTO[]> {
  const sb = adminClient(env);
  const { data, error } = await sb.from('forum_thematics').select('id,slug,title_display,description_display').order('slug');
  if (error || !data) return [];
  return data.map((r) => mapThematic(r as never));
}

export async function forumPgListEntries(
  env: Env,
  thematicSlug: string,
  opts?: { limit?: number; offset?: number },
): Promise<ForumEntrySummaryDTO[] | null> {
  const sb = adminClient(env);
  const th = await sb.from('forum_thematics').select('id').eq('slug', thematicSlug).maybeSingle();
  if (!th.data) return null;
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 50));
  const offset = Math.max(0, opts?.offset ?? 0);
  const { data: rows, error } = await sb
    .from('forum_entries')
    .select('id,slug,title_display,author_id,author_display,created_at,parent_entry_id,branch_from_comment_id')
    .eq('thematic_id', th.data.id)
    .is('parent_entry_id', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error || !rows) return [];
  const out: ForumEntrySummaryDTO[] = [];
  for (const raw of rows) {
    const r = raw as Record<string, unknown>;
    const id = String(r.id);
    const counts = await commentCountsForEntry(sb, id);
    out.push(
      mapEntrySummary({
        id,
        slug: String(r.slug),
        title_display: String(r.title_display),
        author_id: String(r.author_id),
        author_display: String(r.author_display),
        created_at: String(r.created_at),
        parent_entry_id: (r.parent_entry_id as string | null) ?? null,
        branch_from_comment_id: (r.branch_from_comment_id as string | null) ?? null,
        thematic_slug: thematicSlug,
        ...counts,
      }),
    );
  }
  return out;
}

export async function forumPgPopular(
  env: Env,
  limit: number,
  offset = 0,
): Promise<ForumEntrySummaryDTO[]> {
  const sb = adminClient(env);
  const { data: mains, error } = await sb
    .from('forum_entries')
    .select('id,thematic_id,slug,title_display,author_id,author_display,created_at,parent_entry_id,branch_from_comment_id')
    .is('parent_entry_id', null);
  if (error || !mains) return [];
  const thCache = new Map<string, string>();
  const scored: { row: Record<string, unknown>; score: number; slug: string }[] = [];
  for (const m of mains) {
    const row = m as Record<string, unknown>;
    const tid = String(row.thematic_id);
    let thSlug = thCache.get(tid);
    if (!thSlug) {
      const { data: th } = await sb.from('forum_thematics').select('slug').eq('id', tid).maybeSingle();
      thSlug = th?.slug as string | undefined;
      if (!thSlug) continue;
      thCache.set(tid, thSlug);
    }
    const counts = await commentCountsForEntry(sb, String(row.id));
    const score = counts.commentCount * 2 + counts.likeCount;
    scored.push({ row, score, slug: thSlug });
  }
  scored.sort((a, b) => b.score - a.score || String(b.row.created_at).localeCompare(String(a.row.created_at)));
  const page = scored.slice(offset, offset + limit);
  const out: ForumEntrySummaryDTO[] = [];
  for (const { row, slug } of page) {
    const r = row as Record<string, unknown>;
    const counts = await commentCountsForEntry(sb, String(r.id));
    out.push(
      mapEntrySummary({
        id: String(r.id),
        slug: String(r.slug),
        title_display: String(r.title_display),
        author_id: String(r.author_id),
        author_display: String(r.author_display),
        created_at: String(r.created_at),
        parent_entry_id: (r.parent_entry_id as string | null) ?? null,
        branch_from_comment_id: (r.branch_from_comment_id as string | null) ?? null,
        thematic_slug: slug,
        ...counts,
      }),
    );
  }
  return out;
}

export async function forumPgSearch(
  env: Env,
  qRaw: string,
  opts?: { limit?: number },
): Promise<{ thematics: ForumThematicDTO[]; entries: ForumEntrySummaryDTO[] }> {
  const q = qRaw.trim();
  const lim = Math.min(80, Math.max(1, opts?.limit ?? 40));
  if (!q) return { thematics: [], entries: [] };
  const sb = adminClient(env);
  const ql = q.toLowerCase();

  const { data: allTh } = await sb.from('forum_thematics').select('id,slug,title_display,description_display');
  const thematics = (allTh ?? [])
    .filter((t) => {
      const r = t as Record<string, unknown>;
      const hay = `${r.slug} ${r.title_display} ${r.description_display ?? ''}`.toLowerCase();
      return hay.includes(ql);
    })
    .slice(0, lim)
    .map((r) => mapThematic(r as never));

  const { data: fts } = await sb.from('forum_entry_search').select('entry_id').textSearch('document', q);

  const entryIds = new Set<string>();
  for (const r of fts ?? []) entryIds.add(String((r as { entry_id: string }).entry_id));

  const { data: allEntries } = await sb
    .from('forum_entries')
    .select('id,thematic_id,slug,title_display,author_id,author_display,created_at,parent_entry_id,branch_from_comment_id')
    .ilike('title_display', `%${q.replace(/%/g, '')}%`)
    .limit(lim);
  for (const e of allEntries ?? []) entryIds.add(String((e as { id: string }).id));

  const entries: ForumEntrySummaryDTO[] = [];
  for (const id of entryIds) {
    const { data: ent } = await sb
      .from('forum_entries')
      .select('id,thematic_id,slug,title_display,author_id,author_display,created_at,parent_entry_id,branch_from_comment_id')
      .eq('id', id)
      .maybeSingle();
    if (!ent) continue;
    const er = ent as Record<string, unknown>;
    const { data: th } = await sb.from('forum_thematics').select('slug').eq('id', String(er.thematic_id)).maybeSingle();
    if (!th?.slug) continue;
    const counts = await commentCountsForEntry(sb, String(er.id));
    entries.push(
      mapEntrySummary({
        id: String(er.id),
        slug: String(er.slug),
        title_display: String(er.title_display),
        author_id: String(er.author_id),
        author_display: String(er.author_display),
        created_at: String(er.created_at),
        parent_entry_id: (er.parent_entry_id as string | null) ?? null,
        branch_from_comment_id: (er.branch_from_comment_id as string | null) ?? null,
        thematic_slug: String(th.slug),
        ...counts,
      }),
    );
    if (entries.length >= lim) break;
  }

  return { thematics, entries };
}

async function mapComment(
  sb: SupabaseClient,
  row: Record<string, unknown>,
  userId: string | undefined,
): Promise<ForumCommentDTO> {
  const id = String(row.id);
  let likedByMe = false;
  let usefulByMe = false;
  if (userId) {
    const { data: lk } = await sb.from('forum_comment_likes').select('comment_id').eq('comment_id', id).eq('user_id', userId).maybeSingle();
    likedByMe = Boolean(lk);
    const { data: us } = await sb.from('forum_comment_useful').select('comment_id').eq('comment_id', id).eq('user_id', userId).maybeSingle();
    usefulByMe = Boolean(us);
  }
  return {
    id,
    entryId: String(row.entry_id),
    authorId: String(row.author_id),
    authorDisplay: String(row.author_display),
    parentCommentId: (row.parent_comment_id as string | null) ?? null,
    segments: row.segments as ForumSegment[],
    isEntrySeed: Boolean(row.is_entry_seed),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    likeCount: Number(row.like_count ?? 0),
    usefulCount: Number(row.useful_count ?? 0),
    likedByMe,
    usefulByMe,
  };
}

export async function forumPgGetEntry(
  env: Env,
  thematicSlug: string,
  entrySlug: string,
  userId: string | undefined,
): Promise<ForumEntryDetailDTO | null> {
  const sb = adminClient(env);
  const { data: th } = await sb.from('forum_thematics').select('id').eq('slug', thematicSlug).maybeSingle();
  if (!th) return null;
  const { data: ent } = await sb
    .from('forum_entries')
    .select('*')
    .eq('thematic_id', th.id)
    .eq('slug', entrySlug)
    .maybeSingle();
  if (!ent) return null;
  const er = ent as Record<string, unknown>;
  const counts = await commentCountsForEntry(sb, String(er.id));
  const entryDto = mapEntrySummary({
    id: String(er.id),
    slug: String(er.slug),
    title_display: String(er.title_display),
    author_id: String(er.author_id),
    author_display: String(er.author_display),
    created_at: String(er.created_at),
    parent_entry_id: (er.parent_entry_id as string | null) ?? null,
    branch_from_comment_id: (er.branch_from_comment_id as string | null) ?? null,
    thematic_slug: thematicSlug,
    ...counts,
  });

  const { data: cRows } = await sb.from('forum_comments').select('*').eq('entry_id', er.id).order('created_at');
  const comments: ForumCommentDTO[] = [];
  for (const c of cRows ?? []) {
    comments.push(await mapComment(sb, c as Record<string, unknown>, userId));
  }

  const usefulIds = new Set<string>();
  if (comments.length > 0) {
    const ids = comments.map((c) => c.id);
    const { data: us } = await sb.from('forum_comment_useful').select('comment_id').in('comment_id', ids);
    for (const u of us ?? []) usefulIds.add(String((u as { comment_id: string }).comment_id));
  }
  const usefulHighlights = comments.filter((c) => usefulIds.has(c.id) && !c.isEntrySeed);

  const { data: branchRows } = await sb
    .from('forum_entries')
    .select('id,slug,branch_from_comment_id,thematic_id')
    .eq('parent_entry_id', er.id)
    .not('branch_from_comment_id', 'is', null);
  const branches: ForumBranchLinkDTO[] = [];
  for (const b of branchRows ?? []) {
    const br = b as Record<string, unknown>;
    branches.push({
      entryId: String(br.id),
      slug: String(br.slug),
      thematicSlug,
      fromCommentId: String(br.branch_from_comment_id),
      labelKey: 'forum.branch.label',
    });
  }

  const participantMap = new Map<string, ForumParticipantDTO>();
  for (const c of comments) {
    const role: 'author' | 'participant' = c.authorId === entryDto.authorId ? 'author' : 'participant';
    const prev = participantMap.get(c.authorId);
    if (!prev || role === 'author') {
      participantMap.set(c.authorId, {
        userId: c.authorId,
        displayName: c.authorDisplay,
        role,
      });
    }
  }
  participantMap.set(entryDto.authorId, {
    userId: entryDto.authorId,
    displayName: entryDto.authorDisplay,
    role: 'author',
  });
  const participants = [...participantMap.values()].sort((a, b) => {
    if (a.role === 'author') return -1;
    if (b.role === 'author') return 1;
    return (a.displayName ?? '').localeCompare(b.displayName ?? '');
  });

  return {
    entry: { ...entryDto, bodyPreviewKey: undefined },
    comments,
    usefulHighlights,
    branches,
    participants,
    canModerate: false,
  };
}

export async function forumPgCreateEntry(input: {
  env: Env;
  thematicSlug?: string;
  newThematic?: { slug: string; titleDisplay: string; descriptionDisplay?: string };
  slug: string;
  title: string;
  segments: ForumSegment[];
  authorId: string;
  authorDisplay: string;
}): Promise<{ ok: true; entry: ForumEntrySummaryDTO } | { ok: false; code: 'not_found' | 'conflict_thematic' }> {
  const sb = adminClient(input.env);
  let thematicId: string;
  if (input.newThematic) {
    const { slug: thSlug, titleDisplay, descriptionDisplay } = input.newThematic;
    const { data: clash } = await sb.from('forum_thematics').select('id').eq('slug', thSlug).maybeSingle();
    if (clash) return { ok: false, code: 'conflict_thematic' };
    const { data: insTh, error: e1 } = await sb
      .from('forum_thematics')
      .insert({
        slug: thSlug,
        title_display: titleDisplay,
        description_display: descriptionDisplay ?? null,
        created_by: input.authorId,
      })
      .select('id')
      .single();
    if (e1 || !insTh) return { ok: false, code: 'conflict_thematic' };
    thematicId = String((insTh as { id: string }).id);
  } else if (input.thematicSlug) {
    const { data: th } = await sb.from('forum_thematics').select('id').eq('slug', input.thematicSlug).maybeSingle();
    if (!th) return { ok: false, code: 'not_found' };
    thematicId = String((th as { id: string }).id);
  } else return { ok: false, code: 'not_found' };

  let entrySlug = input.slug.slice(0, 120);
  let n = 2;
  for (;;) {
    const { data: ex } = await sb.from('forum_entries').select('id').eq('thematic_id', thematicId).eq('slug', entrySlug).maybeSingle();
    if (!ex) break;
    const suffix = `-${n}`;
    entrySlug = `${input.slug.slice(0, Math.max(1, 120 - suffix.length))}${suffix}`;
    n += 1;
  }

  const { data: entryRow, error: e2 } = await sb
    .from('forum_entries')
    .insert({
      thematic_id: thematicId,
      slug: entrySlug,
      title_display: input.title,
      author_id: input.authorId,
      author_display: input.authorDisplay,
      parent_entry_id: null,
      branch_from_comment_id: null,
    })
    .select('id,created_at')
    .single();
  if (e2 || !entryRow) return { ok: false, code: 'not_found' };
  const entryId = String((entryRow as { id: string }).id);
  const now = String((entryRow as { created_at: string }).created_at);

  const { error: e3 } = await sb.from('forum_comments').insert({
    entry_id: entryId,
    author_id: input.authorId,
    author_display: input.authorDisplay,
    parent_comment_id: null,
    is_entry_seed: true,
    segments: input.segments,
    like_count: 0,
    useful_count: 0,
    created_at: now,
    updated_at: now,
  });
  if (e3) {
    await sb.from('forum_entries').delete().eq('id', entryId);
    return { ok: false, code: 'not_found' };
  }

  const { data: thSlugRow } = await sb.from('forum_thematics').select('slug').eq('id', thematicId).single();
  const thSlug = String((thSlugRow as { slug: string }).slug);
  const counts = await commentCountsForEntry(sb, entryId);
  return {
    ok: true,
    entry: mapEntrySummary({
      id: entryId,
      slug: entrySlug,
      title_display: input.title,
      author_id: input.authorId,
      author_display: input.authorDisplay,
      created_at: now,
      parent_entry_id: null,
      branch_from_comment_id: null,
      thematic_slug: thSlug,
      ...counts,
    }),
  };
}

export async function forumPgAddComment(input: {
  env: Env;
  thematicSlug: string;
  entrySlug: string;
  authorId: string;
  authorDisplay: string;
  segments: ForumSegment[];
  parentCommentId: string | null;
}): Promise<{ ok: true; comment: ForumCommentDTO } | { ok: false; code: 'not_found' }> {
  const sb = adminClient(input.env);
  const { data: th } = await sb.from('forum_thematics').select('id').eq('slug', input.thematicSlug).maybeSingle();
  if (!th) return { ok: false, code: 'not_found' };
  const { data: ent } = await sb
    .from('forum_entries')
    .select('id')
    .eq('thematic_id', (th as { id: string }).id)
    .eq('slug', input.entrySlug)
    .maybeSingle();
  if (!ent) return { ok: false, code: 'not_found' };
  const entryId = String((ent as { id: string }).id);
  const now = new Date().toISOString();
  const { data: row, error } = await sb
    .from('forum_comments')
    .insert({
      entry_id: entryId,
      author_id: input.authorId,
      author_display: input.authorDisplay,
      parent_comment_id: input.parentCommentId,
      is_entry_seed: false,
      segments: input.segments,
      like_count: 0,
      useful_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();
  if (error || !row) return { ok: false, code: 'not_found' };
  return { ok: true, comment: await mapComment(sb, row as Record<string, unknown>, input.authorId) };
}

export async function forumPgUpdateComment(input: {
  env: Env;
  commentId: string;
  userId: string;
  isAdmin: boolean;
  segments: ForumSegment[];
}): Promise<{ ok: true } | { ok: false; code: 'not_found' | 'forbidden' }> {
  const sb = adminClient(input.env);
  const { data: c } = await sb.from('forum_comments').select('author_id,is_entry_seed').eq('id', input.commentId).maybeSingle();
  if (!c) return { ok: false, code: 'not_found' };
  const row = c as { author_id: string; is_entry_seed: boolean };
  if (!input.isAdmin && row.author_id !== input.userId) return { ok: false, code: 'forbidden' };
  const { error } = await sb
    .from('forum_comments')
    .update({ segments: input.segments, updated_at: new Date().toISOString() })
    .eq('id', input.commentId);
  if (error) return { ok: false, code: 'not_found' };
  return { ok: true };
}

export async function forumPgDeleteComment(input: {
  env: Env;
  commentId: string;
  userId: string;
  isAdmin: boolean;
}): Promise<{ ok: true } | { ok: false; code: 'not_found' | 'forbidden' }> {
  const sb = adminClient(input.env);
  const { data: c } = await sb.from('forum_comments').select('author_id,is_entry_seed').eq('id', input.commentId).maybeSingle();
  if (!c) return { ok: false, code: 'not_found' };
  const row = c as { author_id: string; is_entry_seed: boolean };
  if (row.is_entry_seed) return { ok: false, code: 'forbidden' };
  if (!input.isAdmin && row.author_id !== input.userId) return { ok: false, code: 'forbidden' };
  const { error } = await sb.from('forum_comments').delete().eq('id', input.commentId);
  if (error) return { ok: false, code: 'not_found' };
  return { ok: true };
}

export async function forumPgCommentExists(env: Env, commentId: string): Promise<boolean> {
  const sb = adminClient(env);
  const { data } = await sb.from('forum_comments').select('id').eq('id', commentId).maybeSingle();
  return Boolean(data);
}

export async function forumPgCreateBranch(input: {
  env: Env;
  parentThematicSlug: string;
  parentEntrySlug: string;
  fromCommentId: string;
  authorId: string;
  authorDisplay: string;
  title: string;
  slug: string;
  segments: ForumSegment[];
}): Promise<
  | { ok: true; entry: ForumEntrySummaryDTO }
  | { ok: false; code: 'not_found' | 'conflict'; redirect?: { thematicSlug: string; entrySlug: string } }
> {
  const sb = adminClient(input.env);
  const { data: th } = await sb.from('forum_thematics').select('id,slug').eq('slug', input.parentThematicSlug).maybeSingle();
  if (!th) return { ok: false, code: 'not_found' };
  const { data: parent } = await sb
    .from('forum_entries')
    .select('id')
    .eq('thematic_id', (th as { id: string }).id)
    .eq('slug', input.parentEntrySlug)
    .maybeSingle();
  if (!parent) return { ok: false, code: 'not_found' };
  const parentId = String((parent as { id: string }).id);
  const { data: comment } = await sb
    .from('forum_comments')
    .select('id')
    .eq('id', input.fromCommentId)
    .eq('entry_id', parentId)
    .maybeSingle();
  if (!comment) return { ok: false, code: 'not_found' };
  const { data: existing } = await sb.from('forum_entries').select('slug').eq('branch_from_comment_id', input.fromCommentId).maybeSingle();
  if (existing) {
    return {
      ok: false,
      code: 'conflict',
      redirect: { thematicSlug: input.parentThematicSlug, entrySlug: String((existing as { slug: string }).slug) },
    };
  }
  const thematicId = String((th as { id: string }).id);
  const thSlug = String((th as { slug: string }).slug);
  let slug = input.slug.slice(0, 120);
  let n = 2;
  for (;;) {
    const { data: ex } = await sb.from('forum_entries').select('id').eq('thematic_id', thematicId).eq('slug', slug).maybeSingle();
    if (!ex) break;
    const suffix = `-${n}`;
    slug = `${input.slug.slice(0, Math.max(1, 120 - suffix.length))}${suffix}`;
    n += 1;
  }
  const now = new Date().toISOString();
  const { data: entryRow, error: e1 } = await sb
    .from('forum_entries')
    .insert({
      thematic_id: thematicId,
      slug,
      title_display: input.title,
      author_id: input.authorId,
      author_display: input.authorDisplay,
      parent_entry_id: parentId,
      branch_from_comment_id: input.fromCommentId,
    })
    .select('id')
    .single();
  if (e1 || !entryRow) return { ok: false, code: 'conflict' };
  const newId = String((entryRow as { id: string }).id);
  const { error: e2 } = await sb.from('forum_comments').insert({
    entry_id: newId,
    author_id: input.authorId,
    author_display: input.authorDisplay,
    parent_comment_id: null,
    is_entry_seed: true,
    segments: input.segments,
    like_count: 0,
    useful_count: 0,
    created_at: now,
    updated_at: now,
  });
  if (e2) {
    await sb.from('forum_entries').delete().eq('id', newId);
    return { ok: false, code: 'not_found' };
  }
  const counts = await commentCountsForEntry(sb, newId);
  return {
    ok: true,
    entry: mapEntrySummary({
      id: newId,
      slug,
      title_display: input.title,
      author_id: input.authorId,
      author_display: input.authorDisplay,
      created_at: now,
      parent_entry_id: parentId,
      branch_from_comment_id: input.fromCommentId,
      thematic_slug: thSlug,
      ...counts,
    }),
  };
}

async function refreshLikeCount(sb: SupabaseClient, commentId: string) {
  const { count } = await sb.from('forum_comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', commentId);
  await sb.from('forum_comments').update({ like_count: count ?? 0 }).eq('id', commentId);
}

async function refreshUsefulCount(sb: SupabaseClient, commentId: string) {
  const { count } = await sb.from('forum_comment_useful').select('*', { count: 'exact', head: true }).eq('comment_id', commentId);
  await sb.from('forum_comments').update({ useful_count: count ?? 0 }).eq('id', commentId);
}

export async function forumPgToggleLike(
  env: Env,
  input: { commentId: string; userId: string },
): Promise<{ ok: true; liked: boolean; likeCount: number } | { ok: false }> {
  const sb = adminClient(env);
  const { data: c } = await sb.from('forum_comments').select('id').eq('id', input.commentId).maybeSingle();
  if (!c) return { ok: false };
  const { data: ex } = await sb
    .from('forum_comment_likes')
    .select('comment_id')
    .eq('comment_id', input.commentId)
    .eq('user_id', input.userId)
    .maybeSingle();
  if (ex) {
    await sb.from('forum_comment_likes').delete().eq('comment_id', input.commentId).eq('user_id', input.userId);
  } else {
    await sb.from('forum_comment_likes').insert({ comment_id: input.commentId, user_id: input.userId });
  }
  await refreshLikeCount(sb, input.commentId);
  const { data: row } = await sb.from('forum_comments').select('like_count').eq('id', input.commentId).single();
  const liked = !ex;
  return { ok: true, liked, likeCount: Number((row as { like_count: number })?.like_count ?? 0) };
}

export async function forumPgToggleUseful(
  env: Env,
  input: { commentId: string; userId: string },
): Promise<{ ok: true; useful: boolean; usefulCount: number } | { ok: false }> {
  const sb = adminClient(env);
  const { data: c } = await sb.from('forum_comments').select('id').eq('id', input.commentId).maybeSingle();
  if (!c) return { ok: false };
  const { data: ex } = await sb
    .from('forum_comment_useful')
    .select('comment_id')
    .eq('comment_id', input.commentId)
    .eq('user_id', input.userId)
    .maybeSingle();
  if (ex) {
    await sb.from('forum_comment_useful').delete().eq('comment_id', input.commentId).eq('user_id', input.userId);
  } else {
    await sb.from('forum_comment_useful').insert({ comment_id: input.commentId, user_id: input.userId });
  }
  await refreshUsefulCount(sb, input.commentId);
  const { data: row } = await sb.from('forum_comments').select('useful_count').eq('id', input.commentId).single();
  const useful = !ex;
  return { ok: true, useful, usefulCount: Number((row as { useful_count: number })?.useful_count ?? 0) };
}
