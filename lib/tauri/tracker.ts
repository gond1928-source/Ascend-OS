/**
 * lib/tauri/tracker.ts
 *
 * Frontend wrapper around the `get_window_snapshot` Rust command
 * (src-tauri/src/tracker.rs). Goes through tauriInvoke (lib/tauri/bridge.ts)
 * rather than importing @tauri-apps/api directly, per this codebase's rule
 * that bridge.ts is the only file allowed to touch the Tauri API — this
 * keeps the "safe in `next dev` without a Tauri window" fallback behavior
 * consistent everywhere.
 */

import { tauriInvoke } from "@/lib/tauri/bridge";
import type { WindowSnapshot } from "@/lib/tracker/types";
import { DEFAULT_TRACKER_CONFIG } from "@/lib/tracker/types";

/**
 * Fetch the current active-window snapshot from the OS via the Rust
 * `get_window_snapshot` command. Returns undefined when not running inside
 * Tauri (e.g. `next dev` in a browser) — callers should treat that the same
 * way they'd treat a failed fetch to /api/native-tracker.
 */
export async function getWindowSnapshot(): Promise<WindowSnapshot | undefined> {
  return tauriInvoke<WindowSnapshot>("get_window_snapshot", {
    idleThresholdSecs: Math.floor(DEFAULT_TRACKER_CONFIG.idleThresholdMs / 1000),
  });
}
