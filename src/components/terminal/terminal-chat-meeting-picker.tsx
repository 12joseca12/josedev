"use client";

import { useId, useState, type FormEvent } from "react";

import type { Locale } from "@/lib/types";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
  busy: boolean;
  onSubmit: (date: string, time: string) => void;
};

export function TerminalChatMeetingPicker({ locale, busy, onSubmit }: Props) {
  const baseId = useId();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!date || !time || busy) return;
    onSubmit(date, time);
  };

  return (
    <form
      onSubmit={onFormSubmit}
      className="mt-3 rounded-lg border border-outline-variant/30 bg-surface-container-low/80 p-3"
      aria-label={t(locale, "terminalChat.meetingFormAria")}
    >
      <p className="font-label text-[10px] uppercase tracking-widest text-primary">
        {t(locale, "terminalChat.meetingTitle")}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${baseId}-date`} className="font-label text-[10px] uppercase tracking-widest text-outline">
            {t(locale, "terminalChat.meetingDate")}
          </label>
          <input
            id={`${baseId}-date`}
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-outline-variant/35 bg-surface-container-lowest px-2 py-2 font-mono text-xs text-on-surface"
          />
        </div>
        <div>
          <label htmlFor={`${baseId}-time`} className="font-label text-[10px] uppercase tracking-widest text-outline">
            {t(locale, "terminalChat.meetingTime")}
          </label>
          <input
            id={`${baseId}-time`}
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 w-full rounded-md border border-outline-variant/35 bg-surface-container-lowest px-2 py-2 font-mono text-xs text-on-surface"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={busy || !date || !time}
        className="mt-3 w-full rounded-md border border-primary/40 bg-primary/15 px-3 py-2 font-headline text-[10px] font-bold uppercase tracking-wide text-primary transition-opacity hover:bg-primary/25 disabled:opacity-50"
      >
        {busy ? t(locale, "terminalChat.meetingSubmitting") : t(locale, "terminalChat.meetingSubmit")}
      </button>
    </form>
  );
}
