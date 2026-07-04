"use client";

import { useLayoutEffect, type RefObject } from "react";

/** Ajusta la altura del textarea al contenido (hasta `maxHeightPx`). */
export function useAutoResizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  maxHeightPx: number,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, maxHeightPx);
    el.style.height = `${Math.max(next, 0)}px`;
  }, [ref, value, maxHeightPx]);
}
