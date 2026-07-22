"use client";

import { Project } from "@/types/project";
import { Timestamp } from "@/components/ui/timestamp";

/**
 * ProjectOverview — Phase 5 addendum §5: intentionally lightweight, pure
 * aggregation of data that already exists in the other project stores.
 * No charts, no computed progress, no new persisted state — just counts
 * and timestamps, same spirit as a GitHub repo's "About" panel.
 *
 * Polish pass: Tasks now reads "3/5" (done/total) instead of a bare
 * count, matching the completion ratio the project list row shows —
 * same underlying numbers, just consistent everywhere they appear now.
 * Timestamps switched to the shared <Timestamp> (relative + full-date
 * tooltip on hover), matching Reports/Study Library/Projects list/
 * Activity after this same polish pass.
 */
export function ProjectOverview({
  project,
  counts,
  lastActivityAt,
}: {
  project: Project;
  counts: { tasks: number; tasksDone: number; notes: number; resources: number; activity: number };
  lastActivityAt: string | null;
}) {
  return (
    <div className="space-y-5">
      {/* ── Metadata ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {project.description && (
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {project.description}
          </p>
        )}
        <div className="flow-list">
          <MetaRow label="Status" value={project.status === "active" ? "Active" : "Archived"} />
          <MetaRow label="Created" value={<Timestamp iso={project.createdAt} />} />
          <MetaRow label="Last updated" value={<Timestamp iso={project.updatedAt} />} />
          <MetaRow
            label="Last activity"
            value={lastActivityAt ? <Timestamp iso={lastActivityAt} /> : "No activity yet"}
          />
        </div>
      </div>

      {/* ── Aggregate counts ─────────────────────────────────────────── */}
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          At a glance
        </p>
        <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
          <div className="stat-grid-cell">
            <p className="stat-label">Tasks</p>
            <p className="stat-value">{counts.tasks > 0 ? `${counts.tasksDone}/${counts.tasks}` : 0}</p>
          </div>
          <div className="stat-grid-cell">
            <p className="stat-label">Notes</p>
            <p className="stat-value">{counts.notes}</p>
          </div>
          <div className="stat-grid-cell">
            <p className="stat-label">Resources</p>
            <p className="stat-value">{counts.resources}</p>
          </div>
          <div className="stat-grid-cell">
            <p className="stat-label">Activity</p>
            <p className="stat-value">{counts.activity}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flow-row">
      <span className="w-[110px] flex-shrink-0 font-mono text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{value}</span>
    </div>
  );
}
