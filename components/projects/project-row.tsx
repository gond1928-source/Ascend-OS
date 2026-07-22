"use client";

import { Project } from "@/types/project";
import { Timestamp } from "@/components/ui/timestamp";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";

/**
 * ProjectRow — flush row in the continuous project list (design brief §4:
 * hairline dividers, not cards). Matches ReportCard's row treatment:
 * icon + title/meta + hover-revealed action icons, no per-row border box.
 *
 * Polish pass additions (Projects was audited as the weakest of the three
 * Documents/Study Library/Projects pages — most attention went here):
 *  - A monochrome initials avatar replaces the generic folder icon, giving
 *    each row a distinct scan anchor the way every mature list UI does —
 *    grayscale only (surface background, hairline border, muted text), no
 *    per-project color, so it stays inside the design brief's Tier 1 rule.
 *  - The task count became a completion ratio ("3/5 tasks") with a thin
 *    accent progress fill underneath — the brief explicitly allows the
 *    accent color for exactly this ("a progress bar fill"), so this is
 *    real signal within the existing rules, not a new decoration.
 *  - The secondary line now reflects last real activity (task/note/
 *    resource/activity-feed changes — anything that auto-logs to the
 *    project's Activity tab) instead of the project record's own
 *    `updatedAt`, which only changes on a direct rename/archive edit and
 *    could sit stale for days while real work happened inside the
 *    project. Falls back to `updatedAt` for a project with no activity
 *    yet. Both are real `<time>` elements with a full-date tooltip now.
 */
export function ProjectRow({
  project,
  taskCount,
  doneCount,
  lastActivityAt,
  onOpen,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  project: Project;
  taskCount: number;
  doneCount: number;
  lastActivityAt: string | null;
  onOpen: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}) {
  const initials = getInitials(project.name);
  const progressPct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
  const activityTime = lastActivityAt ?? project.updatedAt;

  return (
    <div
      className="group flex items-center gap-3 border-b px-1 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--surface-elevated)]"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-semibold"
        style={{ borderColor: "var(--border-subtle)", background: "var(--surface-elevated)", color: "var(--text-muted)" }}
        aria-hidden="true"
      >
        {initials}
      </div>

      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>{project.name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
            {taskCount > 0 ? `${doneCount}/${taskCount} tasks` : "No tasks"} · active <Timestamp iso={activityTime} />
          </p>
          {taskCount > 0 && (
            <div className="h-[3px] w-12 flex-shrink-0 overflow-hidden rounded-full" style={{ background: "var(--border-subtle)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${progressPct}%`, background: "var(--accent-primary)" }}
              />
            </div>
          )}
        </div>
      </button>

      <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {project.status === "active" ? (
          <button
            onClick={onArchive}
            title="Archive project"
            className="rounded p-1.5 text-ink-600 hover:bg-base-800/60 hover:text-ink-300"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={onUnarchive}
            title="Unarchive project"
            className="rounded p-1.5 text-ink-600 hover:bg-base-800/60 hover:text-ink-300"
          >
            <ArchiveRestore className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={onDelete}
          title="Delete project"
          className="rounded p-1.5 text-ink-600 hover:bg-status-error/10 hover:text-status-error"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
