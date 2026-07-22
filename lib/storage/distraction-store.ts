/**
 * lib/storage/distraction-store.ts
 *
 * Mirrors session-store.ts exactly, one field for one concern: this is the
 * only place that decides how DistractionRecords are physically persisted.
 * Everything above this layer (DistractionContext, the analytics engine,
 * report engine) works purely in terms of `DistractionRecord[]`.
 *
 * Kept as a separate store (separate localStorage key) from sessions —
 * distraction time is never mixed into the Session[] array that drives
 * XP/quests/achievements/streaks.
 */

import { DistractionRecord } from "@/types/distraction";

export interface DistractionStore {
  load(): Promise<DistractionRecord[]>;
  save(records: DistractionRecord[]): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = "ascend_distractions_v1";

class LocalStorageDistractionStore implements DistractionStore {
  async load(): Promise<DistractionRecord[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as DistractionRecord[]) : [];
    } catch (err) {
      console.warn("[distraction-store] Failed to load, starting clean:", err);
      return [];
    }
  }

  async save(records: DistractionRecord[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.error("[distraction-store] Failed to save:", err);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Synchronous helpers for the same page-unload safety net session-store.ts
 * provides — see lib/tracker/storage.ts's persistDraftsDirectly. */
export function loadDistractionsSync(): DistractionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DistractionRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveDistractionsSync(records: DistractionRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error("[distraction-store] Failed to save (sync):", err);
  }
}

let storeInstance: DistractionStore | null = null;

export function getDistractionStore(): DistractionStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageDistractionStore();
  }
  return storeInstance;
}
