"use client";

import { Session } from "@/types/session";
import { languageColor } from "@/constants/languages";
import { formatMinutes } from "@/lib/utils";
import { CODING_COLOR, WATCHING_COLOR } from "@/constants/themes";

interface SessionTimelineProps {
  sessions: Session[];
  limit?: number;
}

export function SessionTimeline({ sessions, limit = 8 }: SessionTimelineProps) {
  const recent = [...sessions]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);

  return (
    <div className="space-y-0">
      {recent.map((s, i) => (
        <div key={s.id} className="relative flex gap-4 pb-5 last:pb-0">
          {i !== recent.length - 1 && (
            <span className="absolute left-[5px] top-3 h-full w-px bg-base-700" />
          )}
          <span
            className="relative z-10 mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: languageColor(s.language) }}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-50">
                {s.language}
                <span
                  className="ml-2 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide"
                  style={{
                    color: s.kind === "coding" ? CODING_COLOR : WATCHING_COLOR,
                    backgroundColor: s.kind === "coding" ? "rgba(61,220,151,0.12)" : "rgba(124,108,246,0.15)",
                  }}
                >
                  {s.kind}
                </span>
              </p>
              <span className="font-mono text-xs text-ink-500">{formatMinutes(s.durationMinutes)}</span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-ink-500">
              {new Date(s.startedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
