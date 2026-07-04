/**
 * lib/storage/session-store.ts
 *
 * The ONLY place that decides *how* sessions are physically persisted.
 * Everything above this layer (SessionContext, useSessions, the analytics
 * engine, XP/streak/achievement systems) works purely in terms of
 * `Session[]` — none of it knows or cares whether that data came from
 * localStorage, a JSON file on disk, or (eventually) SQLite.
 *
 * Why this exists:
 *   Ascend OS is local-first — there is no backend, and no seeded/mock
 *   dataset. Every user starts with a completely empty store and all data
 *   is real, generated from their own tracked activity. To make that
 *   durable without locking the codebase to one storage mechanism forever,
 *   all reads/writes go through the `SessionStore` interface below.
 *
 * Migration path:
 *   Swapping to SQLite (via a Tauri SQL plugin) or a JSON-file-on-disk
 *   store (via Tauri's fs plugin) later means writing ONE new class that
 *   implements `SessionStore` and changing the single line in
 *   `getSessionStore()` that picks the active implementation — nothing in
 *   session-context.tsx, the analytics engine, or any component needs to
 *   change. That's the entire point of the seam.
 *
 * Current implementation:
 *   `LocalStorageSessionStore` — synchronous under the hood, but the
 *   interface is async so swapping in a real async backend (SQLite,
 *   filesystem) later is a non-breaking change for every caller.
 */

import { Session } from "@/types/session";

export interface SessionStore {
  /** Load all persisted sessions. Returns an empty array on first launch. */
  load(): Promise<Session[]>;
  /** Persist the full session list, replacing whatever was stored before. */
  save(sessions: Session[]): Promise<void>;
  /** Wipe all persisted sessions (used by "reset"/"clear all" flows). */
  clear(): Promise<void>;
}

const STORAGE_KEY = "ascend_sessions_v1";

/**
 * Default local-first store: browser/webview localStorage.
 * No seeded/mock data is ever written here — a missing key simply means
 * "no sessions yet", which is the correct first-launch state.
 */
class LocalStorageSessionStore implements SessionStore {
  async load(): Promise<Session[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Session[]) : [];
    } catch (err) {
      console.warn("[session-store] Failed to load sessions, starting clean:", err);
      return [];
    }
  }

  async save(sessions: Session[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.error("[session-store] Failed to save sessions:", err);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Same-tick synchronous helpers, used only by the page-unload safety net
 * (lib/tracker/storage.ts). `beforeunload`/`pagehide` handlers cannot
 * reliably await a promise before the page is torn down, so that one path
 * needs a genuinely synchronous read-modify-write. Every other caller in
 * the app should use the async `SessionStore` interface above.
 */
export function loadSessionsSync(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Session[]) : [];
  } catch {
    return [];
  }
}

export function saveSessionsSync(sessions: Session[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error("[session-store] Failed to save sessions (sync):", err);
  }
}

let storeInstance: SessionStore | null = null;

/**
 * The single switch-point for the whole app's persistence backend.
 * To migrate to SQLite/Prisma/Tauri-fs later: implement `SessionStore`
 * with the new backend and change the line below — nothing else moves.
 */
export function getSessionStore(): SessionStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageSessionStore();
  }
  return storeInstance;
}
