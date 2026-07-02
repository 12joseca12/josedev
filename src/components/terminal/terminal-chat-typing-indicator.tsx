import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
};

/**
 * Indicador de escritura (tres puntos), estilo ChatGPT, entre mensajes y el compositor.
 */
export function TerminalChatTypingIndicator({ locale }: Props) {
  const label = t(locale, "terminalChat.typingAria");

  return (
    <div
      className="flex w-full shrink-0 items-center justify-center border-t border-outline-variant/15 px-3 py-3"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex items-center gap-1.5">
        {[0, 150, 300].map((delayMs) => (
          <span
            key={delayMs}
            className="terminal-chat-typing-dot inline-block size-2 rounded-full bg-primary/85"
            style={{ animationDelay: `${delayMs}ms` }}
            aria-hidden
          />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
