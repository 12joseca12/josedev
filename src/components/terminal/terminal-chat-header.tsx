"use client";

import { TerminalChatTrafficLights, type TerminalChatTrafficLightsProps } from "@/components/terminal/terminal-chat-traffic-lights";
import { t } from "@/services/literals";

export function TerminalChatHeader({
  locale,
  viewMode,
  onClose,
  onYellow,
  onGreen,
}: TerminalChatTrafficLightsProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-outline-variant/25 px-3 py-2.5 sm:px-4">
      <TerminalChatTrafficLights locale={locale} viewMode={viewMode} onClose={onClose} onYellow={onYellow} onGreen={onGreen} />
      <p className="min-w-0 flex-1 truncate font-mono text-[10px] font-medium uppercase tracking-wide text-on-surface sm:text-xs">
        {t(locale, "terminalChat.headerTitle")}
      </p>
      <span className="hidden shrink-0 font-mono text-[9px] text-primary/80 sm:inline">
        {t(locale, "terminalChat.headerConnection")}
      </span>
    </header>
  );
}
