"use client";

/**
 * Session History — the full session list, reached via "View all" on the
 * Focus page's Recent Sessions section. Per the brief: this is user
 * content, not a setting, so it stays its own page rather than moving
 * into Settings, and it stays raw history rather than duplicating
 * anything Analytics already shows.
 *
 * Reuses, unchanged: groupSessionsForDisplay (lib/session-grouping.ts),
 * SessionRow (components/sessions/session-row.tsx — the same row Focus's
 * Recent Sessions uses), and the SessionContext mutators. The only new
 * piece of logic here is the search/filter/time-range narrowing below,
 * applied to the raw Session[] before grouping.
 */

import "@/styles/monitoring.css";
import { useMemo, useState } from "react";
import { useSessions } from "@/hooks/useSessions";
import { Session } from "@/types/session";
import { groupSessionsForDisplay, SessionGroup } from "@/lib/session-grouping";
import { SessionRow, badgeLabel } from "@/components/sessions/session-row";
import { EditSessionModal } from "@/components/sessions/edit-session-modal";
import { Search, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type SourceFilter = "all" | "manual" | "tracked";
type TimeFilter = "all" | "today" | "7d" | "30d";

const SOURCE_OPTIONS: { id: SourceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "manual", label: "Manual" },
  { id: "tracked", label: "Tracked" },
];

const TIME_OPTIONS: { id: TimeFilter; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];

function withinTimeFilter(session: Session, filter: TimeFilter): boolean {
  if (filter === "all") return true;
  const started = new Date(session.startedAt).getTime();
  const now = Date.now();
  const days = filter === "today" ? 1 : filter === "7d" ? 7 : 30;
  const cutoff = filter === "today"
    ? new Date().setHours(0, 0, 0, 0)
    : now - days * 86400000;
  return started >= cutoff;
}

export default function SessionsPage() {
  const { sessions, updateSession, deleteSession } = useSessions();
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [editingGroup, setEditingGroup] = useState<SessionGroup | null>(null);

  // Time filter applies to the raw sessions (each fragment's own
  // startedAt) before grouping — source/search filters apply after
  // grouping, since "Manual"/"Tracked" and the language name are both
  // properties of the group, not any single underlying session.
  const timeFiltered = useMemo(
    () => sessions.filter((s) => withinTimeFilter(s, timeFilter)),
    [sessions, timeFilter],
  );

  const groups = useMemo(() => {
    let g = groupSessionsForDisplay(timeFiltered);
    if (sourceFilter !== "all") {
      const want = sourceFilter === "manual" ? "Manual" : "Tracked";
      g = g.filter((group) => badgeLabel(group) === want);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      g = g.filter((group) => group.language.toLowerCase().includes(q));
    }
    return g;
  }, [timeFiltered, sourceFilter, query]);

  const editingSessions = editingGroup
    ? sessions.filter((s) => editingGroup.sessionIds.includes(s.id))
    : [];

  function handleDeleteGroup(ids: string[]) {
    ids.forEach((id) => deleteSession(id));
  }

  function handleSaveEdit(edits: { id: string; language: string; durationMinutes: number }[]) {
    edits.forEach((e) => updateSession(e.id, { language: e.language, durationMinutes: e.durationMinutes }));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-7 pb-10">
      <header className="flex items-end justify-between pt-1">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em]" style={{ color: "var(--accent-primary)" }}>Activity</p>
          <h1 className="mt-0.5 text-[22px] font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Session history</h1>
        </div>
      </header>

      <div className="app-card flex items-center gap-3 !p-3">
        <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sessions by language…"
          className="w-full bg-transparent text-[13px] focus:outline-none"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="workspace-tabs">
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={cn("workspace-tab", sourceFilter === opt.id && "workspace-tab--active")}
              onClick={() => setSourceFilter(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="workspace-tabs">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={cn("workspace-tab", timeFilter === opt.id && "workspace-tab--active")}
              onClick={() => setTimeFilter(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="today-section">
        <div className="today-section-header">
          <span className="today-section-title">All sessions</span>
          <span className="today-section-eyebrow">{groups.length} shown</span>
        </div>

        {groups.length === 0 ? (
          <div className="quiet-empty">
            <Clock className="quiet-empty-icon" />
            <p className="quiet-empty-title">No sessions match these filters</p>
            <p className="quiet-empty-sub">Try a different search term or widen the time range.</p>
          </div>
        ) : (
          <div>
            {groups.map((g) => (
              <SessionRow
                key={g.id}
                group={g}
                onEdit={badgeLabel(g) === "Manual" ? setEditingGroup : undefined}
                onDelete={badgeLabel(g) === "Manual" ? handleDeleteGroup : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {editingGroup && (
        <EditSessionModal
          key={editingGroup.sessionIds.join(",")}
          open={!!editingGroup}
          onClose={() => setEditingGroup(null)}
          sessions={editingSessions}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
