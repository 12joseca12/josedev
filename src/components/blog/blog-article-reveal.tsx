"use client";

import type { ReactNode } from "react";

import { useScrollReveal } from "@/components/portfolio/use-scroll-reveal";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * DESIGN.md Motion: reveal sutil del cuerpo del artículo al entrar en
 * viewport. Reusa `useScrollReveal` (WS2) en vez de duplicar ScrollTrigger —
 * gateado por `prefers-reduced-motion`, `once: true`.
 */
export function BlogArticleReveal({ children, className }: Props) {
  const revealRef = useScrollReveal<HTMLDivElement>();

  return (
    <div ref={revealRef} className={className}>
      {children}
    </div>
  );
}
