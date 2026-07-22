/**
 * lib/storage/project-note-store.ts
 *
 * Same local-first seam as report-store.ts/study-library-store.ts —
 * everything above this works purely in terms of ProjectNote[].
 */

import { ProjectNote } from "@/types/project";

const STORAGE_KEY = "ascend_project_notes_v1";

export interface ProjectNoteStore {
  load(): Promise<ProjectNote[]>;
  save(records: ProjectNote[]): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageProjectNoteStore implements ProjectNoteStore {
  async load(): Promise<ProjectNote[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ProjectNote[]) : [];
    } catch (err) {
      console.warn("[project-note-store.ts] Failed to load, starting clean:", err);
      return [];
    }
  }

  async save(records: ProjectNote[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.error("[project-note-store.ts] Failed to save:", err);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}

let storeInstance: ProjectNoteStore | null = null;

export function getProjectNoteStore(): ProjectNoteStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageProjectNoteStore();
  }
  return storeInstance;
}
