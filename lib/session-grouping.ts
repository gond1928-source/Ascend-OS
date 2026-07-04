/**
 * session-grouping.ts — display-only grouping of Session[] for the
 * Sessions history list.
 *
 * Problem: the native tracker persists coding and watching as SEPARATE
 * Session records, even when they came from the same monitoring run and
 * share a language (e.g. "Python coding 15m" + "Python watching 10m").
 * It can also commit the SAME kind in multiple fragments within one run —
 * e.g. under rapid switching, a 5m coding leg may cross the minimum-
 * duration floor and commit on its own, then a later 7m coding leg commits
 * separately once IT crosses the floor relative to what's already
 * committed. Both fragments are real, correctly non-overlapping time from
 * the same sitting; they should read as one "coding: 12m" total, not two
 * unrelated "coding" cards.
 *
 * This module ONLY affects how Session[] is grouped for display. It never
 * mutates, merges, or deletes the underlying records — deleting a group
 * still needs to resolve to deleting its individual session ids.
 *
 * Grouping rule (display only):
 *   Two sessions merge into one SessionGroup when they share the same
 *   `language` AND the same `runId`. `runId` is an authoritative identifier
 *   stamped at the point a session is CREATED — NativeTracker generates one
 *   per start()/stop() lifecycle and stamps it on every draft that
 *   lifecycle commits (lib/tracker/native-tracker.ts); the ActivityWatch
 *   import route generates one per poll request (app/api/activitywatch/
 *   route.ts); a manual log entry gets its own fresh id per submission
 *   (lib/session-factory.ts). This applies regardless of kind: coding+
 *   watching merge (the combined-bar case), and coding+coding or watching+
 *   watching from the same run also merge (their minutes simply sum within
 *   that kind).
 *
 * Why not infer grouping from timestamp proximity (the previous approach):
 *   The old version merged sessions whose time ranges were "close enough"
 *   (within ~10 minutes) as a heuristic stand-in for "these came from the
 *   same run". It worked, but it was fragile by construction — the 10
 *   minute window was reverse-engineered from how addSession happens to
 *   call `new Date()` in a tight loop, not derived from anything the data
 *   model actually guarantees. Any future change to how/when drafts get
 *   persisted (batching, a debounced write, an async queue) could silently
 *   break the heuristic with no error, either merging genuinely unrelated
 *   sessions or splitting a real run apart. runId removes the guesswork:
 *   grouping is now a direct equality check on data the producer
 *   deliberately set, not an inference from incidental timing.
 *
 * Migration: sessions persisted before this field existed (old localStorage
 * data, the static seed dataset) have no runId. Each such session becomes
 * its own singleton group — same as if it had a runId nobody else shares.
 * This is a deliberate choice: there's no reliable way to know which old
 * sessions actually belonged together, so the safe default is "treat them
 * as separate", matching how they would have rendered before any grouping
 * existed at all, rather than guessing and risking a wrong merge.
 */

import { Session } from "@/types/session";

export interface SessionGroup {
  /** Stable key for React lists — the earliest session id in the group. */
  id: string;
  language: string;
  /** All underlying session ids in this group, for delete operations. */
  sessionIds: string[];
  codingMinutes: number;
  watchingMinutes: number;
  /** Earliest startedAt across the group. */
  startedAt: string;
  /** Latest endedAt across the group. */
  endedAt: string;
  /** True when this group actually combines a coding session and a
   * watching session (the case the merged-bar UI is for). False when the
   * group only ever contains one kind (whether that's a single session or
   * several same-kind fragments summed together) — those render as a
   * single normal kind badge instead of a combined bar. */
  isCombined: boolean;
  /** Present only when isCombined is false — the single kind in this group. */
  soloKind: "coding" | "watching" | null;
  /** Sources represented in this group, for the "· native" style label. */
  sources: Session["source"][];
}

/**
 * The grouping key for a session: language + runId. A session with no
 * runId gets a key unique to itself (its own session id), so it can never
 * accidentally match another session that also lacks a runId — see the
 * migration note in the file header for why that's the safe default.
 */
function groupingKey(session: Session): string {
  const run = session.runId ?? `__no_run__:${session.id}`;
  return `${session.language}::${run}`;
}

/**
 * Groups sessions for display. Input does not need to be pre-sorted; output
 * groups are sorted by their most recent endedAt, descending (newest first),
 * matching the existing history list order.
 */
export function groupSessionsForDisplay(sessions: Session[]): SessionGroup[] {
  if (sessions.length === 0) return [];

  const byKey = new Map<string, { language: string; sessions: Session[] }>();

  for (const s of sessions) {
    const key = groupingKey(s);
    const existing = byKey.get(key);
    if (existing) {
      existing.sessions.push(s);
    } else {
      byKey.set(key, { language: s.language, sessions: [s] });
    }
  }

  const groups = Array.from(byKey.values()).map(({ language, sessions: group }) =>
    buildGroup(language, group)
  );

  // Newest first, matching the existing history list order.
  groups.sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
  return groups;
}

function buildGroup(language: string, sessions: Session[]): SessionGroup {
  const codingMinutes = sessions
    .filter((s) => s.kind === "coding")
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const watchingMinutes = sessions
    .filter((s) => s.kind === "watching")
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  const startedAt = sessions.reduce(
    (earliest, s) => (s.startedAt < earliest ? s.startedAt : earliest),
    sessions[0].startedAt
  );
  const endedAt = sessions.reduce(
    (latest, s) => (s.endedAt > latest ? s.endedAt : latest),
    sessions[0].endedAt
  );

  // "Combined" means both kinds are actually present — not just "more than
  // one session". Several same-kind fragments from one run (e.g. two
  // coding sessions that each crossed the commit floor separately) still
  // sum together, but they render as a single solo-kind badge, not the
  // combined coding/watching bar, since there's nothing to contrast.
  const isCombined = codingMinutes > 0 && watchingMinutes > 0;
  const soloKind: "coding" | "watching" | null = isCombined
    ? null
    : codingMinutes > 0
      ? "coding"
      : "watching";

  return {
    id: sessions[0].id,
    language,
    sessionIds: sessions.map((s) => s.id),
    codingMinutes,
    watchingMinutes,
    startedAt,
    endedAt,
    isCombined,
    soloKind,
    sources: Array.from(new Set(sessions.map((s) => s.source))),
  };
}
