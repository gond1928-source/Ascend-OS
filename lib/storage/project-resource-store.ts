/**
 * lib/storage/project-resource-store.ts
 *
 * Same local-first seam as report-store.ts/study-library-store.ts —
 * everything above this works purely in terms of ProjectResource[].
 */

import { ProjectResource } from "@/types/project";

const STORAGE_KEY = "ascend_project_resources_v1";

export interface ProjectResourceStore {
  load(): Promise<ProjectResource[]>;
  save(records: ProjectResource[]): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageProjectResourceStore implements ProjectResourceStore {
  async load(): Promise<ProjectResource[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ProjectResource[]) : [];
    } catch (err) {
      console.warn("[project-resource-store.ts] Failed to load, starting clean:", err);
      return [];
    }
  }

  async save(records: ProjectResource[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.error("[project-resource-store.ts] Failed to save:", err);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}

let storeInstance: ProjectResourceStore | null = null;

export function getProjectResourceStore(): ProjectResourceStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageProjectResourceStore();
  }
  return storeInstance;
}
