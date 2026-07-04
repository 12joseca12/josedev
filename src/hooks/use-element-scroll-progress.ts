"use client";

import { useEffect, useRef, useState } from "react";

function readElementScrollProgress(el: HTMLElement): { progress: number; hasOverflow: boolean } {
  const scrollable = el.scrollHeight - el.clientHeight;
  if (scrollable <= 1) {
    return { progress: 0, hasOverflow: false };
  }
  return {
    progress: Math.min(1, Math.max(0, el.scrollTop / scrollable)),
    hasOverflow: true,
  };
}

/** Progreso de scroll (0–1) de un contenedor con overflow, p. ej. lista del chat. */
export function useElementScrollProgress(element: HTMLElement | null, ...deps: unknown[]) {
  const [progress, setProgress] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!element) {
      setProgress(0);
      setHasOverflow(false);
      return;
    }

    const flush = () => {
      rafRef.current = 0;
      const { progress: p, hasOverflow: h } = readElementScrollProgress(element);
      setProgress(p);
      setHasOverflow(h);
    };

    const schedule = () => {
      if (rafRef.current !== 0) return;
      rafRef.current = requestAnimationFrame(flush);
    };

    flush();
    element.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(element);

    return () => {
      element.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro?.disconnect();
      if (rafRef.current !== 0) cancelAnimationFrame(rafRef.current);
    };
  }, [element, ...deps]);

  return { progress, hasOverflow };
}
