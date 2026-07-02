import { z } from 'zod';
import { slugFromTitleNoSpaces } from '../utils/forum-slug';

const segmentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    content: z.string().max(20_000),
  }),
  z.object({
    type: z.literal('code'),
    content: z.string().max(30_000),
    language: z.string().max(32).optional(),
  }),
]);

export const forumSegmentsSchema = z.array(segmentSchema).min(1).max(80);

/** Slug de entrada o rama: minúsculas, números y guiones (alineado con `slug` de creación de hilo). */
export const forumEntrySlugFieldSchema = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/);

const newThematicInputSchema = z.object({
  titleDisplay: z.string().min(1).max(120),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9]+$/).optional(),
  descriptionDisplay: z.string().max(500).optional(),
});

function preprocessForumCreateEntry(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  const o = { ...(raw as Record<string, unknown>) };
  if (typeof o.thematicSlug === 'string' && o.thematicSlug.trim() === '') {
    delete o.thematicSlug;
  }
  const nt = o.newThematic;
  if (nt && typeof nt === 'object') {
    const n = { ...(nt as Record<string, unknown>) };
    const title = typeof n.titleDisplay === 'string' ? n.titleDisplay : '';
    if (!n.slug || (typeof n.slug === 'string' && n.slug.trim() === '')) {
      n.slug = slugFromTitleNoSpaces(title, 80);
    }
    o.newThematic = n;
  }
  return o;
}

export const forumCreateEntrySchema = z.preprocess(
  preprocessForumCreateEntry,
  z
    .object({
      thematicSlug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
      newThematic: newThematicInputSchema.optional(),
      slug: forumEntrySlugFieldSchema,
      title: z.string().min(1).max(200),
      segments: forumSegmentsSchema,
    })
    .superRefine((data, ctx) => {
      const hasSlug = Boolean(data.thematicSlug);
      const hasNew = Boolean(data.newThematic);
      if (hasSlug === hasNew) {
        ctx.addIssue({
          code: 'custom',
          message: 'Exactly one of thematicSlug or newThematic is required',
          path: ['thematicSlug'],
        });
      }
    }),
);

export const forumCreateCommentSchema = z.object({
  segments: forumSegmentsSchema,
  parentCommentId: z.string().uuid().nullable().optional(),
});

export const forumBranchBodySchema = z.object({
  title: z.string().min(1).max(200),
  slug: forumEntrySlugFieldSchema,
  segments: forumCreateCommentSchema.shape.segments,
});

export const forumUpdateCommentSchema = z.object({
  segments: forumSegmentsSchema,
});

export function sanitizeSegments(
  segments: z.infer<typeof forumSegmentsSchema>,
): z.infer<typeof forumSegmentsSchema> {
  return segments.map((s) => {
    const strip = (t: string) => t.replace(/\u0000/g, '');
    if (s.type === 'text') return { type: 'text', content: strip(s.content) };
    return {
      type: 'code',
      content: strip(s.content),
      language: s.language ? strip(s.language) : undefined,
    };
  });
}
