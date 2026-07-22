/**
 * lib/storage/context-switch-store.ts
 *
 * Mirrors session-store.ts / distraction-store.ts exactly — the only place
 * that decides how ContextSwitchEvents are physically persisted. Everything
 * above this layer (ContextSwitchContext, the analytics engine, report
 * engine) works purely in terms of `ContextSwitchEvent[]`.
 *
 * Kept as its own store (own localStorage key) — see types/context-switch.ts's
 * header for why this is a separate concept from distraction time.
 */

import { ContextSwitchEvent } from "@/types/context-switch";

export interface ContextSwitchStore {
  load(): Promise<ContextSwitchEvent[]>;
  save(events: ContextSwitchEvent[]): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = "ascend_context_switches_v1";

class LocalStorageContextSwitchStore implements ContextSwitchStore {
  async load(): Promise<ContextSwitchEvent[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ContextSwitchEvent[]) : [];
    } catch (err) {
      console.warn("[context-switch-store] Failed to load, starting clean:", err);
      return [];
    }
  }

  async save(events: ContextSwitchEvent[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (err) {
      console.error("[context-switch-store] Failed to save:", err);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Synchronous helpers for the same page-unload safety net session-store.ts
 * / distraction-store.ts provide — see lib/tracker/storage.ts. */
export function loadContextSwitchesSync(): ContextSwitchEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ContextSwitchEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveContextSwitchesSync(events: ContextSwitchEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error("[context-switch-store] Failed to save (sync):", err);
  }
}

let storeInstance: ContextSwitchStore | null = null;

export function getContextSwitchStore(): ContextSwitchStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageContextSwitchStore();
  }
  return storeInstance;
}
