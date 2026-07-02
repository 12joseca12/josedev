"use client";

import { TerminalChatMeetingPicker } from "@/components/terminal/terminal-chat-meeting-picker";
import { meetingPickerIsPending } from "@/lib/terminal-chat-utils";
import { formatTerminalPromptTemplate } from "@/lib/user-initials";
import type { AdminChatMessageDTO, Locale } from "@/lib/types";
import { t } from "@/services/literals";

export function TerminalChatMessageBlock({
  locale,
  msg,
  isUser,
  userHost,
  onMeetingSubmit,
  meetingBusy,
  compact = false,
}: {
  locale: Locale;
  msg: AdminChatMessageDTO;
  isUser: boolean;
  userHost: string;
  onMeetingSubmit: (date: string, time: string) => void;
  meetingBusy: boolean;
  compact?: boolean;
}) {
  const label = isUser ? t(locale, "terminalChat.usrLabel") : t(locale, "terminalChat.sysLabel");
  const prompt = isUser
    ? formatTerminalPromptTemplate(t(locale, "terminalChat.usrPrompt"), userHost)
    : t(locale, "terminalChat.sysPrompt");
  const meta = msg.metadata as { selectedDate?: string; selectedTime?: string };

  if (compact) {
    return (
      <div
        className={`rounded border border-outline-variant/20 bg-surface-container-low/80 px-2 py-1.5 ${
          isUser ? "border-r-2 border-r-outline/40" : "border-l-2 border-l-primary"
        }`}
      >
        <p className="mb-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-outline">
          {label}
        </p>
        <p className="line-clamp-3 font-mono text-[10px] leading-snug text-on-surface">{msg.content}</p>
      </div>
    );
  }

  return (
    <article
      className={`flex w-full flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
      aria-label={label}
    >
      <div className={`flex items-center gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${
            isUser ? "bg-outline-variant/25 text-outline" : "bg-primary/20 text-primary"
          }`}
        >
          {label}
        </span>
        <span className="font-mono text-[9px] text-outline/80 sm:text-[10px]">{prompt}</span>
      </div>
      <div
        className={`max-w-[min(100%,28rem)] rounded-md border border-outline-variant/25 bg-surface-container-low/90 px-3 py-2.5 font-mono text-xs leading-relaxed text-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
          isUser ? "border-r-2 border-r-outline/50" : "border-l-2 border-l-primary"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        {!isUser && msg.messageType === "meeting_picker" && meetingPickerIsPending(msg) ? (
          <TerminalChatMeetingPicker locale={locale} busy={meetingBusy} onSubmit={onMeetingSubmit} />
        ) : null}
        {!isUser && msg.messageType === "meeting_picker" && !meetingPickerIsPending(msg) && meta.selectedDate ? (
          <p className="mt-2 font-label text-[10px] uppercase tracking-widest text-primary">
            {t(locale, "terminalChat.meetingScheduled")}{" "}
            <span className="font-mono normal-case tracking-normal text-on-surface">
              {meta.selectedDate} {meta.selectedTime ?? ""}
            </span>
          </p>
        ) : null}
      </div>
    </article>
  );
}
