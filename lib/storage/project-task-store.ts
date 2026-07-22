/**
 * lib/storage/project-task-store.ts
 *
 * Same local-first seam as report-store.ts/study-library-store.ts —
 * everything above this works purely in terms of ProjectTask[].
 */

import { ProjectTask } from "@/types/project";

const STORAGE_KEY = "ascend_project_tasks_v1";

export interface ProjectTaskStore {
  load(): Promise<ProjectTask[]>;
  save(records: ProjectTask[]): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageProjectTaskStore implements ProjectTaskStore {
  async load(): Promise<ProjectTask[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ProjectTask[]) : [];
    } catch (err) {
      console.warn("[project-task-store.ts] Failed to load, starting clean:", err);
      return [];
    }
  }

  async save(records: ProjectTask[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.error("[project-task-store.ts] Failed to save:", err);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}

let storeInstance: ProjectTaskStore | null = null;

export function getProjectTaskStore(): ProjectTaskStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageProjectTaskStore();
  }
  return storeInstance;
}
