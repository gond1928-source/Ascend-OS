/**
 * lib/detected-apps.ts — pure upsert logic for the DetectedApp registry.
 * Kept separate from lib/storage/detected-apps-store.ts (persistence) and
 * lib/tracker/native-tracker.ts (the only caller) so the "should this
 * count as a new detection worth writing" decision is independently
 * testable and never duplicated.
 */

import { DetectedApp } from "@/types/detected-app";
import { ActivityCategory } from "@/lib/tracker/types";

/** How often an already-known app's lastDetectedAt is allowed to refresh.
 * Someone coding continuously for an hour would otherwise re-touch (and
 * re-persist) their editor's entry on every single 5s poll — this bounds
 * writes to roughly once per window instead, which is more than enough
 * precision for a "last detected 13 hours ago"-style display. */
const REFRESH_THROTTLE_MS = 2 * 60_000;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Upserts a detection for (appName, category). Returns the SAME array
 * reference, unchanged, when nothing actually needs to change yet (already
 * registered, same category, still within the throttle window) — callers
 * compare by reference to decide whether a persistence write is even
 * needed, rather than writing on every call.
 */
export function recordDetection(
  existing: DetectedApp[],
  appName: string,
  category: Exclude<ActivityCategory, "idle">,
  now: number = Date.now(),
): DetectedApp[] {
  const key = normalize(appName);
  const idx = existing.findIndex((d) => normalize(d.appName) === key);
  const nowIso = new Date(now).toISOString();

  if (idx === -1) {
    const entry: DetectedApp = { appName, category, firstDetectedAt: nowIso, lastDetectedAt: nowIso };
    return [...existing, entry];
  }

  const current = existing[idx];
  const stale = now - new Date(current.lastDetectedAt).getTime() > REFRESH_THROTTLE_MS;
  const categoryChanged = current.category !== category;

  if (!stale && !categoryChanged) return existing;

  const next = [...existing];
  next[idx] = { ...current, category, lastDetectedAt: nowIso };
  return next;
}
