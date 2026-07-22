/**
 * Native Tracker — type definitions
 *
 * Architecture:
 *   NativeTracker → polls OS every N seconds
 *   ActivityClassifier → classifies WindowSnapshot → ClassifiedSnapshot
 *   KeyboardActivityDetector → tracks actual typing (not just focus)
 *   IdleDetector → pauses coding if no typing for 60s
 *   Segmenter → groups snapshots into ActivitySegments (with debounce)
 *   SessionBuilder → converts segments to SessionDrafts with metadata
 */

export type Platform = "darwin" | "win32" | "linux";

// ── Snapshot: raw OS-level data ───────────────────────────────────────────────

export interface WindowSnapshot {
  capturedAt: number;
  appName: string;
  windowTitle: string;
  url?: string;
  processName?: string;
  /** Whether the user is considered active (mouse/keyboard in last N seconds) */
  isUserActive: boolean;
  /** Keyboard events detected since last poll (from OS idle time delta) */
  keyboardActivityDetected?: boolean;
  /** Seconds since last keyboard/mouse input */
  idleSeconds?: number;
}

// ── Classification ────────────────────────────────────────────────────────────

export type ActivityCategory =
  | "coding"        // IDE focused + actual keyboard activity
  | "learning"      // YouTube tutorials, Udemy, Coursera, docs
  | "entertainment" // Netflix, Twitch, Reddit, social
  | "idle"          // no user activity
  | "other";

export interface ClassifiedSnapshot extends WindowSnapshot {
  category: ActivityCategory;
  language?: string;
  classificationReason: string;
  /** True only when IDE is focused AND keyboard activity detected */
  isActivelyCoding?: boolean;
  /**
   * Site-level label for browser windows (e.g. "Claude", "ChatGPT", "Reddit"),
   * derived from the tab URL or page title — NOT the OS-reported process
   * name, which is just "Chrome"/"Google Chrome" for every tab regardless of
   * which site is open. Only set when the focused window is a browser.
   * Segmenter uses this (falling back to appName) to compute primaryApp, so
   * distinct sites don't collapse into one "Chrome" bucket. See classifier.ts
   * extractBrowserSiteLabel().
   */
  siteLabel?: string;
}

// ── Segments ──────────────────────────────────────────────────────────────────

export interface ActivitySegment {
  category: ActivityCategory;
  language?: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  snapshotCount: number;
  primaryApp: string;
  /** Quality metadata for AI coaching */
  metadata: SegmentMetadata;
}

export interface SegmentMetadata {
  /** 0–100: ratio of active snapshots to total */
  activeRatio: number;
  /** Count of focus interruptions (category switches) */
  interruptionCount: number;
  /** 0–100: typing density (keyboard active snapshots / total) */
  typingIntensity: number;
  /** Number of rapid app switches (< debounce window) */
  distractionSwitches: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

export interface TrackerConfig {
  pollIntervalMs: number;
  /** Pause coding session after this much idle (no keyboard). Default 60s */
  codingIdleThresholdMs: number;
  /** Pause ALL tracking after this much idle (no mouse/keyboard at all). Default 60s */
  idleThresholdMs: number;
  /** Minimum segment duration to persist. Default 60s */
  minSegmentMs: number;
  /** Gap between segments to still merge into one session. Default 300s */
  mergeGapMs: number;
  /** App switches faster than this are debounced (not real switches). Default 15s */
  shortInterruptionMs: number;
}

export const DEFAULT_TRACKER_CONFIG: TrackerConfig = {
  pollIntervalMs: 5_000,
  codingIdleThresholdMs: 60_000,
  idleThresholdMs: 60_000,
  minSegmentMs: 60_000,
  mergeGapMs: 300_000,
  shortInterruptionMs: 15_000,
};
