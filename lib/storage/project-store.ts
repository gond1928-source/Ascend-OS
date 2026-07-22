/**
 * lib/storage/project-store.ts
 *
 * Same local-first seam as report-store.ts/study-library-store.ts —
 * everything above this works purely in terms of Project[].
 */

import { Project } from "@/types/project";

const STORAGE_KEY = "ascend_projects_v1";

export interface ProjectStore {
  load(): Promise<Project[]>;
  save(records: Project[]): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageProjectStore implements ProjectStore {
  async load(): Promise<Project[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Project[]) : [];
    } catch (err) {
      console.warn("[project-store.ts] Failed to load, starting clean:", err);
      return [];
    }
  }

  async save(records: Project[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.error("[project-store.ts] Failed to save:", err);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}

let storeInstance: ProjectStore | null = null;

export function getProjectStore(): ProjectStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageProjectStore();
  }
  return storeInstance;
}
