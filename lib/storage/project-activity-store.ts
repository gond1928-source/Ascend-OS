/**
 * lib/storage/project-activity-store.ts
 *
 * Same local-first seam as report-store.ts/study-library-store.ts —
 * everything above this works purely in terms of ProjectActivityEntry[].
 */

import { ProjectActivityEntry } from "@/types/project";

const STORAGE_KEY = "ascend_project_activity_v1";

export interface ProjectActivityStore {
  load(): Promise<ProjectActivityEntry[]>;
  save(records: ProjectActivityEntry[]): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageProjectActivityStore implements ProjectActivityStore {
  async load(): Promise<ProjectActivityEntry[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ProjectActivityEntry[]) : [];
    } catch (err) {
      console.warn("[project-activity-store.ts] Failed to load, starting clean:", err);
      return [];
    }
  }

  async save(records: ProjectActivityEntry[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.error("[project-activity-store.ts] Failed to save:", err);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}

let storeInstance: ProjectActivityStore | null = null;

export function getProjectActivityStore(): ProjectActivityStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageProjectActivityStore();
  }
  return storeInstance;
}
