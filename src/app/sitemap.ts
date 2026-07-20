import type { MetadataRoute } from "next";

import { SUPPORTED_LOCALES } from "@/services/literals";
import { listPublishedBlogSlugs } from "@/services/blog-posts";
import { getSupabasePublicServerClient } from "@/lib/supabase/server-public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // P4 SEO fix (review): must match the fallback in layout.tsx + robots.ts —
  // an unset env var in prod used to leak localhost URLs into the sitemap.
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://josecoded.com").replace(/\/$/, "");
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of SUPPORTED_LOCALES) {
    entries.push(
      { url: `${base}/${locale}`, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
      { url: `${base}/${locale}/sobre-mi`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
      { url: `${base}/${locale}/services`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
      { url: `${base}/${locale}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
      { url: `${base}/${locale}/foro`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    );
  }

  if (!getSupabasePublicServerClient()) return entries;

  for (const locale of SUPPORTED_LOCALES) {
    const slugs = await listPublishedBlogSlugs(locale);
    for (const slug of slugs) {
      entries.push({
        url: `${base}/${locale}/blog/${encodeURIComponent(slug)}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.75,
      });
    }
  }
  return entries;
}
