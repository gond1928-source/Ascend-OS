import { SessionGroup } from "@/lib/session-grouping";
import { languageColor } from "@/constants/languages";
import { formatMinutes } from "@/lib/utils";
import { CODING_COLOR, WATCHING_COLOR } from "@/constants/themes";
import { X } from "lucide-react";

function SessionTimestamp({ group }: { group: SessionGroup }) {
  const primarySource = group.sources[0];
  const showSource = group.sources.length === 1 && primarySource !== "manual";
  return (
    <p className="font-mono text-[11px] text-ink-500">
      {new Date(group.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
      {showSource && <span className="ml-1 opacity-60">· {primarySource}</span>}
    </p>
  );
}

export function SessionCard({ group, onDelete }: { group: SessionGroup; onDelete?: (ids: string[]) => void }) {
  return (
    <div className="group flex items-center justify-between rounded-lg border border-base-700 bg-base-800/50 px-4 py-3 transition-colors hover:border-base-600">
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: languageColor(group.language) }} />
        <div>
          <p className="text-sm text-ink-50">{group.language}</p>
          <SessionTimestamp group={group} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {group.isCombined ? (
          // Combined block: coding + watching from the same run, same language.
          // Rendered as a single proportional bar (coding in green, watching in
          // blue) plus the matching minute readout, instead of two separate cards.
          <CombinedBar codingMinutes={group.codingMinutes} watchingMinutes={group.watchingMinutes} />
        ) : (
          <>
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase"
              style={{
                color: group.soloKind === "coding" ? CODING_COLOR : WATCHING_COLOR,
                backgroundColor: group.soloKind === "coding" ? "rgba(61,220,151,0.12)" : "rgba(124,108,246,0.15)",
              }}
            >
              {group.soloKind}
            </span>
            <span className="font-mono text-sm text-ink-300">
              {formatMinutes(group.codingMinutes + group.watchingMinutes)}
            </span>
          </>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(group.sessionIds)}
            className="ml-1 opacity-0 transition-opacity group-hover:opacity-100 text-ink-500 hover:text-accent-rose"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Proportional coding/watching bar + minute readout for a combined group,
 * e.g. "[==green==][=blue=]  1m · 2m". Mirrors the color language already
 * used everywhere else (CODING_COLOR / WATCHING_COLOR), just at session-card
 * scale instead of full-chart scale.
 */
function CombinedBar({ codingMinutes, watchingMinutes }: { codingMinutes: number; watchingMinutes: number }) {
  const total = codingMinutes + watchingMinutes || 1;
  const codingPct = (codingMinutes / total) * 100;
  const watchingPct = 100 - codingPct;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-1.5 w-20 overflow-hidden rounded-full bg-base-700">
        {codingMinutes > 0 && (
          <div style={{ width: `${codingPct}%`, backgroundColor: CODING_COLOR }} />
        )}
        {watchingMinutes > 0 && (
          <div style={{ width: `${watchingPct}%`, backgroundColor: WATCHING_COLOR }} />
        )}
      </div>
      <span className="font-mono text-sm text-ink-300 whitespace-nowrap">
        <span style={{ color: CODING_COLOR }}>{formatMinutes(codingMinutes)}</span>
        {" · "}
        <span style={{ color: WATCHING_COLOR }}>{formatMinutes(watchingMinutes)}</span>
      </span>
    </div>
  );
}
