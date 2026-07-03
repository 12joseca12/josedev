import Link from "next/link";
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
    <article className="rounded-2xl border border-outline-variant/25 bg-surface-container-low/40 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] transition-colors hover:border-primary/30">
      <time className="font-label text-[10px] uppercase tracking-widest text-outline" dateTime={post.publishedAt ?? undefined}>
        {dateLabel}
      </time>
      <h2 className="mt-2 font-headline text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
        <Link href={localizedHref(locale, `/blog/${encodeURIComponent(post.slug)}`)} className="text-on-surface hover:text-primary">
          {post.title}
        </Link>
      </h2>
      {post.excerpt ? <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{post.excerpt}</p> : null}
      <p className="mt-4">
        <Link
          href={localizedHref(locale, `/blog/${encodeURIComponent(post.slug)}`)}
          className="inline-flex text-sm font-semibold text-primary hover:underline"
          aria-label={`${t(locale, "blog.ui.readArticleAria")}: ${post.title}`}
        >
          {t(locale, "blog.ui.readMore")}
        </Link>
      </p>
    </article>
  );
}
