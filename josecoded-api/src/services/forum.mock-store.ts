import type {
  ForumBranchLinkDTO,
  ForumCommentDTO,
  ForumEntryDetailDTO,
  ForumEntrySummaryDTO,
  ForumParticipantDTO,
  ForumSegment,
  ForumThematicDTO,
} from '../types/forum.types';

const USER_ALEX = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const USER_CHEN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';

type InternalEntry = ForumEntrySummaryDTO & {
  bodyKey: string;
};

type InternalComment = Omit<ForumCommentDTO, 'likedByMe' | 'usefulByMe'>;

type LikeRow = { commentId: string; userId: string };
type UsefulRow = { commentId: string; userId: string };

type State = {
  thematics: ForumThematicDTO[];
  entries: InternalEntry[];
  comments: InternalComment[];
  likes: LikeRow[];
  useful: UsefulRow[];
};

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

const SEED: State = {
  thematics: [
    {
      id: 't1111111-1111-4111-8111-111111111111',
      slug: 'architecture',
      titleKey: 'forum.thematics.architecture.title',
      descriptionKey: 'forum.thematics.architecture.description',
    },
    {
      id: 't2222222-2222-4222-8222-222222222222',
      slug: 'infrastructure',
      titleKey: 'forum.thematics.infrastructure.title',
      descriptionKey: 'forum.thematics.infrastructure.description',
    },
  ],
  entries: [
    {
      id: 'e1000000-0000-4000-8000-000000000001',
      thematicSlug: 'architecture',
      slug: 'rfc-distributed-cache',
      titleKey: 'forum.entries.rfcDistributedCache.title',
      authorId: USER_ALEX,
      authorDisplayKey: 'forum.participants.alex',
      commentCount: 0,
      likeCount: 0,
      usefulCount: 0,
      createdAt: new Date(Date.now() - 3_600_000).toISOString(),
      parentEntryId: null,
      branchFromCommentId: null,
      bodyKey: 'forum.entries.rfcDistributedCache.body',
    },
    {
      id: 'e1000000-0000-4000-8000-000000000002',
      thematicSlug: 'architecture',
      slug: 'branch-from-c2',
      titleKey: 'forum.entries.branchFromC2.title',
      authorId: USER_CHEN,
      authorDisplayKey: 'forum.participants.chen',
      commentCount: 0,
      likeCount: 0,
      usefulCount: 0,
      createdAt: new Date(Date.now() - 1_800_000).toISOString(),
      parentEntryId: 'e1000000-0000-4000-8000-000000000001',
      branchFromCommentId: 'c2000000-0000-4000-8000-000000000002',
      bodyKey: 'forum.entries.branchFromC2.body',
    },
    {
      id: 'e2000000-0000-4000-8000-000000000001',
      thematicSlug: 'infrastructure',
      slug: 'observability-basics',
      titleKey: 'forum.entries.observabilityBasics.title',
      authorId: USER_CHEN,
      authorDisplayKey: 'forum.participants.chen',
      commentCount: 0,
      likeCount: 0,
      usefulCount: 0,
      createdAt: new Date(Date.now() - 900_000).toISOString(),
      parentEntryId: null,
      branchFromCommentId: null,
      bodyKey: 'forum.entries.observabilityBasics.body',
    },
  ],
  comments: [
    {
      id: 'c2000000-0000-4000-8000-000000000001',
      entryId: 'e1000000-0000-4000-8000-000000000001',
      authorId: USER_ALEX,
      authorDisplayKey: 'forum.participants.alex',
      parentCommentId: null,
      isEntrySeed: true,
      createdAt: new Date(Date.now() - 3_500_000).toISOString(),
      updatedAt: new Date(Date.now() - 3_500_000).toISOString(),
      likeCount: 4,
      usefulCount: 2,
      segments: [
        {
          type: 'text',
          content:
            'Current state: invalidación distribuida genera picos de carga. Proposal: ventana de coalescing + versionado por shard.',
        },
        {
          type: 'code',
          language: 'rust',
          content:
            'fn invalidate(keys: &[Key]) -> Result<()> {\n-  broadcast(keys)?;\n+  coalesce(keys, WINDOW)?;\n   Ok(())\n}',
        },
      ],
    },
    {
      id: 'c2000000-0000-4000-8000-000000000002',
      entryId: 'e1000000-0000-4000-8000-000000000001',
      authorId: USER_CHEN,
      authorDisplayKey: 'forum.participants.chen',
      parentCommentId: null,
      isEntrySeed: false,
      createdAt: new Date(Date.now() - 3_000_000).toISOString(),
      updatedAt: new Date(Date.now() - 3_000_000).toISOString(),
      likeCount: 6,
      usefulCount: 5,
      segments: [
        {
          type: 'text',
          content:
            'Propongo mover la invalidación a cola asíncrona; adjunto diff conceptual. Esto debería ramificarse a un RFC de despliegue.',
        },
      ],
    },
    {
      id: 'c2000000-0000-4000-8000-000000000003',
      entryId: 'e1000000-0000-4000-8000-000000000001',
      authorId: USER_ALEX,
      authorDisplayKey: 'forum.participants.alex',
      parentCommentId: 'c2000000-0000-4000-8000-000000000002',
      isEntrySeed: false,
      createdAt: new Date(Date.now() - 2_500_000).toISOString(),
      updatedAt: new Date(Date.now() - 2_500_000).toISOString(),
      likeCount: 1,
      usefulCount: 0,
      segments: [{ type: 'text', content: 'De acuerdo; medimos p99 antes/después en staging.' }],
    },
    {
      id: 'c3000000-0000-4000-8000-000000000001',
      entryId: 'e2000000-0000-4000-8000-000000000001',
      authorId: USER_CHEN,
      authorDisplayKey: 'forum.participants.chen',
      parentCommentId: null,
      isEntrySeed: true,
      createdAt: new Date(Date.now() - 800_000).toISOString(),
      updatedAt: new Date(Date.now() - 800_000).toISOString(),
      likeCount: 0,
      usefulCount: 0,
      segments: [{ type: 'text', content: 'Hilo inicial: métricas RED + trazas correlacionadas por request_id.' }],
    },
    {
      id: 'c4000000-0000-4000-8000-000000000001',
      entryId: 'e1000000-0000-4000-8000-000000000002',
      authorId: USER_CHEN,
      authorDisplayKey: 'forum.participants.chen',
      parentCommentId: null,
      isEntrySeed: true,
      createdAt: new Date(Date.now() - 1_700_000).toISOString(),
      updatedAt: new Date(Date.now() - 1_700_000).toISOString(),
      likeCount: 0,
      usefulCount: 0,
      segments: [
        {
          type: 'text',
          content: 'Rama creada desde el comentario de cola asíncrona: foco en rollout y feature flags.',
        },
      ],
    },
  ],
  likes: [{ commentId: 'c2000000-0000-4000-8000-000000000001', userId: USER_CHEN }],
  useful: [
    { commentId: 'c2000000-0000-4000-8000-000000000002', userId: USER_ALEX },
    { commentId: 'c2000000-0000-4000-8000-000000000002', userId: USER_CHEN },
  ],
};

