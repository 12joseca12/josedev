import type { ForumParticipantDTO, Locale } from "@/lib/types";
import { forumParticipantLabel } from "@/lib/forum-author-display";
import { t } from "@/services/literals";

type Props = {
  locale: Locale;
  participants: ForumParticipantDTO[];
};

export function ForumAsideParticipants({ locale, participants }: Props) {
  return (
    <section className="rounded-xl border border-outline-variant/25 bg-surface-container-low/40 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
      <h2 className="mb-3 font-label text-[10px] uppercase tracking-widest text-outline">
        {t(locale, "forum.ui.participantsTitle")}
      </h2>
      <ul className="space-y-2">
        {participants.map((p) => (
          <li key={p.userId} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-on-surface">{forumParticipantLabel(locale, p)}</span>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 font-label text-[9px] uppercase tracking-wide ${
                p.role === "author"
                  ? "bg-primary/15 text-primary"
                  : "bg-surface-container-high text-on-surface-variant"
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
