/**
 * Segmenter — converts a stream of ClassifiedSnapshots into ActivitySegments.
 *
 * Intelligence rules (v2):
 *
 * 1. SHORT INTERRUPTIONS (<shortInterruptionMs = 15s) are debounced:
 *    a brief switch to another app and back does NOT split the segment.
 *
 * 2. CODING IDLE: if we're in a coding segment and see N consecutive
 *    snapshots without keyboardActivityDetected, the coding segment ends.
 *    This enforces the 60s idle threshold for coding.
 *
 * 3. SEGMENT TRANSITIONS: meaningful category change immediately closes
 *    the current segment and opens a new one (no blending).
 *
 * 4. METADATA is computed per segment for session notes:
 *    - activeRatio, typingIntensity, interruptionCount, distractionSwitches
 */

import {
  ActivitySegment,
  ClassifiedSnapshot,
  SegmentMetadata,
  TrackerConfig,
  DEFAULT_TRACKER_CONFIG,
} from "./types";

export function buildSegments(
  snapshots: ClassifiedSnapshot[],
  config: TrackerConfig = DEFAULT_TRACKER_CONFIG,
): ActivitySegment[] {
  if (snapshots.length === 0) return [];

  const segments: ActivitySegment[] = [];

  // Working buffer for the current segment
  let buffer: ClassifiedSnapshot[] = [snapshots[0]];
  // Track distraction / interruption counts across the segment buffer
  let interruptionCount = 0;
  let distractionSwitches = 0;
  // Track the last "committed" category to detect real switches
  let committedCategory = snapshots[0].category;
  // Consecutive idle-coding snapshots (no keyboard in IDE)
  let codingIdleStreak = 0;
  const codingIdleStreakMax = Math.ceil(config.codingIdleThresholdMs / config.pollIntervalMs);
  // Consecutive truly-idle snapshots while in a learning/watching segment.
  // Learning does NOT require keyboard activity — the threshold is the same
  // system-wide idle threshold (idleThresholdMs, default 60s). A user watching
  // a video is allowed to sit still; only genuine system idle closes the segment.
  let learningIdleStreak = 0;
  const learningIdleStreakMax = Math.ceil(config.idleThresholdMs / config.pollIntervalMs);
  // Number of consecutive snapshots seen in a *different* category than committedCategory.
  // A "short interruption" is defined as fewer than this many consecutive off-category
  // snapshots — e.g. with pollIntervalMs=5s and shortInterruptionMs=15s, max 3 polls
  // away before we treat it as a real transition.
  // NOTE: we must NOT use (curr.capturedAt - prev.capturedAt) for this check — that
  // value is always ~1 poll interval and would make EVERY switch look like an interruption.
  let offCategoryStreak = 0;
  const shortInterruptionStreakMax = Math.ceil(config.shortInterruptionMs / config.pollIntervalMs);

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];
    const gap = curr.capturedAt - prev.capturedAt;

    // ── Gap too long → force flush ────────────────────────────────────────────
    if (gap > config.mergeGapMs) {
      const seg = flushSegment(buffer, config, interruptionCount, distractionSwitches);
      if (seg) segments.push(seg);
      buffer = [curr];
      committedCategory = curr.category;
      interruptionCount = 0;
      distractionSwitches = 0;
      codingIdleStreak = 0;
      learningIdleStreak = 0;
      offCategoryStreak = 0;
      continue;
    }

    // ── Coding idle detection ─────────────────────────────────────────────────
    // If current segment is coding and this snapshot has no keyboard activity,
    // increment the idle streak. Once it exceeds threshold, close the segment.
    if (committedCategory === "coding") {
      if (!curr.keyboardActivityDetected || curr.category !== "coding") {
        codingIdleStreak++;
      } else {
        codingIdleStreak = 0; // typing resumed
      }

      if (codingIdleStreak >= codingIdleStreakMax) {
        // Flush coding segment up to the last active snapshot
        const activeBuffer = buffer.filter((s) => s.isActivelyCoding || s.keyboardActivityDetected);
        const seg = flushSegment(activeBuffer.length > 0 ? activeBuffer : buffer.slice(0, -codingIdleStreak), config, interruptionCount, distractionSwitches);
        if (seg) segments.push(seg);
        // Start new segment from current (which may be idle/other)
        buffer = [curr];
        committedCategory = curr.category;
        interruptionCount = 0;
        distractionSwitches = 0;
        codingIdleStreak = 0;
        learningIdleStreak = 0;
        offCategoryStreak = 0;
        continue;
      }
    }

    // ── Learning / watching idle detection ────────────────────────────────────
    // Learning sessions do NOT require keyboard activity — a user watching a
    // tutorial video is supposed to be hands-off. We only close the segment
    // when the system reports truly idle (isUserActive: false) for the full
    // idleThresholdMs duration (same as the hard idle gate, default 60s).
    // Keyboard activity or a learning-classified snapshot both reset the streak.
    if (committedCategory === "learning") {
      const isGenuinelyIdle = !curr.isUserActive && curr.category !== "learning";
      if (isGenuinelyIdle) {
        learningIdleStreak++;
      } else {
        learningIdleStreak = 0; // any activity or continued learning resets it
      }

      if (learningIdleStreak >= learningIdleStreakMax) {
        const seg = flushSegment(buffer.slice(0, -learningIdleStreak), config, interruptionCount, distractionSwitches);
        if (seg) segments.push(seg);
        buffer = [curr];
        committedCategory = curr.category;
        interruptionCount = 0;
        distractionSwitches = 0;
        learningIdleStreak = 0;
        codingIdleStreak = 0;
        offCategoryStreak = 0;
        continue;
      }
    }

    // ── Category switch detection ─────────────────────────────────────────────
    // We count consecutive polls in the new category to distinguish a transient
    // one-poll blip (notification, quick alt-tab) from a real sustained switch.
    // A single poll gap is always ~pollIntervalMs, so comparing a time delta to
    // shortInterruptionMs would always evaluate true and swallow every transition.
    const categoryChanged = curr.category !== committedCategory;

    if (categoryChanged) {
      offCategoryStreak++;

      if (offCategoryStreak <= shortInterruptionStreakMax) {
        // Still within the debounce window — treat as a transient blip.
        // IMPORTANT: these off-category snapshots are pushed into `buffer`
        // so a blip that snaps back to the committed category (handled in
        // the `else` branch below) keeps its place in the segment uninterrupted.
        // But if the streak instead turns into a SUSTAINED switch (handled
        // just below, next iteration), these same snapshots must NOT count
        // toward the segment being closed — they belong to the new segment.
        // Tracking is finalized at flush time; see the sustained-switch
        // branch, which strips exactly this many trailing snapshots back out
        // of the buffer before flushing.
        distractionSwitches++;
        buffer.push(curr);
        continue;
      }

      // Sustained switch: offCategoryStreak has exceeded the threshold.
      // The last `offCategoryStreak` entries in `buffer` are the debounced
      // off-category snapshots that were optimistically appended above while
      // we waited to see if they'd revert. They never reverted, so they must
      // NOT be charged against the segment being closed — doing so shrinks
      // its measured duration by up to shortInterruptionMs for no real
      // reason, which can (and did) push a perfectly real, multi-minute
      // segment just under minSegmentMs and cause it to be silently dropped
      // by flushSegment. Strip them back out before flushing, and seed the
      // new segment's buffer with them (plus the current snapshot) instead,
      // so that time is preserved rather than discarded.
      const committedBuffer = buffer.slice(0, buffer.length - (offCategoryStreak - 1));
      const carriedOverSnapshots = buffer.slice(buffer.length - (offCategoryStreak - 1));

      const seg = flushSegment(committedBuffer, config, interruptionCount, distractionSwitches);
      if (seg) segments.push(seg);
      buffer = [...carriedOverSnapshots, curr];
      committedCategory = curr.category;
      interruptionCount++;
      distractionSwitches = 0;
      codingIdleStreak = 0;
      learningIdleStreak = 0;
      offCategoryStreak = 0;
    } else {
      // Back on the committed category — reset the off-category streak
      offCategoryStreak = 0;
      buffer.push(curr);
    }
  }

  // Flush final buffer
  const last = flushSegment(buffer, config, interruptionCount, distractionSwitches);
  if (last) segments.push(last);

  return segments;
}

