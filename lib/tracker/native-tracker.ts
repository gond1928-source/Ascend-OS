/**
 * NativeTracker — client-side polling service.
 *
 * Pipeline per poll:
 *   GET /api/native-tracker → WindowSnapshot
 *     → classifySnapshot()  → ClassifiedSnapshot
 *     → buildSegments()     → ActivitySegment[]   (segmenter)
 *     → segmentsToSessions()→ SessionDraft[]       (session builder)
 *     → caller persists                            (storage)
 *
 * Exposes a rich TrackerState for the UI:
 *   - currentMode: "coding" | "learning" | "entertainment" | "idle" | "other"
 *   - currentApp, currentLanguage, isActive
 *   - currentSessionDurationMs
 *   - codingIdleCountdown: seconds until coding session pauses
 *
 * Run identity:
 *   Every drafts this tracker commits during one start()...stop() lifecycle
 *   carries the SAME `runId`, generated fresh in start(). This is what lets
 *   the Sessions history display (lib/session-grouping.ts) merge fragments
 *   from one monitoring run authoritatively — by shared identity, not by
 *   inferring "these timestamps look close enough to be the same run".
 *   A fresh runId is generated the next time start() is called, so two
 *   separate monitoring sessions (even on the same day, even for the same
 *   language) are never mistaken for one run.
 *
 * Session commit model:
 *   Every poll recomputes segments from scratch (cheap, snapshots are pruned
 *   daily). All segments except the LAST one are permanently closed — once a
 *   segment isn't the most recent, future snapshots can never change it.
 *   So only closed segments are safe to auto-commit during live polling;
 *   the still-open last segment keeps growing and must never be committed
 *   early, or it freezes at a truncated duration.
 *
 *   Commits are tracked as a RUNNING TOTAL PER (kind, language) GROUP, not as
 *   a one-shot "have I seen this segment" flag. This matters for rapid
 *   switching: the minimum-duration floor (60s, see session-builder.ts's
 *   evaluateGroupForCommit — the SAME function this class calls, so the
 *   floor policy can never drift between the live and batch paths) is
 *   applied AFTER summing every segment that shares a (kind, language), but
 *   during live polling, closed segments only trickle in a few at a time —
 *   often just one per poll. If each small batch were evaluated against the
 *   floor in isolation, a string of real 20-30s bursts would each
 *   individually fall under the floor and be discarded forever the moment
 *   they're first seen, even though their total clearly clears it. Instead,
 *   every poll we recompute each group's FULL total across all closed
 *   segments seen so far, and commit only the newly-crossed-the-floor delta
 *   beyond what's already been persisted for that group — so short bursts
 *   of the same kind+language correctly accumulate into one session over
 *   time.
 *
 *   flushPendingSessions() forces the currently-open segment to be treated
 *   as closed right now (used by Stop Monitoring and page-unload), so
 *   nothing in progress is ever silently lost.
 */

import {
  WindowSnapshot,
  ActivitySegment,
  ClassifiedSnapshot,
  TrackerConfig,
  DEFAULT_TRACKER_CONFIG,
} from "./types";
import { classifySnapshot } from "./classifier";
import { buildSegments } from "./segmenter";
import { groupSegmentsByKindLanguage, evaluateGroupForCommit } from "./session-builder";
import { SessionDraft, SessionSource } from "@/types/session";

export type TrackerStatus = "stopped" | "running" | "error";

export interface TrackerState {
  status: TrackerStatus;
  error: string | null;
  currentSnapshot: ClassifiedSnapshot | null;
  segmentsToday: ActivitySegment[];
  lastPollAt: number | null;
  pendingSessions: SessionDraft[];
  committedCount: number;

  // ── Rich live state for UI display ──────────────────────────────────────────
  /** Current activity category */
  currentMode: ClassifiedSnapshot["category"] | null;
  /** Currently focused app name */
  currentApp: string | null;
  /** Detected language if coding */
  currentLanguage: string | null;
  /** True if user is actively doing something (not idle) */
  isActive: boolean;
  /** Duration of the current segment in ms */
  currentSessionDurationMs: number;
  /** Seconds until coding is paused due to idle (only relevant when coding) */
  codingIdleCountdownSecs: number | null;
  /** Classification reason (for debug) */
  classificationReason: string | null;
}

type TrackerListener = (state: TrackerState) => void;

