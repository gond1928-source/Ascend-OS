"use client";

/**
 * Focus page (formerly "Monitoring") — redesigned to match the rest of
 * Ascend OS (Home/Projects/Reports/Library) instead of reading as a
 * separate settings-style prototype.
 *
 * All hook calls (useNativeTracker, useActivityWatch, useSettings,
 * useSessions, useDistractions) and their underlying logic are 100%
 * unchanged from the previous version of this page — only the render
 * layer changed. Nothing about tracking, session recording, or the
 * analytics pipeline is touched here.
 *
 * Layout (per the brief):
 *   1. Monitoring hero    — CurrentStateBanner, the exact same component
 *                            Home's Today View uses, so "what's happening
 *                            right now" looks identical in both places.
 *   2. Quick Actions      — Start/Stop Monitoring (primary) + Add Manual
 *                            Session (secondary, opens the modal wrapping
 *                            the existing SessionForm).
 *   3. Recent Sessions    — capped list, "View all" → /sessions (the new
 *                            Session History page).
 *   4. Advanced           — collapsed by default: ActivityWatch, and the
 *                            native tracker's classification diagnostics
 *                            (IDE/keyboard signal checks, raw
 *                            classification reason) that used to sit in
 *                            the primary view. That level of detail is
 *                            genuinely debug material, not something a
 *                            daily glance at Focus needs to see.
 */

import "@/styles/monitoring.css";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSessions } from "@/hooks/useSessions";
import { useDistractions } from "@/hooks/useDistractions";
import { useActivityWatch } from "@/hooks/useActivityWatch";
import { useNativeTracker } from "@/hooks/useNativeTracker";
import { useSettings } from "@/hooks/useSettings";
import { CurrentStateBanner } from "@/components/dashboard/current-state";
import { RecentSessions } from "@/components/monitoring/recent-sessions";
import { AdvancedPanel } from "@/components/monitoring/advanced-panel";
import { ManualSessionModal } from "@/components/sessions/manual-session-modal";
import { cn } from "@/lib/utils";
import {
  Play, Square, Plus, RefreshCw, CheckCircle2, XCircle,
  Loader2, Radio, AlertCircle,
} from "lucide-react";

