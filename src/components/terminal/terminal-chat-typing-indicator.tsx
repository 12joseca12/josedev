"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
};

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL_MS = 90;

/**
 * Indicador de "generando respuesta" con spinner braille estilo CLI,
 * a juego con la estética de terminal del resto del panel de chat.
 */
export function TerminalChatTypingIndicator({ locale }: Props) {
  const label = t(locale, "terminalChat.typingAria");
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, FRAME_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="flex w-full shrink-0 items-center gap-2 border-t border-dash-border px-3 py-3"
      role="status"
      aria-live="polite"
    >
      <span className="w-3 shrink-0 text-center font-mono text-sm text-dash-accent-text" aria-hidden>
        {SPINNER_FRAMES[frame]}
      </span>
      <span className="font-mono text-[11px] uppercase tracking-widest text-dash-muted">{label}</span>
    </div>
  );
}
