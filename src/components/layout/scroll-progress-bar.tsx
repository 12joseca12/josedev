"use client";

import { useEffect, useRef, useState } from "react";

import { ScrollProgressIndicator } from "@/components/layout/scroll-progress-indicator";

function readScrollProgress(): { progress: number; hasOverflow: boolean } {
  const el = document.documentElement;
  const scrollTop = window.scrollY ?? el.scrollTop;
  const client = el.clientHeight;
  const scrollable = el.scrollHeight - client;
  if (scrollable <= 1) {
    return { progress: 0, hasOverflow: false };
  }
  return {
    progress: Math.min(1, Math.max(0, scrollTop / scrollable)),
    hasOverflow: true,
  };
}

/**
 * Indicador fijo de progreso de lectura (sustituye la percepción de la scrollbar del viewport).
 * Decorativo: `aria-hidden`; el scroll sigue siendo nativo con scrollbar oculta vía CSS global.
 */
export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const flush = () => {
      rafRef.current = 0;
      const { progress: p, hasOverflow: h } = readScrollProgress();
      setProgress(p);
      setHasOverflow(h);
    };

    const schedule = () => {
      if (rafRef.current !== 0) return;
      rafRef.current = requestAnimationFrame(flush);
    };

    flush();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(document.documentElement);
    ro?.observe(document.body);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro?.disconnect();
      if (rafRef.current !== 0) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <ScrollProgressIndicator
      orientation="horizontal"
      progress={progress}
      hasOverflow={hasOverflow}
      className="fixed left-0 right-0 top-0 z-scroll-progress"
    />
  );
}
