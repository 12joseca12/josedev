import type { ForumParticipantDTO, Locale } from "@/lib/types";
import { forumParticipantLabel } from "@/lib/forum-author-display";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
  participants: ForumParticipantDTO[];
};

export function ForumAsideParticipants({ locale, participants }: Props) {
  return (
    <section className="rounded-md border border-dash-border bg-dash-surface p-4">
      <h2 className="mb-3 font-dash-sans text-[10px] uppercase tracking-widest text-dash-muted">
        {t(locale, "forum.ui.participantsTitle")}
      </h2>
      <ul className="space-y-2">
        {participants.map((p) => (
          <li key={p.userId} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-dash-text">{forumParticipantLabel(locale, p)}</span>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 font-dash-sans text-[9px] uppercase tracking-wide ${
                p.role === "author"
                  ? "bg-dash-accent/15 text-dash-accent-text"
                  : "bg-dash-border/40 text-dash-muted"
              }`}
            >
              {p.role === "author" ? t(locale, "forum.ui.roleAuthor") : t(locale, "forum.ui.roleParticipant")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
