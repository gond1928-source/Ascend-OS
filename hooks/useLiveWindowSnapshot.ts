"use client";

/**
 * useLiveWindowSnapshot — polls get_window_snapshot (via
 * lib/tauri/tracker.ts, the same wrapper NativeTracker itself uses) purely
 * so the App Rules panel can show a live "currently focused" row, without
 * requiring monitoring to actually be running.
 *
 * This is intentionally a SEPARATE poll loop from NativeTracker's — it
 * never classifies, segments, or commits anything, and it does nothing
 * when `enabled` is false (the panel isn't open), so it has zero effect on
 * session/distraction data. It exists only to answer "what app is focused
 * right now", live, while a person is looking at App Rules.
 *
 * `enabled` should be wired to the App Rules panel's open/closed state —
 * polling stops the instant the panel closes.
 */

import { useEffect, useState } from "react";
import { getWindowSnapshot } from "@/lib/tauri/tracker";
import { isSelfSnapshot } from "@/constants/self-identity";
import type { WindowSnapshot } from "@/lib/tracker/types";

const POLL_INTERVAL_MS = 3_000;

export interface LiveWindowSnapshotState {
  snapshot: WindowSnapshot | null;
  /** True once at least one poll has completed (success or failure) — lets
   * the panel distinguish "still checking" from "genuinely nothing to
   * show" (e.g. not running inside Tauri). */
  hasPolled: boolean;
}

export function useLiveWindowSnapshot(enabled: boolean): LiveWindowSnapshotState {
  const [snapshot, setSnapshot] = useState<WindowSnapshot | null>(null);
  const [hasPolled, setHasPolled] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHasPolled(false);
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const next = await getWindowSnapshot();
        if (cancelled) return;
        // Ascend OS must never appear as "currently focused" here — see
        // constants/self-identity.ts. Treated exactly like "nothing
        // focused" rather than a special case the panel has to know about.
        setSnapshot(next && !isSelfSnapshot(next) ? next : null);
      } catch {
        if (cancelled) return;
        setSnapshot(null);
      } finally {
        if (!cancelled) setHasPolled(true);
      }
    }

    void poll();
    const intervalId = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [enabled]);

  return { snapshot, hasPolled };
}
