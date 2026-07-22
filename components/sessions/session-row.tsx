"use client";

import { SessionGroup } from "@/lib/session-grouping";
import { languageColor } from "@/constants/languages";
import { CODING_COLOR, WATCHING_COLOR } from "@/constants/themes";
import { formatMinutes } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

/** All of SessionGroup's underlying sources collapse to one of these two —
 * matches the brief's "Badge: Tracked | Manual" exactly. A group is only
 * ever "Manual" when every session inside it is manual; any tracker-
 * sourced fragment in the mix makes the whole group read as Tracked,
 * since that's the source of truth for what actually happened. */
export function badgeLabel(group: SessionGroup): "Manual" | "Tracked" {
  return group.sources.every((s) => s === "manual") ? "Manual" : "Tracked";
}

function CategoryOrBar({ group }: { group: SessionGroup }) {
  if (group.isCombined) {
    const total = group.codingMinutes + group.watchingMinutes || 1;
    const codingPct = (group.codingMinutes / total) * 100;
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex h-1.5 w-14 overflow-hidden rounded-full" style={{ background: "var(--border-default)" }}>
          {group.codingMinutes > 0 && <div style={{ width: `${codingPct}%`, background: CODING_COLOR }} />}
          {group.watchingMinutes > 0 && <div style={{ width: `${100 - codingPct}%`, background: WATCHING_COLOR }} />}
        </div>
      </div>
    );
  }
  return (
    <span
      className="flex-shrink-0 font-mono text-[10px] uppercase"
      style={{ color: group.soloKind === "coding" ? CODING_COLOR : WATCHING_COLOR }}
    >
      {group.soloKind}
    </span>
  );
}

export function SessionRow({
  group,
  onEdit,
  onDelete,
}: {
  group: SessionGroup;
  onEdit?: (group: SessionGroup) => void;
  onDelete?: (ids: string[]) => void;
}) {
  const badge = badgeLabel(group);
  const canManage = badge === "Manual" && (onEdit || onDelete);

  return (
    <div className="timeline-row group">
      <span
        className="h-2 w-2 flex-shrink-0 rounded-full"
        style={{ backgroundColor: languageColor(group.language) }}
      />
      <span className="timeline-label">
        {group.language}
        <CategoryOrBar group={group} />
      </span>
      <span className="timeline-time">
        {new Date(group.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
      </span>
      <span className="timeline-duration">{formatMinutes(group.codingMinutes + group.watchingMinutes)}</span>
      <span className="workspace-row-tag">{badge}</span>
      {canManage && (
        <span className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(group)}
              className="p-0.5"
              style={{ color: "var(--text-muted)" }}
              aria-label="Edit session"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(group.sessionIds)}
              className="p-0.5"
              style={{ color: "var(--text-muted)" }}
              aria-label="Delete session"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </span>
      )}
    </div>
  );
}
