/**
 * Context-switch tracking types — mirror types/session.ts / types/distraction.ts's
 * Draft/Record split, but for a genuinely different concept: a "context switch"
 * is a real transition between different ActivityCategory values across
 * consecutive segments (coding→learning, coding→other, learning→coding, etc.),
 * NOT "how many distraction records exist" (that was Bug 2 — see the
 * handoff notes this fix addresses).
 *
 * Counting happens at segment-level granularity inside NativeTracker, where
 * the raw, ordered segment list is still available — by the time activity
 * is merged into Session/DistractionRecord (floor rule + per-group
 * aggregation), the transition-by-transition detail is already lost. See
 * NativeTracker.countContextSwitches.
 *
 * Idle segments are treated as a non-breaking pause: coding → idle → coding
 * is 0 switches (the user paused and resumed the same activity), but
 * coding → idle → ChatGPT is 1 switch (coding → other), with the idle gap
 * itself not counted as a transition endpoint.
 *
 * Kept as its own store (own localStorage key) for the same reason
 * Session/DistractionRecord are separate: each of these three concepts
 * (productive time, distraction time, switching behavior) should be
 * independently queryable and never silently blended into another.
 */

export type ContextSwitchCategory =
  | "coding"
  | "learning"
  | "entertainment"
  | "other";

export interface ContextSwitchEvent {
  id: string;
  /** The category the user was in immediately before this switch. */
  fromCategory: ContextSwitchCategory;
  /** The category the user switched into. */
  toCategory: ContextSwitchCategory;
  /** Real timestamp (ISO string) of the segment that caused the switch —
   * NOT a "commit time"/"now" approximation, to avoid the same bug that
   * affected Session/DistractionRecord timestamps (see Bug 1). */
  occurredAt: string;
  /** Same run-identity convention as Session.runId / DistractionRecord.runId. */
  runId?: string;
}

export interface ContextSwitchDraft {
  fromCategory: ContextSwitchCategory;
  toCategory: ContextSwitchCategory;
  /** Real timestamp (ms epoch) of the segment that caused the switch. */
  occurredAt: number;
  runId?: string;
}
