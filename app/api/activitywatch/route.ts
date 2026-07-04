import { NextResponse } from "next/server";
import {
  pingActivityWatch,
  fetchBucketEvents,
  classifyBucket,
  isWatchingEvent,
  eventsToSessions,
  AWBucket,
} from "@/lib/activitywatch";

export const dynamic = "force-dynamic";

interface PollResult {
  connected: boolean;
  bucketCount: number;
  buckets: Array<{ id: string; kind: string; client: string }>;
  vscodeBuckets: number;
  windowBuckets: number;
  webBuckets: number;
  sessionsDetected: number;
  sessions: unknown[];
  debug: Record<string, unknown>;
  error?: string;
}

export async function GET(): Promise<NextResponse<PollResult | { connected: false; error: string; sessions: [] }>> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const debug: Record<string, unknown> = { since: since.toISOString() };

  // One runId per poll request. Coding events (VS Code buckets) and
  // watching events (web/window buckets) are fetched and parsed in
  // separate eventsToSessions calls below, but they all represent one
  // logical "import from one poll" — passing the same runId to every call
  // is what lets the Sessions history display group them together, the
  // same way one native-tracker run's coding and watching fragments group.
  const runId = crypto.randomUUID();
  debug.runId = runId;

  let buckets: AWBucket[] = [];

  try {
    buckets = await pingActivityWatch();
    debug.rawBucketCount = buckets.length;
    debug.bucketIds = buckets.map((b) => b.id);
    console.log("[AW route] Buckets fetched:", buckets.length, buckets.map((b) => `${b.id} (${b.client})`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ActivityWatch not reachable";
    console.error("[AW route] pingActivityWatch failed:", msg);
    return NextResponse.json({ connected: false, error: msg, sessions: [] });
  }

  // Classify all buckets
  const classified = buckets.map((b) => ({ ...b, kind: classifyBucket(b) }));
  const vscodeBuckets = classified.filter((b) => b.kind === "vscode");
  const windowBuckets = classified.filter((b) => b.kind === "window");
  const webBuckets    = classified.filter((b) => b.kind === "web");

  console.log("[AW route] Classified:", {
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
      console.log(`[AW route] ${bucket.id}: ${events.length} events`);
      if (events.length > 0) {
        console.log(`[AW route] Sample event from ${bucket.id}:`, JSON.stringify(events[0]));
      }
      const parsed = eventsToSessions(events, "coding", undefined, runId);
      console.log(`[AW route] ${bucket.id} → ${parsed.length} coding sessions`);
      sessions.push(...parsed);
    } catch (err) {
      console.warn(`[AW route] Failed to fetch ${bucket.id}:`, err instanceof Error ? err.message : err);
    }
  }

  // ── Web watcher → learning sessions ─────────────────────────────────────────
  for (const bucket of webBuckets) {
    try {
      const events = await fetchBucketEvents(bucket.id, since);
      eventCounts[bucket.id] = events.length;
      console.log(`[AW route] ${bucket.id}: ${events.length} web events`);
      const watchingEvents = events.filter(isWatchingEvent);
      console.log(`[AW route] ${bucket.id}: ${watchingEvents.length} learning events`);
      const parsed = eventsToSessions(watchingEvents, "watching", undefined, runId);
      sessions.push(...parsed);
    } catch (err) {
      console.warn(`[AW route] Failed to fetch ${bucket.id}:`, err instanceof Error ? err.message : err);
    }
  }

  // ── Window watcher → fallback for app detection ──────────────────────────────
  for (const bucket of windowBuckets) {
    try {
      const events = await fetchBucketEvents(bucket.id, since);
      eventCounts[bucket.id] = events.length;
      console.log(`[AW route] ${bucket.id}: ${events.length} window events`);
      const watchingEvents = events.filter(isWatchingEvent);
      console.log(`[AW route] ${bucket.id}: ${watchingEvents.length} learning (window)`);
      if (watchingEvents.length > 0) {
        const parsed = eventsToSessions(watchingEvents, "watching", undefined, runId);
        sessions.push(...parsed);
      }
    } catch (err) {
      console.warn(`[AW route] Failed to fetch ${bucket.id}:`, err instanceof Error ? err.message : err);
    }
  }

  debug.eventCounts = eventCounts;
  debug.totalSessions = sessions.length;
  console.log(`[AW route] Total sessions built: ${sessions.length}`);

  return NextResponse.json({
    connected: true,
    bucketCount: buckets.length,
    buckets: classified.map((b) => ({ id: b.id, kind: b.kind, client: b.client })),
    vscodeBuckets: vscodeBuckets.length,
    windowBuckets: windowBuckets.length,
    webBuckets: webBuckets.length,
    sessionsDetected: sessions.length,
    sessions,
    debug,
  });
}
