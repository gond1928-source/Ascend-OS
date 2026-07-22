/**
 * distraction-builder.ts — converts ActivitySegments whose category is
 * "other" ("Others" activity: random browsing, unclassified windows,
 * non-learning/non-coding activity, idle context switching) into
 * DistractionDrafts.
 *
 * This is a SIBLING to session-builder.ts, not a fork of it: it reuses the
 * exact same floor-evaluation policy (evaluateGroupForCommit) and the same
 * grouping shape (GroupTotal), so "Others" activity is subject to the
 * identical merge-then-floor rule that coding/watching segments already go
 * through — small fragmented "Others" bursts (e.g. 30s + 50s) merge across
 * the segmenter's existing debounce/merge-gap logic and only qualify once
 * their SUMMED total reaches MIN_GROUP_DURATION_MS (1 minute). Nothing about
 * the floor decision is re-implemented here.
 *
 * Grouping key: "Others" segments are grouped by their primary app/window
 * label (segmenter's majority-vote `primaryApp`) so a report can say
 * "12m on Reddit, 4m on unclassified windows" instead of one opaque bucket.
 * Every group still goes through the SAME evaluateGroupForCommit floor, so
 * a handful of distinct apps that individually never cross a minute simply
 * never qualify — exactly like a language that never crosses the coding
 * floor never becomes a session.
 */

import { ActivitySegment } from "./types";
import { evaluateGroupForCommit } from "./session-builder";
import { DistractionDraft, DistractionSource } from "@/types/distraction";

/** Fallback label for an "other" segment with no distinguishable app name. */
const UNSPECIFIED_DISTRACTION_LABEL = "Unclassified activity";

export interface DistractionGroupTotal {
  label: string;
  totalMs: number;
  segments: ActivitySegment[];
}

/**
 * Groups "other"-category segments by primary app label and returns each
 * group's raw total duration — the distraction-side equivalent of
 * session-builder.ts's groupSegmentsByKindLanguage. "idle" segments are
 * NOT included: idle means no user activity at all, which is not the same
 * thing as a distraction (the user doing something, just not something
 * productive).
 */
export function groupOtherSegments(segments: ActivitySegment[]): DistractionGroupTotal[] {
  const groups = new Map<string, ActivitySegment[]>();

  for (const seg of segments) {
    if (seg.category !== "other") continue;
    const label = seg.primaryApp?.trim() || UNSPECIFIED_DISTRACTION_LABEL;
    const existing = groups.get(label);
    if (existing) existing.push(seg);
    else groups.set(label, [seg]);
  }

  return Array.from(groups.entries()).map(([label, group]) => ({
    label,
    totalMs: group.reduce((sum, s) => sum + s.durationMs, 0),
    segments: group,
  }));
}

function buildNote(segments: ActivitySegment[]): string | undefined {
  if (segments.length === 0) return undefined;
  let earliest = segments[0].startedAt;
  let latest = segments[0].endedAt;
  for (const seg of segments) {
    if (seg.startedAt < earliest) earliest = seg.startedAt;
    if (seg.endedAt > latest) latest = seg.endedAt;
  }
  return `from:${new Date(earliest).toISOString()} | to:${new Date(latest).toISOString()} | switches:${segments.length}`;
}

/**
 * Batch path — one-shot conversion of a full segment set into
 * DistractionDrafts, no prior commit history (alreadyCommittedMs is always
 * 0 per group). Mirrors segmentsToSessions in session-builder.ts.
 */
export function segmentsToDistractions(
  segments: ActivitySegment[],
  runId?: string,
): DistractionDraft[] {
  const drafts: DistractionDraft[] = [];

  for (const group of groupOtherSegments(segments)) {
    // evaluateGroupForCommit only reads totalMs off the group shape, so a
    // DistractionGroupTotal (label instead of kind+language) satisfies it
    // exactly as well as a GroupTotal does — no cast needed.
    const decision = evaluateGroupForCommit(group, 0);
    if (!decision) continue;

    drafts.push({
      label: group.label,
      durationMinutes: decision.deltaMinutes,
      source: "native" as DistractionSource,
      note: buildNote(group.segments),
      runId,
    });
  }

  return drafts;
}
