import type { BlogPostDetailDTO, BlogPostListItemDTO, BlogPostStatus, Locale } from "@/lib/types";
import { getSupabasePublicServerClient } from "@/lib/supabase/server-public";

const LIST_COLUMNS = "id, slug, locale, title, excerpt, body_md, status, published_at, updated_at, tags";

type BlogPostRow = {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  status: string;
  published_at: string | null;
  updated_at: string;
  tags: string[] | null;
};

function toListItem(row: BlogPostRow): BlogPostListItemDTO {
  return {
    id: row.id,
    slug: row.slug,
    locale: row.locale as Locale,
    title: row.title,
    excerpt: row.excerpt,
    publishedAt: row.published_at,
    tags: row.tags ?? [],
  };
}

function toDetail(row: BlogPostRow): BlogPostDetailDTO {
  return {
    ...toListItem(row),
    bodyMd: row.body_md,
    status: row.status as BlogPostStatus,
    updatedAt: row.updated_at,
  };
}

export async function listPublishedBlogPosts(locale: Locale): Promise<BlogPostListItemDTO[]> {
  const sb = getSupabasePublicServerClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("blog_posts")
    .select(LIST_COLUMNS)
    .eq("locale", locale)
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });
  if (error || !data) return [];
  return (data as BlogPostRow[]).map(toListItem);
}

export async function getPublishedBlogPostBySlug(
  locale: Locale,
  slug: string,
): Promise<BlogPostDetailDTO | null> {
  const sb = getSupabasePublicServerClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("blog_posts")
    .select(LIST_COLUMNS)
    .eq("locale", locale)
    .eq("slug", slug)
    .eq("status", "published")
    .not("published_at", "is", null)
    .maybeSingle();
  if (error || !data) return null;
  return toDetail(data as BlogPostRow);
}

export async function listPublishedBlogSlugs(locale: Locale): Promise<string[]> {
  const sb = getSupabasePublicServerClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("blog_posts")
    .select("slug")
    .eq("locale", locale)
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });
  if (error || !data) return [];
  return (data as { slug: string }[]).map((r) => r.slug);
}

/** Otros posts publicados que comparten al menos una etiqueta con `tags`, excluyendo `excludeSlug`. */
export async function listRelatedBlogPosts(
  locale: Locale,
  tags: string[],
  excludeSlug: string,
  limit = 3,
): Promise<BlogPostListItemDTO[]> {
  const sb = getSupabasePublicServerClient();
  if (!sb || tags.length === 0) return [];
  const { data, error } = await sb
    .from("blog_posts")
    .select(LIST_COLUMNS)
    .eq("locale", locale)
    .eq("status", "published")
    .not("published_at", "is", null)
    .neq("slug", excludeSlug)
    .overlaps("tags", tags)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as BlogPostRow[]).map(toListItem);
}
