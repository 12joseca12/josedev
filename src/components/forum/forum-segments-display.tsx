import type { ForumSegment } from "@/lib/types";
import { escapeHtml } from "@/lib/html-escape";

type Props = {
  segments: ForumSegment[];
};

export function ForumSegmentsDisplay({ segments }: Props) {
  return (
    <div className="space-y-3">
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return (
            <p key={i} className="whitespace-pre-wrap break-words text-sm leading-relaxed text-on-surface [overflow-wrap:anywhere]">
              {seg.content}
            </p>
          );
        }
        return (
          <div
            key={i}
            className="overflow-x-auto rounded-lg border border-outline-variant/30 bg-[rgb(6,8,10)] p-3 font-mono text-xs leading-relaxed shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
          >
            {seg.language ? (
              <div className="mb-2 font-label text-[10px] uppercase tracking-widest text-tertiary">
                {escapeHtml(seg.language)}
              </div>
            ) : null}
            <pre className="whitespace-pre text-on-surface [overflow-wrap:anywhere]">
              <code>{seg.content}</code>
            </pre>
          </div>
        );
      })}
    </div>
  );
}
