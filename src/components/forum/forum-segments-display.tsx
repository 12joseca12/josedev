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
            <p key={i} className="whitespace-pre-wrap break-words text-sm leading-relaxed text-dash-text [overflow-wrap:anywhere]">
              {seg.content}
            </p>
          );
        }
        return (
          <div
            key={i}
            className="overflow-x-auto rounded-md border border-dash-border bg-dash-bg p-3 font-dash-mono text-xs leading-relaxed"
          >
            {seg.language ? (
              <div className="mb-2 font-dash-sans text-[10px] uppercase tracking-widest text-dash-accent-text">
                {escapeHtml(seg.language)}
              </div>
            ) : null}
            <pre className="whitespace-pre text-dash-text [overflow-wrap:anywhere]">
              <code>{seg.content}</code>
            </pre>
          </div>
        );
      })}
    </div>
  );
}