let state: State = deepClone(SEED);

function recomputeAggregates(): void {
  for (const e of state.entries) {
    const cs = state.comments.filter((c) => c.entryId === e.id);
    e.commentCount = cs.length;
    e.likeCount = cs.reduce((s, c) => s + c.likeCount, 0);
    e.usefulCount = cs.reduce((s, c) => s + c.usefulCount, 0);
  }
}

recomputeAggregates();

function toCommentDTO(c: InternalComment, userId: string | undefined): ForumCommentDTO {
  return {
    ...c,
    likedByMe: Boolean(userId && state.likes.some((l) => l.commentId === c.id && l.userId === userId)),
    usefulByMe: Boolean(userId && state.useful.some((u) => u.commentId === c.id && u.userId === userId)),
  };
}

function entrySummary(e: InternalEntry): ForumEntrySummaryDTO {
  const { bodyKey: _b, ...rest } = e;
  return rest;
}

export function forumResetMock(): void {
  state = deepClone(SEED);
  recomputeAggregates();
}

export function forumListThematics(): ForumThematicDTO[] {
  return [...state.thematics].sort((a, b) => a.slug.localeCompare(b.slug));
}

export function forumListEntries(
  thematicSlug: string,
  opts?: { limit?: number; offset?: number },
): ForumEntrySummaryDTO[] | null {
  const th = state.thematics.find((t) => t.slug === thematicSlug);
  if (!th) return null;
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 50));
  const offset = Math.max(0, opts?.offset ?? 0);
  const list = state.entries
    .filter((e) => e.thematicSlug === thematicSlug && !e.parentEntryId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(offset, offset + limit)
    .map(entrySummary);
  return list;
}

