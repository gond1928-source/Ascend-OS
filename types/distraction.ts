/**
 * Distraction tracking types — mirror types/session.ts's Session/SessionDraft
 * split exactly, but for "Others" activity (ActivityCategory "other": random
 * browsing, unclassified windows, non-learning/non-coding activity, idle
 * context switching).
 *
 * Kept as a SEPARATE record type (not folded into Session/ActivityKind)
 * on purpose: Session drives XP, quests, achievements, and streaks, all of
 * which assume a binary coding/watching split. Distraction time must never
 * earn XP or count toward a coding streak, so it lives in its own store
 * instead of risking a silent behavior change in those systems.
 */

export type DistractionSource = "native";

export interface DistractionRecord {
  id: string;
  /** Human-readable label for what the distracted time was spent on — the
   * most common app/window seen during the merged span, e.g. "Reddit",
   * "Unclassified window". Not a "language" the way Sessions have one. */
  label: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  source: DistractionSource;
  note?: string;
  /** Same run-identity convention as Session.runId — see that file. */
  runId?: string;
}

export interface DistractionDraft {
  label: string;
  durationMinutes: number;
  source?: DistractionSource;
  note?: string;
  runId?: string;
}
