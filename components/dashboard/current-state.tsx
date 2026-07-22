"use client";

/**
 * CurrentStateBanner — Today View top region (design brief §7).
 * Only meaningfully "alive" when a session is actually running: a real,
 * quietly-ticking timer, not a decorative pulse. When nothing is active,
 * a quiet non-apologetic empty line — no marketing CTA trying to fill the
 * space (see Linear's "No issues assigned to you" as the tone reference).
 *
 * PHASE 2 CHANGE: no longer calls useNativeTracker() itself. Dashboard
 * (app/dashboard/page.tsx) now owns the single tracker subscription for
 * the whole page — QuickActionsBar's Start/Stop Monitoring button needs
 * the exact same isRunning/start/stop, and a second independent
 * useNativeTracker() call here would wire a SECOND onSessionsCommitted
 * callback, double-committing every session the moment one closed. This
 * component is now a pure display of whatever state it's handed.
 */

import { useEffect, useState } from "react";
import { TrackerState } from "@/lib/tracker/native-tracker";

export const MODE_LABEL: Record<string, string> = {
  coding: "Coding",
  learning: "Learning",
  entertainment: "Watching",
  idle: "Idle",
  other: "Active",
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export interface CurrentStateBannerProps {
  isRunning: boolean;
  currentMode: TrackerState["currentMode"];
  currentApp: string | null;
  currentLanguage: string | null;
  currentSessionDurationMs: number;
}

export function CurrentStateBanner({
  isRunning, currentMode, currentApp, currentLanguage, currentSessionDurationMs,
}: CurrentStateBannerProps) {
  // Re-render once a second while a session is running, purely to tick the
  // displayed timer — no data fetching, no re-render storms.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  if (!isRunning) {
    return (
      <div className="current-state" style={{ opacity: 0.7 }}>
        <span className="current-state-dot" style={{ background: "var(--status-idle)", animation: "none" }} />
        <div className="current-state-body">
          <p className="current-state-label">Not tracking right now</p>
          <p className="current-state-sub">Start monitoring from Focus, or the Quick Actions bar above, to log this as a session</p>
        </div>
      </div>
    );
  }

  const modeLabel = currentMode ? MODE_LABEL[currentMode] ?? "Active" : "Active";
  const dotColor =
    currentMode === "coding" ? "var(--status-coding)"
    : currentMode === "learning" ? "var(--status-learning)"
    : currentMode === "entertainment" ? "var(--status-distraction)"
    : "var(--status-idle)";

  return (
    <div className="current-state">
      <span className="current-state-dot" style={{ background: dotColor }} />
      <div className="current-state-body">
        <p className="current-state-label">
          {modeLabel}{currentApp ? ` in ${currentApp}` : ""}
        </p>
        <p className="current-state-sub">
          {currentLanguage ? `Detected: ${currentLanguage}` : "Live session"}
        </p>
      </div>
      <span className="current-state-timer">{formatDuration(currentSessionDurationMs)}</span>
    </div>
  );
}
