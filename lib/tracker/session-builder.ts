/**
 * session-builder.ts — converts ActivitySegments into SessionDrafts, and
 * owns the ONE shared floor-evaluation policy used by both the batch path
 * (segmentsToSessions, below) and NativeTracker's incremental per-poll
 * commit path.
 *
 * Grouping rule: segments are grouped by (kind, language) and merged into
 * one draft per group (durations summed). This is the language-centric
 * grouping key — it's what allows one monitoring run containing Python
 * coding, Python tutorial watching, TS coding, and TS watching to become
 * FOUR session drafts (one per kind+language pair) instead of collapsing
 * into a single coding draft and a single watching draft:
 *
 *   Python coding + Python coding   → one "Python" / coding draft
 *   Python learning + Python learning → one "Python" / watching draft
 *   TS coding + TS coding           → one "TypeScript" / coding draft
 *   TS learning + TS learning       → one "TypeScript" / watching draft
 *
 * ActivityCategory "learning" | "watching" | "entertainment" all map to kind
 * "watching". "coding" maps to "coding". Everything else is dropped.
 *
 * Minimum-duration floor (the part both consumers must agree on):
 *   evaluateGroupForCommit() is the single source of truth for "given a
 *   group's current total and what's already been committed for it, what
 *   (if anything) is newly committable right now". Both segmentsToSessions
 *   (a one-shot call covering a full batch, alreadyCommittedMs always 0)
 *   and NativeTracker's commitClosedSegments (incremental, real running
 *   tally) call this exact function — there is no second implementation of
 *   the floor decision anywhere. See its doc comment for the full rationale.
 *
 * Run identity: every SessionDraft this module produces carries the same
 * runId the caller passed in (see segmentsToSessions's `runId` parameter).
 * This module does not invent or manage run identity itself — that's
 * NativeTracker's job (one runId per start()/stop() lifecycle) or the
 * caller's job for one-off batches (e.g. an ActivityWatch import).
 */

import { ActivitySegment } from "./types";
import { SessionDraft, SessionSource } from "@/types/session";

export type { SessionDraft } from "@/types/session";

export interface BuildResult {
  sessions: SessionDraft[];
}

// ── Internal helpers ─────────────────────────────────────────────────────────

type ActivityKind = "coding" | "watching";

/** Fallback label for a watching segment whose title carried no recognizable
 * language/topic (classifier.extractWatchingLanguage found nothing). This is
 * a neutral "uncategorized" bucket — NOT "Learning" and NOT inherited from
 * any adjacent coding segment — so it never falsely implies a specific
 * language was detected. */
const UNSPECIFIED_WATCHING_LANGUAGE = "Other";

/**
 * Maps ActivityCategory → session kind.
 *
 * Accepts every category name the classifier may emit for passive viewing:
 *   "learning" | "watching" | "entertainment" → "watching"
 *   "coding"                                  → "coding"
 *   "idle" | "other" | anything else          → null (dropped, not saved)
 */
function toKind(category: ActivitySegment["category"]): ActivityKind | null {
  if (category === "coding") return "coding";
  if (category === "learning" || category === "entertainment")
    return "watching";
  return null;
}

/**
 * The grouping key for a segment: kind + its own detected language.
 * A watching segment with no detected language groups under the neutral
 * UNSPECIFIED_WATCHING_LANGUAGE bucket rather than merging into whichever
 * language happens to be dominant elsewhere in the run.
 */
function groupKey(kind: ActivityKind, language: string | undefined): string {
  const lang = language ?? (kind === "watching" ? UNSPECIFIED_WATCHING_LANGUAGE : "Other");
  return `${kind}::${lang}`;
}

/**
 * Resolves the single language for an already-homogeneous group of
 * segments. By construction, every segment in `segments` was placed there
 * BECAUSE groupKey(seg.kind, seg.language) matched — so in the normal case
 * this just reads the shared language straight off the first segment.
 *
 * This used to be a majority-vote across all segments in the group, written
 * as if segments of genuinely different languages could land in the same
 * group and need arbitrating. They can't: groupKey is the only thing that
 * ever assigns a segment to a group, and it's keyed on (kind, language)
 * directly. A vote implies a possibility that doesn't exist upstream of
 * this function, which made the code read as more defensive/uncertain than
 * the actual architecture is.
 *
 * What's kept: a fallback for the genuinely-possible edge case of an EMPTY
 * group (defensive against future refactors of the grouping logic above,
 * not against mixed-language input within a real group).
 */
