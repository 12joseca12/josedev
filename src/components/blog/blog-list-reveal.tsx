"use client";

import { BlogPostCard } from "@/components/blog/blog-post-card";
import { useScrollReveal } from "@/components/portfolio/use-scroll-reveal";
import type { BlogPostListItemDTO, Locale } from "@/lib/types";

type Props = {
  locale: Locale;
  posts: BlogPostListItemDTO[];
};

/**
 * DESIGN.md Motion: reveal sutil (fade + rise) de la lista de entradas al
 * entrar en viewport. Reusa `useScrollReveal` (creado en WS2) en vez de
 * duplicar lógica de ScrollTrigger — gateado por `prefers-reduced-motion`
 * dentro del hook, `once: true`.
 */
export function BlogListReveal({ locale, posts }: Props) {
  const revealRef = useScrollReveal<HTMLDivElement>();

  return (
    <div ref={revealRef} className="mx-auto mt-12 grid max-w-3xl gap-6">
      {posts.map((post) => (
        <BlogPostCard key={post.id} locale={locale} post={post} />
      ))}
    </div>
  );
}
