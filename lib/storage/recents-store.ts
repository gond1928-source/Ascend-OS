/**
 * lib/storage/recents-store.ts
 *
 * Persists RecentEntry[] for the sidebar's Recents section. Same
 * local-first seam as notification-store.ts/project-store.ts: everything
 * above this layer works purely in terms of RecentEntry[], not localStorage.
 */

import { RecentEntry } from "@/types/recent";

const STORAGE_KEY = "ascend_recents_v1";

export interface RecentsStore {
  load(): Promise<RecentEntry[]>;
  save(entries: RecentEntry[]): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageRecentsStore implements RecentsStore {
  async load(): Promise<RecentEntry[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as RecentEntry[]) : [];
    } catch (err) {
      console.warn("[recents-store] Failed to load, starting clean:", err);
      return [];
    }
  }

  async save(entries: RecentEntry[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (err) {
      console.error("[recents-store] Failed to save:", err);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}

let storeInstance: RecentsStore | null = null;

export function getRecentsStore(): RecentsStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageRecentsStore();
  }
  return storeInstance;
}