export function forumPopular(limit: number, offset = 0): ForumEntrySummaryDTO[] {
  const mains = state.entries.filter((e) => !e.parentEntryId);
  const scored = mains.map((e) => ({
    e,
    score: e.commentCount * 2 + e.likeCount,
  }));
  scored.sort((a, b) => b.score - a.score || b.e.createdAt.localeCompare(a.e.createdAt));
  return scored.slice(offset, offset + limit).map((x) => entrySummary(x.e));
}

export function forumSearch(
  qRaw: string,
  opts?: { limit?: number },
): { thematics: ForumThematicDTO[]; entries: ForumEntrySummaryDTO[] } {
  const q = qRaw.trim().toLowerCase();
  const lim = Math.min(80, Math.max(1, opts?.limit ?? 40));
  if (!q) return { thematics: [], entries: [] };
  const thematics = state.thematics.filter((t) => {
    const slug = t.slug.toLowerCase();
    const key = (t.titleKey ?? '').toLowerCase();
    const disp = (t.titleDisplay ?? '').toLowerCase();
    const desc = (t.descriptionDisplay ?? '').toLowerCase();
    return slug.includes(q) || key.includes(q) || disp.includes(q) || desc.includes(q);
  });
  const keys = new Set<string>();
  const entries: ForumEntrySummaryDTO[] = [];
  for (const e of state.entries) {
    const hay = `${e.slug} ${e.titleKey ?? ""} ${e.titleDisplay ?? ""}`.toLowerCase();
    if (hay.includes(q)) {
      entries.push(entrySummary(e));
      keys.add(e.id);
    }
  }
  for (const c of state.comments) {
    const text = c.segments
      .map((s) => (s.type === 'text' || s.type === 'code' ? s.content : ''))
      .join('\n')
      .toLowerCase();
    if (text.includes(q)) {
      const en = state.entries.find((x) => x.id === c.entryId);
      if (en && !keys.has(en.id)) {
        entries.push(entrySummary(en));
        keys.add(en.id);
      }
    }
  }
  return { thematics: thematics.slice(0, lim), entries: entries.slice(0, lim) };
}

