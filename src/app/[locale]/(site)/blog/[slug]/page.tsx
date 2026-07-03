import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogMarkdown } from "@/components/blog/blog-markdown";
import { getSupabasePublicServerClient } from "@/lib/supabase/server-public";
import type { Locale } from "@/lib/types";
import { SUPPORTED_LOCALES, localizedHref, resolveLocaleParam, t } from "@/services/literals";
import { getPublishedBlogPostBySlug, listPublishedBlogSlugs } from "@/services/blog-posts";

export const revalidate = 120;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams(): Promise<{ locale: Locale; slug: string }[]> {
  if (!getSupabasePublicServerClient()) return [];
  const perLocale = await Promise.all(
    SUPPORTED_LOCALES.map(async (locale) => {
      const slugs = await listPublishedBlogSlugs(locale);
      return slugs.map((slug) => ({ locale, slug }));
    }),
  );
  return perLocale.flat();
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await props.params;
  const locale = resolveLocaleParam(rawLocale);
  const post = await getPublishedBlogPostBySlug(locale, slug);
  if (!post) {
    return {
      title: t(locale, "blog.ui.postNotFoundTitle"),
      description: t(locale, "blog.ui.postNotFoundBody"),
      robots: { index: false, follow: true },
    };
  }
  const description = post.excerpt?.trim() || post.title;
  return {
    title: post.title,
    description,
    alternates: { canonical: `/${locale}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
    },
  };
}

function formatPublished(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export default async function BlogArticlePage(props: PageProps) {
  const { locale: rawLocale, slug } = await props.params;
  const locale = resolveLocaleParam(rawLocale);
  const post = await getPublishedBlogPostBySlug(locale, slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    inLanguage: post.locale,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Person",
      name: t(locale, "blog.ui.jsonLdAuthorName"),
    },
  };

  return (
    <main id="main" className="mx-auto w-full max-w-content px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <article className="mx-auto max-w-3xl">
        <nav aria-label={t(locale, "blog.ui.backToIndex")} className="font-label text-[10px] uppercase tracking-widest text-outline">
          <Link href={localizedHref(locale, "/blog")} className="text-primary hover:underline">
            {t(locale, "blog.ui.backToIndex")}
          </Link>
          <span aria-hidden className="mx-2 text-outline-variant">
            /
          </span>
          <span className="text-on-surface-variant">{post.slug}</span>
        </nav>
        <header className="mt-6 border-b border-outline-variant/20 pb-8">
          <p className="font-label text-[10px] uppercase tracking-widest text-outline">{t(locale, "blog.ui.articleLabel")}</p>
          <h1 className="mt-2 font-headline text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">{post.title}</h1>
          {post.excerpt ? <p className="mt-4 text-lg text-on-surface-variant">{post.excerpt}</p> : null}
          <time className="mt-4 block text-sm text-outline" dateTime={post.publishedAt ?? undefined}>
            {formatPublished(post.publishedAt, locale)}
          </time>
        </header>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          suppressHydrationWarning
        />
        <div className="pt-10">
          <BlogMarkdown markdown={post.bodyMd} />
        </div>
      </article>
    </main>
  );
}
