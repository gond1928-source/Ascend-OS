/**
 * lib/activitywatch/pollActivityWatch.ts
 *
 * The polling + session-building logic that used to live in
 * app/api/activitywatch/route.ts. Ported verbatim (including the debug
 * logging) now that the Next.js API route is gone — Tauri's static export
 * can't run server route handlers, so this now runs entirely client-side
 * and talks to ActivityWatch directly via lib/activitywatch.ts's
 * tauriFetch-backed pingActivityWatch()/fetchBucketEvents().
 *
 * One runId is generated per poll. Coding events (VS Code buckets) and
 * watching events (web/window buckets) are fetched and parsed in separate
 * eventsToSessions() calls below, but they all represent one logical
 * "import from one poll" — passing the same runId to every call is what
 * lets the Sessions history display group them together, the same way one
 * native-tracker run's coding and watching fragments group.
 */

import {
  pingActivityWatch,
  fetchBucketEvents,
  classifyBucket,
  isWatchingEvent,
  eventsToSessions,
  AWBucket,
} from "@/lib/activitywatch";

export interface PollResult {
  connected: boolean;
  bucketCount: number;
  buckets: Array<{ id: string; kind: string; client: string }>;
  vscodeBuckets: number;
  windowBuckets: number;
  webBuckets: number;
  sessionsDetected: number;
  sessions: ReturnType<typeof eventsToSessions>;
  debug: Record<string, unknown>;
  error?: string;
}

export async function pollActivityWatch(): Promise<PollResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const debug: Record<string, unknown> = { since: since.toISOString() };

  const runId = crypto.randomUUID();
  debug.runId = runId;

  let buckets: AWBucket[] = [];

  try {
    buckets = await pingActivityWatch();
    debug.rawBucketCount = buckets.length;
    debug.bucketIds = buckets.map((b) => b.id);
    console.log("[AW] Buckets fetched:", buckets.length, buckets.map((b) => `${b.id} (${b.client})`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ActivityWatch not reachable";
    console.error("[AW] pingActivityWatch failed:", msg);
    return {
      connected: false,
      bucketCount: 0,
      buckets: [],
      vscodeBuckets: 0,
      windowBuckets: 0,
      webBuckets: 0,
      sessionsDetected: 0,
      sessions: [],
      debug,
      error: msg,
    };
  }

  // Classify all buckets
  const classified = buckets.map((b) => ({ ...b, kind: classifyBucket(b) }));
  const vscodeBuckets = classified.filter((b) => b.kind === "vscode");
  const windowBuckets = classified.filter((b) => b.kind === "window");
  const webBuckets = classified.filter((b) => b.kind === "web");

  console.log("[AW] Classified:", {
    vscode: vscodeBuckets.map((b) => b.id),
    window: windowBuckets.map((b) => b.id),
    web: webBuckets.map((b) => b.id),
  });

  debug.classified = {
    vscode: vscodeBuckets.map((b) => b.id),
    window: windowBuckets.map((b) => b.id),
    web: webBuckets.map((b) => b.id),
  };

  const sessions: ReturnType<typeof eventsToSessions> = [];
  const eventCounts: Record<string, number> = {};

  // ── VS Code / Cursor → coding sessions ──────────────────────────────────────
  for (const bucket of vscodeBuckets) {
    try {
      const events = await fetchBucketEvents(bucket.id, since);
      eventCounts[bucket.id] = events.length;
      console.log(`[AW] ${bucket.id}: ${events.length} events`);
      if (events.length > 0) {
        console.log(`[AW] Sample event from ${bucket.id}:`, JSON.stringify(events[0]));
      }
      const parsed = eventsToSessions(events, "coding", undefined, runId);
      console.log(`[AW] ${bucket.id} → ${parsed.length} coding sessions`);
      sessions.push(...parsed);
    } catch (err) {
      console.warn(`[AW] Failed to fetch ${bucket.id}:`, err instanceof Error ? err.message : err);
    }
  }

  // ── Web watcher → learning sessions ─────────────────────────────────────────
  for (const bucket of webBuckets) {
    try {
      const events = await fetchBucketEvents(bucket.id, since);
      eventCounts[bucket.id] = events.length;
      console.log(`[AW] ${bucket.id}: ${events.length} web events`);
      const watchingEvents = events.filter(isWatchingEvent);
      console.log(`[AW] ${bucket.id}: ${watchingEvents.length} learning events`);
      const parsed = eventsToSessions(watchingEvents, "watching", undefined, runId);
      sessions.push(...parsed);
    } catch (err) {
      console.warn(`[AW] Failed to fetch ${bucket.id}:`, err instanceof Error ? err.message : err);
    }
  }

  // ── Window watcher → fallback for app detection ──────────────────────────────
  for (const bucket of windowBuckets) {
    try {
      const events = await fetchBucketEvents(bucket.id, since);
      eventCounts[bucket.id] = events.length;
      console.log(`[AW] ${bucket.id}: ${events.length} window events`);
      const watchingEvents = events.filter(isWatchingEvent);
      console.log(`[AW] ${bucket.id}: ${watchingEvents.length} learning (window)`);
      if (watchingEvents.length > 0) {
        const parsed = eventsToSessions(watchingEvents, "watching", undefined, runId);
        sessions.push(...parsed);
      }
    } catch (err) {
      console.warn(`[AW] Failed to fetch ${bucket.id}:`, err instanceof Error ? err.message : err);
    }
  }

  debug.eventCounts = eventCounts;
  debug.totalSessions = sessions.length;
  console.log(`[AW] Total sessions built: ${sessions.length}`);

  return {
    connected: true,
    bucketCount: buckets.length,
    buckets: classified.map((b) => ({ id: b.id, kind: b.kind, client: b.client })),
    vscodeBuckets: vscodeBuckets.length,
    windowBuckets: windowBuckets.length,
    webBuckets: webBuckets.length,
    sessionsDetected: sessions.length,
    sessions,
    debug,
  };
}