export default function MonitoringPage() {
  const { sessions, addSession } = useSessions();
  const { addDistraction } = useDistractions();
  const [manualOpen, setManualOpen] = useState(false);

  // ── Native tracker — unchanged from the old page ────────────────────────
  const {
    status: nativeStatus,
    error: nativeError,
    currentSnapshot,
    pendingSessionCount,
    pendingDistractionCount,
    isRunning: nativeRunning,
    start: startNative,
    stop: stopNative,
    currentMode,
    currentApp,
    currentLanguage,
    currentSessionDurationMs,
    codingIdleCountdownSecs,
    classificationReason,
  } = useNativeTracker(
    (drafts) => { drafts.forEach((d) => addSession(d)); },
    (distractionDrafts) => { distractionDrafts.forEach((d) => addDistraction(d)); },
  );

  // ── ActivityWatch — unchanged from the old page ─────────────────────────
  const { settings, updateSettings } = useSettings();
  const awEnabled = settings.capabilities.activityWatchEnabled;
  const setAwEnabled = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === "function" ? next(awEnabled) : next;
    updateSettings("capabilities", { activityWatchEnabled: resolved });
  };
  const {
    status: awStatus,
    error: awError,
    bucketCount,
    pendingSessions: awPending,
    poll: awPoll,
  } = useActivityWatch(awEnabled, (drafts) => { drafts.forEach((d) => addSession(d)); });

  const showCodingSignals = currentSnapshot && (currentMode === "coding" || currentSnapshot.classificationReason?.includes("IDE"));

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-7 pb-10">
      <header className="flex items-end justify-between pt-1">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em]" style={{ color: "var(--accent-primary)" }}>Activity</p>
          <h1 className="mt-0.5 text-[22px] font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Focus</h1>
        </div>
      </header>

      {/* ── 1. Monitoring hero ──────────────────────────────────────────── */}
      <CurrentStateBanner
        isRunning={nativeRunning}
        currentMode={currentMode}
        currentApp={currentApp}
        currentLanguage={currentLanguage}
        currentSessionDurationMs={currentSessionDurationMs}
      />

      {codingIdleCountdownSecs !== null && codingIdleCountdownSecs < 30 && (
        <div className="tracker-inline-note">
          <AlertCircle className="tracker-inline-note-icon tracker-inline-note-icon--warning h-3.5 w-3.5" />
          <span>Coding pauses in {codingIdleCountdownSecs}s — type to continue</span>
        </div>
      )}

      {nativeStatus === "error" && (
        <div className="tracker-inline-note">
          <AlertCircle className="tracker-inline-note-icon tracker-inline-note-icon--error h-3.5 w-3.5" />
          <div>
            <p>{nativeError}</p>
            <p className="mt-0.5" style={{ color: "var(--text-muted)" }}>
              macOS: check Accessibility permissions in System Settings → Privacy &amp; Security. Linux: ensure xdotool is installed.
            </p>
          </div>
        </div>
      )}

      {(pendingSessionCount > 0 || pendingDistractionCount > 0) && (
        <div className="tracker-inline-note">
          <Radio className="tracker-inline-note-icon h-3.5 w-3.5" style={{ color: "var(--accent-primary)" }} />
          <span>
            {pendingSessionCount > 0 && `${pendingSessionCount} session${pendingSessionCount !== 1 ? "s" : ""} ready to commit`}
            {pendingSessionCount > 0 && pendingDistractionCount > 0 && " · "}
            {pendingDistractionCount > 0 && `${pendingDistractionCount} distraction${pendingDistractionCount !== 1 ? "s" : ""} logged this run`}
          </span>
        </div>
      )}

      {/* ── 2. Quick Actions ────────────────────────────────────────────── */}
      <div className="quick-actions-bar">
        <button
          type="button"
          className={cn("quick-action-btn quick-action-btn--primary", nativeRunning && "quick-action-btn--primary-active")}
          onClick={nativeRunning ? stopNative : startNative}
        >
          {nativeRunning ? <Square className="quick-action-icon" /> : <Play className="quick-action-icon" />}
          {nativeRunning ? "Stop monitoring" : "Start monitoring"}
        </button>
        <button type="button" className="quick-action-btn quick-action-btn--secondary" onClick={() => setManualOpen(true)}>
          <Plus className="quick-action-icon" />
          Add manual session
        </button>
      </div>

      {/* ── 3. Recent Sessions ──────────────────────────────────────────── */}
      <RecentSessions sessions={sessions} />

      {/* ── 4. Advanced (collapsible, collapsed by default) ────────────── */}
      <AdvancedPanel title="Advanced">
        <div className="space-y-5 pb-1 pt-1">
          {showCodingSignals && (
            <div>
              <p className="today-section-eyebrow mb-2">Native tracker diagnostics</p>
              <div className="tracker-live space-y-1.5">
                <div className="tracker-signal-row">
                  <span style={{ color: "var(--status-coding)" }}>✓</span>
                  <span className="tracker-signal-label">IDE focused</span>
                  <span className="tracker-signal-value">{currentSnapshot?.appName}</span>
                </div>
                <div className="tracker-signal-row">
                  <span style={{ color: currentLanguage ? "var(--status-coding)" : "var(--status-error)" }}>{currentLanguage ? "✓" : "✗"}</span>
                  <span className="tracker-signal-label">Code file in title</span>
                  <span className="tracker-signal-value">{currentLanguage ?? "none detected"}</span>
                </div>
                <div className="tracker-signal-row">
                  <span style={{ color: currentSnapshot?.keyboardActivityDetected ? "var(--status-coding)" : "var(--status-error)" }}>
                    {currentSnapshot?.keyboardActivityDetected ? "✓" : "✗"}
                  </span>
                  <span className="tracker-signal-label">Keyboard active</span>
                  <span className="tracker-signal-value">{currentSnapshot?.keyboardActivityDetected ? "typing detected" : "mouse-only (ignored)"}</span>
                </div>
                <div className="tracker-signal-row">
                  <span style={{ color: currentMode === "coding" ? "var(--status-coding)" : "var(--status-error)" }}>{currentMode === "coding" ? "✓" : "✗"}</span>
                  <span className="tracker-signal-label">Valid coding state</span>
                  <span className="tracker-signal-value">{currentMode === "coding" ? "counting" : "not counting"}</span>
                </div>
                {classificationReason && (
                  <p className="mt-2 border-t pt-2 font-mono text-[10px]" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>
                    {classificationReason}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="today-section-header">
              <span className="today-section-title">ActivityWatch</span>
              <span className="today-section-eyebrow">Fallback · debug mode</span>
            </div>
            <p className="mb-3 text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Import sessions from a running ActivityWatch instance (localhost:5600). Useful for retroactively
              importing history. Native tracking above is preferred.
            </p>

            <div className="timeline-row">
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{
                  background:
                    awStatus === "connected" ? "var(--status-coding)"
                    : awStatus === "polling" ? "var(--status-distraction)"
                    : awStatus === "error" ? "var(--status-error)"
                    : "var(--status-idle)",
                }}
              />
              <span className="timeline-label">
                {awStatus === "idle" ? "Disabled"
                  : awStatus === "polling" ? "Connecting…"
                  : awStatus === "connected" ? `Connected · ${bucketCount} buckets detected`
                  : `Error: ${awError}`}
              </span>
              {awStatus === "connected" && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--status-coding)" }} />}
              {awStatus === "error" && <XCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--status-error)" }} />}
            </div>

            {awPending.length > 0 && (
              <div className="tracker-inline-note">
                <CheckCircle2 className="tracker-inline-note-icon h-3.5 w-3.5" style={{ color: "var(--status-coding)" }} />
                <span>{awPending.length} sessions imported from ActivityWatch</span>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <Button variant={awEnabled ? "outline" : "primary"} onClick={() => setAwEnabled((e) => !e)}>
                {awEnabled ? "Disable" : "Enable"}
              </Button>
              {awEnabled && (
                <Button variant="outline" onClick={awPoll} disabled={awStatus === "polling"}>
                  {awStatus === "polling" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Poll now
                </Button>
              )}
            </div>
            <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
              Requires ActivityWatch at http://localhost:5600 · polls every 60s
            </p>
          </div>
        </div>
      </AdvancedPanel>

      <ManualSessionModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSubmit={(drafts) => { drafts.forEach((d) => addSession(d)); }}
      />
    </div>
  );
}
