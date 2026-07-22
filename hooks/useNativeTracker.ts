"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TrackerState, TrackerStatus } from "@/lib/tracker/native-tracker";
import { ClassifiedSnapshot } from "@/lib/tracker/types";
import { SessionDraft } from "@/types/session";
import { DistractionDraft } from "@/types/distraction";
import { persistDraftsDirectly, persistDistractionDraftsDirectly } from "@/lib/tracker/storage";

export interface UseNativeTrackerResult {
  status: TrackerStatus;
  error: string | null;
  currentSnapshot: ClassifiedSnapshot | null;
  pendingSessionCount: number;
  pendingDistractionCount: number;
  lastPollAt: Date | null;
  isRunning: boolean;
  start: () => void;
  /** Stops polling, finalizes the live segment, and commits it. Returns what was committed. */
  stop: () => SessionDraft[];
  /** Forces the live segment to finalize right now and commits it, without stopping polling. */
  flushPendingSessions: () => SessionDraft[];

  // ── Rich live state ──────────────────────────────────────────────────────────
  /** Current activity mode */
  currentMode: TrackerState["currentMode"];
  /** Currently focused app */
  currentApp: string | null;
  /** Detected language if coding */
  currentLanguage: string | null;
  /** True if user is not idle */
  isActive: boolean;
  /** Duration of current segment in ms */
  currentSessionDurationMs: number;
  /**
   * Seconds until coding session pauses due to no keyboard activity.
   * null when not relevant (not in IDE or already typing).
   */
  codingIdleCountdownSecs: number | null;
  /** Debug: why the current snapshot was classified this way */
  classificationReason: string | null;
}

/**
 * onSessionsCommitted fires every time one or more SessionDrafts become
 * ready to persist — from a segment closing naturally during live polling,
 * from calling stop()/flushPendingSessions(), or from the component
 * unmounting. The caller is responsible for actually persisting them
 * (e.g. via useSessions().addSession).
 *
 * A page-unload safety net (pagehide/beforeunload) is handled internally:
 * if the page is actually closing, drafts are written straight to
 * localStorage instead of going through this callback, since React state
 * updates aren't guaranteed to flush before the page is gone.
 */
export function useNativeTracker(
  onSessionsCommitted: (drafts: SessionDraft[]) => void,
  onDistractionsCommitted?: (drafts: DistractionDraft[]) => void,
): UseNativeTrackerResult {
  const [state, setState] = useState<TrackerState | null>(null);
  const trackerRef = useRef<import("@/lib/tracker/native-tracker").NativeTracker | null>(null);

  // Always-current ref so the unload/unmount handlers below never close over
  // a stale callback, without needing to re-run the setup effect.
  const onSessionsRef = useRef(onSessionsCommitted);
  onSessionsRef.current = onSessionsCommitted;

  const onDistractionsRef = useRef(onDistractionsCommitted);
  onDistractionsRef.current = onDistractionsCommitted;

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    import("@/lib/tracker/native-tracker").then(({ getTracker }) => {
      if (cancelled) return;
      const tracker = getTracker();
      trackerRef.current = tracker;
      unsubscribe = tracker.subscribe((s) => setState(s));
    });

    // Genuine page unload (refresh, tab close, navigate away from the app).
    // Force the live segment closed and write straight to localStorage —
    // React may not get another chance to render before the page is gone.
    const handlePageHide = () => {
      const drafts = trackerRef.current?.flushPendingSessions() ?? [];
      if (drafts.length > 0) persistDraftsDirectly(drafts);
      const distractionDrafts = trackerRef.current?.flushDistractions() ?? [];
      if (distractionDrafts.length > 0) persistDistractionDraftsDirectly(distractionDrafts);
    };
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      unsubscribe?.();

      // Component unmount (e.g. SPA navigation away from this page). The
      // tracker singleton keeps running regardless, so nothing in progress
      // is at risk here — just drain whatever's already queued so it
      // doesn't sit around unsaved. Deliberately NOT a force-flush: React
      // Strict Mode performs a real mount→cleanup→mount cycle in dev, and
      // forcing the live segment closed here would truncate an ongoing
      // session for no reason.
      const drafts = trackerRef.current?.flushSessions() ?? [];
      if (drafts.length > 0) onSessionsRef.current(drafts);
      const distractionDrafts = trackerRef.current?.flushDistractions() ?? [];
      if (distractionDrafts.length > 0) onDistractionsRef.current?.(distractionDrafts);
    };
  }, []);

  // ── Intentionally NOT draining pendingSessions here during live polling. ──
  //
  // The old eager-drain effect flushed each segment the moment it closed,
  // which meant segmentsToSessions() only ever saw one segment at a time and
  // could never merge coding + watching + coding into two aggregated drafts.
  //
  // Segments now accumulate in the tracker's pendingSessions queue until
  // stop() is called. stop() passes ALL accumulated segments to
  // segmentsToSessions() at once, which correctly merges same-kind durations:
  //
  //   [10m coding, 5m watching, 15m coding] → coding=25m, watching=5m
  //
  // The only real-time drain path remaining is the pagehide/beforeunload
  // safety net above, which also flushes everything at once.

  const start = useCallback(() => trackerRef.current?.start(), []);

  const stop = useCallback((): SessionDraft[] => {
    // stop() calls forceFlush() internally, which closes the live segment and
    // passes ALL accumulated segments (from the entire monitoring session) to
    // segmentsToSessions() at once. This is what enables merging:
    // coding + watching + coding → [coding=Xm, watching=Ym] as two drafts.
    const drafts = trackerRef.current?.stop() ?? [];
    if (drafts.length > 0) {
      persistDraftsDirectly(drafts);
      // Also fire the callback so UI (XP, achievements, etc.) updates immediately
      onSessionsRef.current(drafts);
    }
    const distractionDrafts = trackerRef.current?.flushDistractions() ?? [];
    if (distractionDrafts.length > 0) {
      persistDistractionDraftsDirectly(distractionDrafts);
      onDistractionsRef.current?.(distractionDrafts);
    }
    return drafts;
  }, []);

  const flushPendingSessions = useCallback((): SessionDraft[] => {
    const drafts = trackerRef.current?.flushPendingSessions() ?? [];
    if (drafts.length > 0) onSessionsRef.current(drafts);
    const distractionDrafts = trackerRef.current?.flushDistractions() ?? [];
    if (distractionDrafts.length > 0) onDistractionsRef.current?.(distractionDrafts);
    return drafts;
  }, []);

  return {
    status: state?.status ?? "stopped",
    error: state?.error ?? null,
    currentSnapshot: state?.currentSnapshot ?? null,
    pendingSessionCount: state?.pendingSessions.length ?? 0,
    pendingDistractionCount: state?.pendingDistractions.length ?? 0,
    lastPollAt: state?.lastPollAt ? new Date(state.lastPollAt) : null,
    isRunning: state?.status === "running",
    start,
    stop,
    flushPendingSessions,
    currentMode: state?.currentMode ?? null,
    currentApp: state?.currentApp ?? null,
    currentLanguage: state?.currentLanguage ?? null,
    isActive: state?.isActive ?? false,
    currentSessionDurationMs: state?.currentSessionDurationMs ?? 0,
    codingIdleCountdownSecs: state?.codingIdleCountdownSecs ?? null,
    classificationReason: state?.classificationReason ?? null,
  };
}