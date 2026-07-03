import { getLiteralsRoot, t } from "@/services/literals";
import type { Locale } from "@/lib/types";

type Props = {
  locale: Locale;
  onSelect: (prompt: string) => void;
  disabled: boolean;
};

export function TerminalChatSuggestedPrompts({ locale, onSelect, disabled }: Props) {
  const prompts = getLiteralsRoot(locale).terminalChat.suggestedPrompts;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2 sm:px-4" aria-label={t(locale, "terminalChat.suggestedPromptsLabel")}>
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className="rounded-full border border-outline-variant/35 bg-surface-container-lowest/80 px-3 py-1.5 font-mono text-[10px] text-on-surface-variant transition-colors hover:border-primary/45 hover:text-primary disabled:opacity-40"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
