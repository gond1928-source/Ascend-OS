"use client";

/**
 * TodayTimeline — Today View middle region (design brief §7).
 * Chronological list of today's real activity, one continuous flow list
 * with hairline dividers — not stat cards. Distraction time gets a small
 * secondary signal (a muted dot + label), never a loud warning-colored
 * block; same data as the old distraction-card, quieter presentation.
 *
 * Entry detail (duration/source/time range/note) used to open in the
 * right panel on click. Now that the right panel is gone (design brief
 * §1's revision note), clicking a row expands it in place instead — an
 * inline accordion under the row, same hairline-divider list, no side
 * panel to reintroduce.
 */

import { Fragment, useMemo, useState } from "react";
import { Session } from "@/types/session";
import { DistractionRecord } from "@/types/distraction";
import { formatMinutes, cn } from "@/lib/utils";
import { ChevronRight, Play } from "lucide-react";

type TimelineEntry =
  | { kind: "coding" | "watching"; data: Session }
  | { kind: "distraction"; data: DistractionRecord };

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

const DOT_COLOR: Record<TimelineEntry["kind"], string> = {
  coding: "var(--status-coding)",
  watching: "var(--status-learning)",
  distraction: "var(--status-distraction)",
};

// Rotates by day, not randomly on every render — picking a new hint on
// every re-render would be distracting (and would refire on every timer
// tick while a session elsewhere on the page is running). One quiet hint
// per day is plenty; this is a nudge, not a content feed.
const PRODUCTIVITY_HINTS = [
  "Sessions under 5 minutes aren't tracked — batches of focused work show up best.",
  "Distraction time is tracked automatically. Nothing to log by hand.",
  "Your streak counts any day with at least one tracked session.",
  "Weekly reports pull directly from what's tracked here — no separate setup.",
];

function hintOfTheDay(): string {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return PRODUCTIVITY_HINTS[dayIndex % PRODUCTIVITY_HINTS.length];
}

export function TodayTimeline({
  sessions, distractions, onStartMonitoring, isMonitoringRunning,
}: {
  sessions: Session[];
  distractions: DistractionRecord[];
  onStartMonitoring?: () => void;
  isMonitoringRunning?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const hint = useMemo(hintOfTheDay, []);

  const entries: TimelineEntry[] = [
    ...sessions.filter((s) => isToday(s.startedAt)).map((s) => ({ kind: s.kind, data: s } as TimelineEntry)),
    ...distractions.filter((d) => isToday(d.startedAt)).map((d) => ({ kind: "distraction", data: d } as TimelineEntry)),
  ].sort((a, b) => new Date(b.data.startedAt).getTime() - new Date(a.data.startedAt).getTime());

  const totalMinutes = entries.reduce((sum, e) => sum + e.data.durationMinutes, 0);

  if (entries.length === 0) {
    return (
      <div className="quiet-empty quiet-empty--onboarding">
        <p className="quiet-empty-title">
          {isMonitoringRunning ? "Monitoring is active — nothing logged yet" : "No activity tracked yet today"}
        </p>
        <p className="quiet-empty-sub">
          {isMonitoringRunning ? "The first entry appears here once a session completes." : hint}
        </p>
        {onStartMonitoring && !isMonitoringRunning && (
          <button type="button" className="quiet-empty-action" onClick={onStartMonitoring}>
            <Play className="h-3 w-3" />
            Start monitoring
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="today-section-header">
        <span className="today-section-title">Today</span>
        <span className="today-section-eyebrow">{formatMinutes(totalMinutes)} tracked</span>
      </div>
      <div>
        {entries.map((entry) => {
          const isDistraction = entry.kind === "distraction";
          const label = isDistraction ? (entry.data as DistractionRecord).label : (entry.data as Session).language;
          const isExpanded = expandedId === entry.data.id;
          return (
            <Fragment key={entry.data.id}>
              <div
                className="timeline-row"
                style={{ cursor: "pointer" }}
                onClick={() => setExpandedId(isExpanded ? null : entry.data.id)}
              >
                <span className="timeline-time">
                  {new Date(entry.data.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
                <span className="timeline-label">
                  <span className="category-dot" style={{ background: DOT_COLOR[entry.kind] }} />
                  {label}
                  {isDistraction && <span className="timeline-distraction-tag">distracted</span>}
                </span>
                <span className="timeline-duration">{formatMinutes(entry.data.durationMinutes)}</span>
                <ChevronRight className={cn("grouped-list-chevron", isExpanded && "grouped-list-chevron--open")} style={{ marginLeft: 4 }} />
              </div>
              {isExpanded && (
                <div className="timeline-row-detail">
                  <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div className="stat-grid-cell">
                      <p className="stat-label">Duration</p>
                      <p className="stat-value">{formatMinutes(entry.data.durationMinutes)}</p>
                    </div>
                    <div className="stat-grid-cell">
                      <p className="stat-label">Source</p>
                      <p className="stat-value" style={{ fontSize: "var(--text-base)" }}>{entry.data.source}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 10 }}>
                    {new Date(entry.data.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    {" – "}
                    {new Date(entry.data.endedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                  {entry.data.note && (
                    <p style={{ fontSize: "var(--text-base)", color: "var(--text-secondary)", marginTop: 6 }}>{entry.data.note}</p>
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