const INITIAL_STATE: TrackerState = {
  status: "stopped",
  error: null,
  currentSnapshot: null,
  segmentsToday: [],
  lastPollAt: null,
  pendingSessions: [],
  committedCount: 0,
  currentMode: null,
  currentApp: null,
  currentLanguage: null,
  isActive: false,
  currentSessionDurationMs: 0,
  codingIdleCountdownSecs: null,
  classificationReason: null,
};

export class NativeTracker {
  private config: TrackerConfig;
  private snapshots: ClassifiedSnapshot[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<TrackerListener> = new Set();
  private state: TrackerState = { ...INITIAL_STATE };

  /**
   * Running total of ms already committed (turned into a SessionDraft) for
   * each (kind, language) group, keyed the same way session-builder.ts
   * groups segments ("coding::Python", "watching::Python", ...). This
   * replaces a simpler "have I seen this exact segment" Set — that approach
   * couldn't support accumulating many small sub-floor segments over time,
   * since each one would be marked seen (and thus permanently excluded from
   * future summation) the moment it was first evaluated, regardless of
   * whether it had actually been persisted yet.
   */
  private committedMsByGroup: Map<string, number> = new Map();

  /**
   * The run identity stamped onto every draft committed during the current
   * start()...stop() lifecycle. null when stopped (no active run). A fresh
   * id is generated each time start() is called.
   */
  private currentRunId: string | null = null;

  constructor(config: Partial<TrackerConfig> = {}) {
    this.config = { ...DEFAULT_TRACKER_CONFIG, ...config };
  }

  getState(): TrackerState {
    return this.state;
  }

  subscribe(listener: TrackerListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach((l) => l(this.state));
  }

  start(): void {
    if (this.intervalId !== null) return;
    this.currentRunId = crypto.randomUUID();
    this.state = { ...this.state, status: "running", error: null };
    this.emit();
    void this.poll();
    this.intervalId = setInterval(() => void this.poll(), this.config.pollIntervalMs);
  }

  /**
   * Stop polling AND immediately finalize + flush whatever was still in
   * progress, so clicking "Stop monitoring" never loses the live session.
   */
  stop(): SessionDraft[] {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    const flushed = this.forceFlush();
    this.state = { ...this.state, status: "stopped" };
    this.emit();
    // The run is over — reset ALL run-scoped state so the next start() is
    // completely clean. Three things must be reset together:
    //
    // 1. currentRunId: so the next run gets a fresh identity, not a
    //    continuation of this one's grouping key.
    //
    // 2. committedMsByGroup: so the next run's floor evaluation starts from
    //    zero, not from "already committed 4 minutes" which would suppress
    //    all the next run's real activity until it exceeded the previous total.
    //
    // 3. this.snapshots: THIS is the bug this fix addresses. Snapshots from
    //    the previous run sit in memory and survive the today-filter on the
    //    NEXT run's first poll() call (they're still "from today"). If not
    //    cleared, buildSegments() on Run 2 sees Run 1's full snapshot history
    //    plus Run 2's first 2-3 seconds, producing a ~4m segment with
    //    alreadyCommittedMs=0 (just reset above) and commits a duplicate 4m
    //    draft that was never new activity. Clearing here is safe because
    //    forceFlush() already consumed them — the next run should start fresh.
    //    (flushPendingSessions() does NOT clear snapshots because polling
    //    may continue on the same run after a mid-run flush.)
    this.snapshots = [];
    this.currentRunId = null;
    this.committedMsByGroup.clear();
    return flushed;
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /** Drain whatever is already queued (closed segments only). No recomputation. */
  flushSessions(): SessionDraft[] {
    const pending = [...this.state.pendingSessions];
    this.state = { ...this.state, pendingSessions: [] };
    this.emit();
    return pending;
  }

  /**
   * Force the currently-open ("live") segment to be treated as finished
   * right now, convert it (and anything else not yet committed) into
   * SessionDrafts, and return everything pending — both the just-finalized
   * segment and anything already queued.
   *
   * Flow: segmenter (buildSegments) -> commitClosedSegments -> caller persists (storage).
   */
  flushPendingSessions(): SessionDraft[] {
    const flushed = this.forceFlush();
    this.emit();
    return flushed;
  }

  /** Shared implementation for stop() and flushPendingSessions(). Does not emit. */
  private forceFlush(): SessionDraft[] {
    const segments = buildSegments(this.snapshots, this.config);
    this.commitClosedSegments(segments); // include the still-open segment too — it's being force-closed right now
    const pending = [...this.state.pendingSessions];
    this.state = { ...this.state, pendingSessions: [] };
    return pending;
  }

  /**
   * Recomputes each (kind, language) group's FULL total across the given
   * closed segments and asks evaluateGroupForCommit (session-builder.ts —
   * the ONE shared floor policy, also used by the batch path) whether
   * there's a newly-committable delta for each group. Already-committed ms
   * are never re-counted or re-emitted.
   *
   * This is the core of the running-total commit model described in the
   * file header: it's what lets e.g. three separate 25s/30s/28s coding
   * bursts (each individually under the 60s floor, each closing in a
   * different poll) sum into one real session over time, instead of each
   * being evaluated against the floor in isolation and discarded forever.
   */
  private commitClosedSegments(segments: ActivitySegment[]): void {
    if (segments.length === 0) return;

    const groups = groupSegmentsByKindLanguage(segments);
    const newDrafts: SessionDraft[] = [];

    for (const group of groups) {
      const key = `${group.kind}::${group.language}`;
      const alreadyCommittedMs = this.committedMsByGroup.get(key) ?? 0;

      const decision = evaluateGroupForCommit(group, alreadyCommittedMs);
      if (!decision) continue;

      newDrafts.push({
        language: group.language,
        kind: group.kind,
        durationMinutes: decision.deltaMinutes,
        source: "native" as SessionSource,
        runId: this.currentRunId ?? undefined,
      });

      this.committedMsByGroup.set(key, decision.newCommittedMs);
    }

    if (newDrafts.length === 0) return;

    this.state = {
      ...this.state,
      pendingSessions: [...this.state.pendingSessions, ...newDrafts],
      committedCount: this.committedGroupCount(),
    };
  }

  private committedGroupCount(): number {
    return this.committedMsByGroup.size;
  }

  private async poll(): Promise<void> {
    try {
      const res = await fetch("/api/native-tracker", {
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} from /api/native-tracker`);

      const snapshot: WindowSnapshot = await res.json();
      const classified = classifySnapshot(snapshot);

      // Prune snapshots older than today
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      this.snapshots = this.snapshots.filter((s) => s.capturedAt >= todayStart.getTime());
      this.snapshots.push(classified);

      const segments = buildSegments(this.snapshots, this.config);

      // Only ever commit from CLOSED segments (everything but the still-open
      // last one). The open segment's duration keeps growing every poll, so
      // counting it early would double-count once it eventually closes —
      // committing from it is only safe once it's actually closed.
      this.commitClosedSegments(segments.slice(0, -1));

      // ── Compute live display state ─────────────────────────────────────────
      const lastSegment = segments[segments.length - 1] ?? null;
      const currentSessionDurationMs = lastSegment?.durationMs ?? 0;

      // Coding idle countdown
      let codingIdleCountdownSecs: number | null = null;
      if (classified.category === "coding" || classified.category === "other") {
        // Show countdown only if we're in an IDE
        const isIde = classified.classificationReason?.includes("IDE") || classified.category === "coding";
        if (isIde && !classified.keyboardActivityDetected) {
          const idleSecs = classified.idleSeconds ?? 0;
          const thresholdSecs = this.config.codingIdleThresholdMs / 1000;
          const remaining = Math.max(0, thresholdSecs - idleSecs);
          codingIdleCountdownSecs = Math.round(remaining);
        }
      }

      this.state = {
        ...this.state,
        status: "running",
        error: null,
        currentSnapshot: classified,
        segmentsToday: segments,
        lastPollAt: Date.now(),
        currentMode: classified.category,
        currentApp: classified.appName,
        currentLanguage: classified.language ?? null,
        isActive: classified.isUserActive,
        currentSessionDurationMs,
        codingIdleCountdownSecs,
        classificationReason: classified.classificationReason,
      };
      this.emit();
    } catch (err) {
      this.state = {
        ...this.state,
        status: "error",
        error: err instanceof Error ? err.message : "Poll failed",
        lastPollAt: Date.now(),
      };
      this.emit();
    }
  }
}

// ── SSR-safe singleton (also survives HMR/Fast Refresh in dev) ────────────────

declare global {
  // eslint-disable-next-line no-var
  var __ascendNativeTracker: NativeTracker | undefined;
}

export function getTracker(config?: Partial<TrackerConfig>): NativeTracker {
  if (typeof window === "undefined") {
    return new NativeTracker(config);
  }
  if (!globalThis.__ascendNativeTracker) {
    globalThis.__ascendNativeTracker = new NativeTracker(config);
  }
  return globalThis.__ascendNativeTracker;
}