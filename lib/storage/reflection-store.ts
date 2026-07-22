/**
 * lib/storage/reflection-store.ts
 *
 * Same seam as the other lib/storage/*-store.ts files — see
 * session-store.ts's header for the full rationale.
 *
 * Also exports a tiny same-tab subscribe/notify pair
 * (subscribeReflections). This exists for exactly one reason: XP/level is
 * displayed in several unrelated places at once (icon-rail identity,
 * Dashboard header, /sessions) via hooks/useXP.ts, which now folds
 * reflection XP into its total (see lib/xp-system.ts's reflectionBonusXP).
 * useXP only recomputes when its `sessions` argument changes — without
 * this notification, submitting today's reflection on the Dashboard
 * wouldn't update the XP shown in the icon rail until something else
 * happened to cause a re-render. Every consumer of useXP subscribes to
 * this and re-renders on any reflection write, anywhere in the app.
 */

import { ReflectionEntry } from "@/types/reflection";

export interface ReflectionStore {
  load(): Promise<ReflectionEntry[]>;
  save(entries: ReflectionEntry[]): Promise<void>;
}

const STORAGE_KEY = "ascend_reflections_v1";

type Listener = () => void;
const listeners = new Set<Listener>();

/** Subscribe to "reflection data changed" — returns an unsubscribe fn.
 * Fires on every saveReflectionsSync() call, same tab only (this is a
 * plain in-memory Set, not the browser `storage` event — cross-tab sync
 * isn't a goal here). */
export function subscribeReflections(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  listeners.forEach((l) => l());
}

class LocalStorageReflectionStore implements ReflectionStore {
  async load(): Promise<ReflectionEntry[]> {
    return loadReflectionsSync();
  }

  async save(entries: ReflectionEntry[]): Promise<void> {
    saveReflectionsSync(entries);
  }
}

export function loadReflectionsSync(): ReflectionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ReflectionEntry[]) : [];
  } catch (err) {
    console.warn("[reflection-store] Failed to load reflections, starting clean:", err);
    return [];
  }
}

export function saveReflectionsSync(entries: ReflectionEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error("[reflection-store] Failed to save reflections:", err);
  }
  notify();
}

let storeInstance: ReflectionStore | null = null;

export function getReflectionStore(): ReflectionStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageReflectionStore();
  }
  return storeInstance;
}