function resolveGroupLanguage(segments: ActivitySegment[], kind: ActivityKind): string {
  const fallback = kind === "watching" ? UNSPECIFIED_WATCHING_LANGUAGE : "Other";
  return segments[0]?.language ?? fallback;
}

function buildNote(segments: ActivitySegment[]): string | undefined {
  const parts: string[] = [];

  let earliest = segments[0]!.startedAt;
  let latest = segments[0]!.endedAt;
  for (const seg of segments) {
    if (seg.startedAt < earliest) earliest = seg.startedAt;
    if (seg.endedAt > latest) latest = seg.endedAt;
  }

  parts.push(`from:${new Date(earliest).toISOString()}`);
  parts.push(`to:${new Date(latest).toISOString()}`);

  const totalSnapshots = segments.reduce((n, s) => n + s.snapshotCount, 0);
  if (totalSnapshots > 0) parts.push(`snapshots:${totalSnapshots}`);

  const avgActive =
    segments.reduce((sum, s) => sum + s.metadata.activeRatio, 0) /
    segments.length;
  parts.push(`activeRatio:${Math.round(avgActive)}`);

  return parts.join(" | ");
}

// ── Main export ──────────────────────────────────────────────────────────────

/** The minimum total duration (ms) a (kind, language) group must reach,
 * summed across ALL its segments, before it's worth persisting as a
 * session. Used only by evaluateGroupForCommit below — never compared
 * against directly anywhere else, so there is exactly one place this
 * threshold's meaning can change. */
export const MIN_GROUP_DURATION_MS = 60_000;

/**
 * Groups segments by (kind, language) and returns each group's RAW total
 * duration in ms — no minimum-duration floor applied, no rounding, no
 * SessionDraft conversion. This is the lower-level building block that
 * segmentsToSessions itself uses internally, exposed separately so callers
 * that need to track running totals ACROSS MULTIPLE CALLS (like
 * NativeTracker's incremental per-poll commits) can compare "total so far"
 * against "total already committed" and derive just the delta, rather than
 * re-deriving a fresh SessionDraft from whatever small segment batch one
 * poll happens to see in isolation.
 */
export interface GroupTotal {
  kind: ActivityKind;
  language: string;
  totalMs: number;
  segments: ActivitySegment[];
}

export function groupSegmentsByKindLanguage(segments: ActivitySegment[]): GroupTotal[] {
  const groups = new Map<string, { kind: ActivityKind; segments: ActivitySegment[] }>();

  for (const seg of segments) {
    const kind = toKind(seg.category);
    if (kind === null) continue;

    const key = groupKey(kind, seg.language);
    const existing = groups.get(key);
    if (existing) {
      existing.segments.push(seg);
    } else {
      groups.set(key, { kind, segments: [seg] });
    }
  }

  return Array.from(groups.entries()).map(([key, { kind, segments: group }]) => ({
    kind,
    language: resolveGroupLanguage(group, kind),
    totalMs: group.reduce((sum, s) => sum + s.durationMs, 0),
    segments: group,
  }));
}

/**
 * THE single shared floor-evaluation policy. Given a group's current total
 * duration and how much of it has already been committed (turned into a
 * SessionDraft and persisted), decides whether anything new is committable
 * right now, and if so, how much.
 *
 * Used by both:
 *   - segmentsToSessions (below): one-shot, alreadyCommittedMs is always 0
 *     since a batch call has nothing "already committed" within itself.
 *   - NativeTracker.commitClosedSegments: incremental, alreadyCommittedMs is
 *     a real running tally carried across polls.
 *
 * Returning null means "nothing to commit yet" — either there's no new
 * delta, or the group's total hasn't crossed MIN_GROUP_DURATION_MS yet. The
 * floor is always judged against the group's CURRENT TOTAL, never against
 * the delta alone — see the inline comment below for why that distinction
 * matters for rapid switching.
 */