function computeMetadata(
  snapshots: ClassifiedSnapshot[],
  interruptionCount: number,
  distractionSwitches: number,
): SegmentMetadata {
  if (snapshots.length === 0) {
    return { activeRatio: 0, interruptionCount: 0, typingIntensity: 0, distractionSwitches: 0 };
  }

  const activeSnapshots = snapshots.filter((s) => s.isUserActive).length;
  const typingSnapshots = snapshots.filter((s) => s.keyboardActivityDetected).length;

  const activeRatio = Math.round((activeSnapshots / snapshots.length) * 100);
  const typingIntensity = Math.round((typingSnapshots / snapshots.length) * 100);

  return {
    activeRatio,
    interruptionCount,
    typingIntensity,
    distractionSwitches,
  };
}

function flushSegment(
  snapshots: ClassifiedSnapshot[],
  config: TrackerConfig,
  interruptionCount: number,
  distractionSwitches: number,
): ActivitySegment | null {
  if (snapshots.length === 0) return null;

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const estimatedEnd = last.capturedAt + config.pollIntervalMs;
  const durationMs = estimatedEnd - first.capturedAt;

  // NOTE: there is intentionally NO per-segment minimum-duration filter here.
  // It used to live here (dropping any segment under config.minSegmentMs),
  // which silently destroyed real activity under rapid switching: e.g. six
  // 20-30s coding/watching bursts in a row would each individually fall
  // under the 60s floor and vanish, even though their totals (83s coding,
  // 66s watching) clearly represent real, countable time. The floor is now
  // applied in session-builder.ts, AFTER summing every segment that shares
  // the same (kind, language) — so isolated short blips still get filtered
  // out (a single 20s blip alone stays under the floor and is dropped), but
  // a string of short same-kind/language bursts that add up to something
  // real survives. See segmentsToSessions in session-builder.ts.

  // Majority-vote category
  const categoryCounts = new Map<string, number>();
  for (const s of snapshots) {
    categoryCounts.set(s.category, (categoryCounts.get(s.category) ?? 0) + 1);
  }
  const category = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0][0] as ActivitySegment["category"];

  // Majority language
  const langCounts = new Map<string, number>();
  for (const s of snapshots) {
    if (s.language) langCounts.set(s.language, (langCounts.get(s.language) ?? 0) + 1);
  }
  const language = langCounts.size > 0
    ? [...langCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : undefined;

  // Primary app
  const appCounts = new Map<string, number>();
  for (const s of snapshots) appCounts.set(s.appName, (appCounts.get(s.appName) ?? 0) + 1);
  const primaryApp = [...appCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const metadata = computeMetadata(snapshots, interruptionCount, distractionSwitches);

  return {
    category,
    language,
    startedAt: first.capturedAt,
    endedAt: estimatedEnd,
    durationMs,
    snapshotCount: snapshots.length,
    primaryApp,
    metadata,
  };
}