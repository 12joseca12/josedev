"use client";

import { Send, Terminal } from "lucide-react";
import { useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

export type TerminalChatComposerProps = {
  locale: Locale;
  inputId: string;
  inputPrompt: string;
  draft: string;
  setDraft: (value: string) => void;
  onInputKeyDown: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  disabled: boolean;
  compact?: boolean;
};

const COMPOSER_TEXTAREA_MAX_PX = 112;
const COMPOSER_TEXTAREA_MAX_PX_COMPACT = 64;

export function TerminalChatComposer({
  locale,
  inputId,
  inputPrompt,
  draft,
  setDraft,
  onInputKeyDown,
  onSend,
  disabled,
  compact = false,
}: TerminalChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxHeightPx = compact ? COMPOSER_TEXTAREA_MAX_PX_COMPACT : COMPOSER_TEXTAREA_MAX_PX;
  useAutoResizeTextarea(textareaRef, draft, maxHeightPx);

  if (compact) {
    return (
      <div className="flex items-end gap-1.5 rounded border border-dash-border bg-terminal-panel px-1.5 py-1">
        <label htmlFor={inputId} className="sr-only">
          {t(locale, "terminalChat.inputLabel")}
        </label>
        <span className="hidden shrink-0 self-end pb-1.5 font-mono text-[9px] leading-none text-dash-accent-text sm:inline" aria-hidden>
          {inputPrompt}
        </span>
        <textarea
          ref={textareaRef}
          id={inputId}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onInputKeyDown}
          disabled={disabled}
          placeholder={t(locale, "terminalChat.inputPlaceholder")}
          className="min-h-[1.75rem] flex-1 resize-none overflow-hidden bg-transparent py-1 font-mono text-[10px] leading-snug text-dash-text placeholder:text-dash-muted/70 focus:outline-none"
          style={{ maxHeight: maxHeightPx }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !draft.trim()}
          className="flex size-7 shrink-0 items-center justify-center rounded border border-dash-accent/50 bg-dash-accent/20 text-dash-accent-text transition-colors hover:bg-dash-accent/30 disabled:opacity-40"
          aria-label={t(locale, "terminalChat.sendAria")}
        >
          <Send className="size-3" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <footer className="shrink-0 border-t border-dash-border bg-terminal-footer px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="flex items-end gap-2 rounded-md border border-dash-border bg-terminal-panel px-2 py-2">
        <label htmlFor={inputId} className="sr-only">
          {t(locale, "terminalChat.inputLabel")}
        </label>
        <span
          className="hidden shrink-0 self-end pb-2 font-mono text-[10px] leading-none text-dash-accent-text sm:inline"
          aria-hidden
        >
          {inputPrompt}
        </span>
        <textarea
          ref={textareaRef}
          id={inputId}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onInputKeyDown}
          disabled={disabled}
          placeholder={t(locale, "terminalChat.inputPlaceholder")}
          className="min-h-[2.25rem] flex-1 resize-none overflow-hidden bg-transparent py-1.5 font-mono text-xs leading-snug text-dash-text placeholder:text-dash-muted/70 focus:outline-none"
          style={{ maxHeight: maxHeightPx }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !draft.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-dash-accent/50 bg-dash-accent/20 text-dash-accent-text transition-colors hover:bg-dash-accent/30 disabled:opacity-40"
          aria-label={t(locale, "terminalChat.sendAria")}
        >
          <Send className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-widest text-dash-muted/80">
        <span className="inline-flex items-center gap-2">
          <Terminal className="size-3 text-dash-accent-text/70" aria-hidden />
          <span>{t(locale, "terminalChat.footerUtf8")}</span>
          <span>{t(locale, "terminalChat.footerIns")}</span>
        </span>
        <span className="truncate">{t(locale, "terminalChat.footerProtocol")}</span>
      </div>
    </footer>
  );
}