export function forumGetEntry(
  thematicSlug: string,
  entrySlug: string,
  userId: string | undefined,
): ForumEntryDetailDTO | null {
  const e = state.entries.find((x) => x.thematicSlug === thematicSlug && x.slug === entrySlug);
  if (!e) return null;
  const comments = state.comments
    .filter((c) => c.entryId === e.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((c) => toCommentDTO(c, userId));

  const usefulIds = new Set(state.useful.map((u) => u.commentId));
  const usefulHighlights = comments.filter((c) => usefulIds.has(c.id) && !c.isEntrySeed);

  const branches: ForumBranchLinkDTO[] = state.entries
    .filter((x) => x.parentEntryId === e.id && x.branchFromCommentId)
    .map((x) => ({
      entryId: x.id,
      slug: x.slug,
      thematicSlug: x.thematicSlug,
      fromCommentId: x.branchFromCommentId as string,
      labelKey: 'forum.branch.label',
    }));

  const participantMap = new Map<string, ForumParticipantDTO>();
  for (const c of comments) {
    const role: 'author' | 'participant' = c.authorId === e.authorId ? 'author' : 'participant';
    const prev = participantMap.get(c.authorId);
    if (!prev || role === 'author') {
      const displayName = c.authorDisplay?.trim();
      participantMap.set(c.authorId, {
        userId: c.authorId,
        ...(displayName ? { displayName } : {}),
        ...(!displayName && c.authorDisplayKey ? { displayKey: c.authorDisplayKey } : {}),
        role: c.authorId === e.authorId ? 'author' : 'participant',
      });
    }
  }
  const authorEntry = state.entries.find((x) => x.id === e.id);
  if (authorEntry) {
    const displayName = authorEntry.authorDisplay?.trim();
    participantMap.set(authorEntry.authorId, {
      userId: authorEntry.authorId,
      ...(displayName ? { displayName } : {}),
      ...(!displayName && authorEntry.authorDisplayKey ? { displayKey: authorEntry.authorDisplayKey } : {}),
      role: 'author',
    });
  }
  const participants = [...participantMap.values()].sort((a, b) => {
    if (a.role === 'author') return -1;
    if (b.role === 'author') return 1;
    const la = (a.displayName ?? a.displayKey ?? '').toString();
    const lb = (b.displayName ?? b.displayKey ?? '').toString();
    return la.localeCompare(lb);
  });

  return {
    entry: { ...entrySummary(e), bodyPreviewKey: e.bodyKey },
    comments,
    usefulHighlights,
    branches,
    participants,
    canModerate: false,
  };
}

function uniqueEntrySlug(thematicSlug: string, base: string): string {
  let candidate = base.slice(0, 120);
  let n = 2;
  while (state.entries.some((e) => e.thematicSlug === thematicSlug && e.slug === candidate)) {
    const suffix = `-${n}`;
    candidate = `${base.slice(0, Math.max(1, 120 - suffix.length))}${suffix}`;
    n += 1;
  }
  return candidate;
}

export function forumCreateEntry(input: {
  thematicSlug?: string;
  newThematic?: { slug: string; titleDisplay: string; descriptionDisplay?: string };
  slug: string;
  title: string;
  segments: ForumSegment[];
  authorId: string;
  authorDisplay: string;
}): { ok: true; entry: ForumEntrySummaryDTO } | { ok: false; code: 'not_found' | 'conflict_thematic' } {
  let thematicSlug = input.thematicSlug;
  if (input.newThematic) {
    const { slug: thSlug, titleDisplay, descriptionDisplay } = input.newThematic;
    if (state.thematics.some((t) => t.slug === thSlug)) {
      return { ok: false, code: 'conflict_thematic' };
    }
    state.thematics.push({
      id: crypto.randomUUID(),
      slug: thSlug,
      titleDisplay,
      descriptionDisplay: descriptionDisplay?.trim() || undefined,
    });
    thematicSlug = thSlug;
  }
  if (!thematicSlug) return { ok: false, code: 'not_found' };
  const th = state.thematics.find((t) => t.slug === thematicSlug);
  if (!th) return { ok: false, code: 'not_found' };

  const entrySlug = uniqueEntrySlug(thematicSlug, input.slug);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const entry: InternalEntry = {
    id,
    thematicSlug,
    slug: entrySlug,
    titleDisplay: input.title,
    authorId: input.authorId,
    authorDisplay: input.authorDisplay,
    commentCount: 1,
    likeCount: 0,
    usefulCount: 0,
    createdAt: now,
    parentEntryId: null,
    branchFromCommentId: null,
    bodyKey: '',
  };
  state.entries.push(entry);
  state.comments.push({
    id: crypto.randomUUID(),
    entryId: id,
    authorId: input.authorId,
    authorDisplay: input.authorDisplay,
    parentCommentId: null,
    isEntrySeed: true,
    createdAt: now,
    updatedAt: now,
    likeCount: 0,
    usefulCount: 0,
    segments: input.segments,
  });
  recomputeAggregates();
  return { ok: true, entry: entrySummary(entry) };
}

export function forumAddComment(input: {
  thematicSlug: string;
  entrySlug: string;
  authorId: string;
  authorDisplay: string;
  segments: ForumSegment[];
  parentCommentId: string | null;
}): { ok: true; comment: ForumCommentDTO } | { ok: false; code: 'not_found' } {
  const e = state.entries.find((x) => x.thematicSlug === input.thematicSlug && x.slug === input.entrySlug);
  if (!e) return { ok: false, code: 'not_found' };
  const now = new Date().toISOString();
  const c: InternalComment = {
    id: crypto.randomUUID(),
    entryId: e.id,
    authorId: input.authorId,
    authorDisplay: input.authorDisplay,
    parentCommentId: input.parentCommentId,
    isEntrySeed: false,
    createdAt: now,
    updatedAt: now,
    likeCount: 0,
    usefulCount: 0,
    segments: input.segments,
  };
  state.comments.push(c);
  recomputeAggregates();
  return { ok: true, comment: toCommentDTO(c, input.authorId) };
}

export function forumUpdateComment(input: {
  commentId: string;
  userId: string;
  isAdmin: boolean;
  segments: ForumSegment[];
}): { ok: true } | { ok: false; code: 'not_found' | 'forbidden' } {
  const c = state.comments.find((x) => x.id === input.commentId);
  if (!c) return { ok: false, code: 'not_found' };
  if (!input.isAdmin && c.authorId !== input.userId) return { ok: false, code: 'forbidden' };
  c.segments = input.segments;
  c.updatedAt = new Date().toISOString();
  return { ok: true };
}

export function forumDeleteComment(input: {
  commentId: string;
  userId: string;
  isAdmin: boolean;
}): { ok: true } | { ok: false; code: 'not_found' | 'forbidden' } {
  const c = state.comments.find((x) => x.id === input.commentId);
  if (!c) return { ok: false, code: 'not_found' };
  if (c.isEntrySeed) return { ok: false, code: 'forbidden' };
  if (!input.isAdmin && c.authorId !== input.userId) return { ok: false, code: 'forbidden' };
  state.comments = state.comments.filter((x) => x.id !== input.commentId && x.parentCommentId !== input.commentId);
  state.likes = state.likes.filter((l) => l.commentId !== input.commentId);
  state.useful = state.useful.filter((u) => u.commentId !== input.commentId);
  recomputeAggregates();
  return { ok: true };
}

export function forumCommentExists(commentId: string): boolean {
  return state.comments.some((x) => x.id === commentId);
}

export function forumToggleLike(
  input: { commentId: string; userId: string },
): { ok: true; liked: boolean; likeCount: number } | { ok: false } {
  const c = state.comments.find((x) => x.id === input.commentId);
  if (!c) return { ok: false };
  const idx = state.likes.findIndex((l) => l.commentId === input.commentId && l.userId === input.userId);
  if (idx >= 0) {
    state.likes.splice(idx, 1);
    c.likeCount = Math.max(0, c.likeCount - 1);
  } else {
    state.likes.push({ commentId: input.commentId, userId: input.userId });
    c.likeCount += 1;
  }
  recomputeAggregates();
  return { ok: true, liked: idx < 0, likeCount: c.likeCount };
}

export function forumToggleUseful(
  input: { commentId: string; userId: string },
): { ok: true; useful: boolean; usefulCount: number } | { ok: false } {
  const c = state.comments.find((x) => x.id === input.commentId);
  if (!c) return { ok: false };
  const idx = state.useful.findIndex((u) => u.commentId === input.commentId && u.userId === input.userId);
  if (idx >= 0) {
    state.useful.splice(idx, 1);
    c.usefulCount = Math.max(0, c.usefulCount - 1);
  } else {
    state.useful.push({ commentId: input.commentId, userId: input.userId });
    c.usefulCount += 1;
  }
  recomputeAggregates();
  return { ok: true, useful: idx < 0, usefulCount: c.usefulCount };
}

export function forumCreateBranch(input: {
  parentThematicSlug: string;
  parentEntrySlug: string;
  fromCommentId: string;
  authorId: string;
  authorDisplay: string;
  title: string;
  slug: string;
  segments: ForumSegment[];
}):
  | { ok: true; entry: ForumEntrySummaryDTO }
  | { ok: false; code: 'not_found' | 'conflict'; redirect?: { thematicSlug: string; entrySlug: string } } {
  const parent = state.entries.find(
    (x) => x.thematicSlug === input.parentThematicSlug && x.slug === input.parentEntrySlug,
  );
  if (!parent) return { ok: false, code: 'not_found' };
  const comment = state.comments.find((c) => c.id === input.fromCommentId && c.entryId === parent.id);
  if (!comment) return { ok: false, code: 'not_found' };
  const existing = state.entries.find((e) => e.branchFromCommentId === input.fromCommentId);
  if (existing) {
    return {
      ok: false,
      code: 'conflict',
      redirect: { thematicSlug: existing.thematicSlug, entrySlug: existing.slug },
    };
  }
  if (state.entries.some((e) => e.thematicSlug === parent.thematicSlug && e.slug === input.slug)) {
    return { ok: false, code: 'conflict' };
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const entry: InternalEntry = {
    id,
    thematicSlug: parent.thematicSlug,
    slug: input.slug,
    titleDisplay: input.title,
    authorId: input.authorId,
    authorDisplay: input.authorDisplay,
    commentCount: 1,
    likeCount: 0,
    usefulCount: 0,
    createdAt: now,
    parentEntryId: parent.id,
    branchFromCommentId: input.fromCommentId,
    bodyKey: '',
  };
  state.entries.push(entry);
  state.comments.push({
    id: crypto.randomUUID(),
    entryId: id,
    authorId: input.authorId,
    authorDisplay: input.authorDisplay,
    parentCommentId: null,
    isEntrySeed: true,
    createdAt: now,
    updatedAt: now,
    likeCount: 0,
    usefulCount: 0,
    segments: input.segments,
  });
  recomputeAggregates();
  return { ok: true, entry: entrySummary(entry) };
}

export function forumIsAdmin(userId: string, adminIds: string[]): boolean {
  return adminIds.includes(userId);
}