export interface CommitDecision {
  deltaMinutes: number;
  /** The new "already committed" ms value the caller should store for this
   * group going forward (alreadyCommittedMs + deltaMinutes worth of ms,
   * rounded — NOT group.totalMs directly, since committing must only ever
   * advance in whole-minute increments; the remainder is naturally picked
   * up by the next call once more time accumulates). */
  newCommittedMs: number;
}

export function evaluateGroupForCommit(
  group: Pick<GroupTotal, "totalMs">,
  alreadyCommittedMs: number,
  /**
   * Overrides the minimum-duration floor for this evaluation only, in ms.
   * Defaults to MIN_GROUP_DURATION_MS (60s) — the coding/watching session
   * path never passes this, so its floor stays exactly as before. Added so
   * NativeTracker's distraction-side commit path can drive the floor from
   * settings.capabilities.distractionFloorMinutes (see native-tracker.ts's
   * commitOtherSegments) without a second floor-decision implementation
   * anywhere — this function is still the ONE place that decides.
   */
  floorMs: number = MIN_GROUP_DURATION_MS,
): CommitDecision | null {
  const deltaMs = group.totalMs - alreadyCommittedMs;

  // Nothing new since the last time this group was evaluated.
  if (deltaMs <= 0) return null;

  // The group's CURRENT TOTAL must clear the floor for any of it to commit
  // yet — e.g. if Python coding is at 45s total (under the 60s floor), wait,
  // even though deltaMs alone might already be nonzero from a prior partial
  // state. Once the total crosses the floor, the FULL uncommitted delta
  // (everything since the last commit, which may itself span multiple short
  // bursts under rapid switching) commits at once. This is what lets a
  // string of real 20-30s bursts — each individually under the floor —
  // accumulate into one real session instead of each being judged against
  // the floor in isolation and discarded forever.
  if (group.totalMs < floorMs) return null;

  const deltaMinutes = Math.round(deltaMs / 60_000);
  if (deltaMinutes < 1) return null;

  return {
    deltaMinutes,
    newCommittedMs: alreadyCommittedMs + deltaMinutes * 60_000,
  };
}

/**
 * Converts ActivitySegments into SessionDrafts. This is the BATCH path —
 * a single call covering a full set of segments with no prior commit
 * history (alreadyCommittedMs is always 0 for every group). For the
 * incremental, poll-by-poll path where commit history persists across
 * calls, see NativeTracker.commitClosedSegments, which calls
 * evaluateGroupForCommit directly with a real running tally instead.
 *
 * Segments are grouped by (kind, language) — every distinct language gets
 * its own draft per kind, so coding and watching time for the same language
 * are reported as separate sessions but never blended across languages.
 *
 * Example:
 *   [15m Python coding, 10m Python learning, 20m TS coding, 5m TS learning]
 *   → [{ language: "Python",     kind: "coding",   durationMinutes: 15 },
 *      { language: "Python",     kind: "watching", durationMinutes: 10 },
 *      { language: "TypeScript", kind: "coding",   durationMinutes: 20 },
 *      { language: "TypeScript", kind: "watching", durationMinutes: 5  }]
 *
 * Segments with category "idle" or "other" are dropped.
 *
 * `runId`, when provided, is stamped onto every resulting draft — see
 * lib/session-grouping.ts for how this becomes the authoritative grouping
 * key for the Sessions history display.
 */
export function segmentsToSessions(segments: ActivitySegment[], runId?: string): BuildResult {
  if (segments.length === 0) return { sessions: [] };

  const sessions: SessionDraft[] = [];

  for (const group of groupSegmentsByKindLanguage(segments)) {
    const decision = evaluateGroupForCommit(group, 0);
    if (!decision) continue;

    sessions.push({
      language: group.language,
      kind: group.kind,
      durationMinutes: decision.deltaMinutes,
      source: "native" as SessionSource,
      note: buildNote(group.segments),
      runId,
    });
  }

  return { sessions };
}

// ── Legacy alias ─────────────────────────────────────────────────────────────

/** @deprecated Use segmentsToSessions instead. */
export function mergeSegmentsIntoSession(
  segments: ActivitySegment[],
): SessionDraft[] {
  return segmentsToSessions(segments).sessions;
}