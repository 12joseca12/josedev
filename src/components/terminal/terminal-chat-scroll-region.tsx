"use client";

import { useCallback, useState, type RefObject, type ReactNode } from "react";

import { ScrollProgressIndicator } from "@/components/layout/scroll-progress-indicator";
import { useElementScrollProgress } from "@/hooks/use-element-scroll-progress";

type Props = {
  children: ReactNode;
  /** Clases del contenedor scrollable (gap, padding…). */
  className?: string;
  /** Clases del wrapper (p. ej. `flex-1` en panel o `max-h-…` en PiP). */
  regionClassName?: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Dependencias para recalcular overflow (p. ej. número de mensajes). */
  measureDeps?: unknown[];
  "aria-live"?: "off" | "polite" | "assertive";
  "aria-busy"?: boolean;
};

/**
 * Área scroll del chat: sin scrollbar nativa + barra vertical (misma estética que `ScrollProgressBar`).
 */
export function TerminalChatScrollRegion({
  children,
  className = "",
  regionClassName = "flex-1",
  scrollRef,
  measureDeps = [],
  "aria-live": ariaLive,
  "aria-busy": ariaBusy,
}: Props) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const assignScrollNode = useCallback(
    (node: HTMLDivElement | null) => {
      setScrollEl(node);
      scrollRef.current = node;
    },
    [scrollRef],
  );

  const { progress, hasOverflow } = useElementScrollProgress(scrollEl, ...measureDeps);

  return (
    <div
      className={`grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)_3px] gap-0 ${regionClassName}`.trim()}
    >
      <div
        ref={assignScrollNode}
        className={`terminal-chat-scroll flex min-h-0 flex-col overflow-x-hidden overflow-y-auto overscroll-contain ${className}`.trim()}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        aria-live={ariaLive}
        aria-busy={ariaBusy}
      >
        {children}
      </div>
      <ScrollProgressIndicator
        orientation="vertical"
        progress={progress}
        hasOverflow={hasOverflow}
        className="min-h-0 self-stretch"
      />
    </div>
  );
}
