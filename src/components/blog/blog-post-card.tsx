import Link from "next/link";
import { BlogTagChips } from "@/components/blog/blog-tag-chips";
import type { BlogPostListItemDTO, Locale } from "@/lib/types";
import { localizedHref, t } from "@/services/literals";

type Props = {
  locale: Locale;
  post: BlogPostListItemDTO;
};

function formatPublished(locale: Locale, iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function BlogPostCard({ locale, post }: Props) {
  const dateLabel = formatPublished(locale, post.publishedAt);
  return (
    <article className="rounded-md border border-dash-border bg-dash-surface p-6 transition-colors hover:border-dash-accent/60 sm:p-8">
      <time className="font-dash-sans text-[10px] uppercase tracking-widest text-dash-muted" dateTime={post.publishedAt ?? undefined}>
        {dateLabel}
      </time>
      <h2 className="mt-2 font-headline text-xl font-bold tracking-tight text-dash-text sm:text-2xl">
        <Link href={localizedHref(locale, `/blog/${encodeURIComponent(post.slug)}`)} className="text-dash-text hover:text-dash-accent-text">
          {post.title}
        </Link>
      </h2>
      {post.excerpt ? <p className="mt-3 text-sm leading-relaxed text-dash-muted">{post.excerpt}</p> : null}
      <BlogTagChips tags={post.tags} />
      <p className="mt-4">
        <Link
          href={localizedHref(locale, `/blog/${encodeURIComponent(post.slug)}`)}
          className="inline-flex text-sm font-semibold text-dash-accent-text hover:underline"
          aria-label={`${t(locale, "blog.ui.readArticleAria")}: ${post.title}`}
        >
          {t(locale, "blog.ui.readMore")}
        </Link>
      </p>
    </article>
  );
}
