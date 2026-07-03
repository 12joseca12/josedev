import type { Metadata } from "next";
import Link from "next/link";

import { BlogPostCard } from "@/components/blog/blog-post-card";
import { getSupabasePublicServerClient } from "@/lib/supabase/server-public";
import { localizedHref, resolveLocaleParam, t } from "@/services/literals";
import { listPublishedBlogPosts } from "@/services/blog-posts";

export const revalidate = 120;

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  return {
    title: t(locale, "screens.blog.metadataTitle"),
    description: t(locale, "screens.blog.metadataDescription"),
    alternates: {
      canonical: `/${locale}/blog`,
      languages: { es: "/es/blog", en: "/en/blog" },
    },
    openGraph: {
      title: t(locale, "screens.blog.metadataTitle"),
      description: t(locale, "screens.blog.metadataDescription"),
      type: "website",
    },
  };
}

export default async function BlogPage({ params }: PageProps) {
  const locale = resolveLocaleParam((await params).locale);
  const supabaseReady = Boolean(getSupabasePublicServerClient());
  const posts = supabaseReady ? await listPublishedBlogPosts(locale) : [];

  return (
    <main id="main" className="mx-auto w-full max-w-[90rem] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <header className="mx-auto max-w-3xl">
        <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
          {t(locale, "screens.blog.title")}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-on-surface-variant sm:text-base">
          {t(locale, "screens.blog.listIntro")}
        </p>
      </header>

      {!supabaseReady ? (
        <p className="mx-auto mt-12 max-w-3xl rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-6 text-sm text-on-surface-variant">
          {t(locale, "blog.ui.supabaseUnavailable")}
        </p>
      ) : posts.length === 0 ? (
        <p className="mx-auto mt-12 max-w-3xl rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-6 text-sm text-on-surface-variant">
          {t(locale, "blog.ui.emptyList")}
        </p>
      ) : (
        <div className="mx-auto mt-12 grid max-w-3xl gap-6">
          {posts.map((post) => (
            <BlogPostCard key={post.id} locale={locale} post={post} />
          ))}
        </div>
      )}
      <p className="mx-auto mt-10 max-w-3xl text-center">
        <Link href={localizedHref(locale, "/")} className="text-sm font-semibold text-primary hover:underline">
          {t(locale, "nav.home")}
        </Link>
      </p>
    </main>
  );
}
