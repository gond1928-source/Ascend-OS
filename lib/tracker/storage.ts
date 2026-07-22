/**
 * Direct, synchronous session persistence — bypasses React state entirely.
 *
 * Why this exists:
 *   SessionContext's addSession() writes to localStorage from inside a React
 *   state updater. That's reliable for normal app usage, but it is NOT
 *   guaranteed to actually run before the page finishes unloading during a
 *   `pagehide` / `beforeunload` event — React may still be batching that
 *   update when the browser tears the page down.
 *
 *   This module writes straight to the same localStorage key, synchronously,
 *   with no React involved, so a refresh or tab close can never lose a
 *   session the tracker had already finalized and handed off.
 *
 *   Used ONLY by the native tracker's page-unload safety net
 *   (see hooks/useNativeTracker.ts). The normal commit path — regular
 *   segment closes and the "Stop monitoring" button — has plenty of time
 *   for React to flush normally and goes through addSession() as usual.
 *
 * IMPORTANT: this reads/writes through the exact same sync helpers
 * (lib/storage/session-store.ts's loadSessionsSync/saveSessionsSync) as
 * every other localStorage access in the app, so the storage key lives in
 * exactly one place. The actual draft->Session conversion is shared via
 * lib/session-factory.ts so the two paths can never drift apart on fields
 * like runId — only the storage mechanism (synchronous localStorage write
 * vs React state) differs here.
 */

import { SessionDraft } from "@/types/session";
import { draftsToSessions } from "@/lib/session-factory";
import { loadSessionsSync, saveSessionsSync } from "@/lib/storage/session-store";
import { DistractionDraft } from "@/types/distraction";
import { draftsToDistractions } from "@/lib/distraction-factory";
import { loadDistractionsSync, saveDistractionsSync } from "@/lib/storage/distraction-store";

/**
 * Append session drafts directly to localStorage, synchronously.
 * Best-effort: if storage is unavailable (SSR, privacy mode, quota), this
 * silently no-ops rather than throwing during an unload handler.
 */
export function persistDraftsDirectly(drafts: SessionDraft[]): void {
  if (typeof window === "undefined" || drafts.length === 0) return;
  try {
    const existing = loadSessionsSync();
    const newSessions = draftsToSessions(drafts, new Date());
    saveSessionsSync([...newSessions, ...existing]);
  } catch {
    // Nothing more we can do from inside an unload handler.
  }
}

/** Distraction-side equivalent of persistDraftsDirectly, for the same
 * page-unload safety net. See that function's doc comment above. */
export function persistDistractionDraftsDirectly(drafts: DistractionDraft[]): void {
  if (typeof window === "undefined" || drafts.length === 0) return;
  try {
    const existing = loadDistractionsSync();
    const newRecords = draftsToDistractions(drafts, new Date());
    saveDistractionsSync([...newRecords, ...existing]);
  } catch {
    // Nothing more we can do from inside an unload handler.
  }
}
