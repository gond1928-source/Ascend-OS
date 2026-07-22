/**
 * lib/storage/study-library-store.ts
 *
 * Persists StudyItem records (notes, PDFs, links, references, screenshots)
 * grouped by topic. Same local-first seam as the other stores in this
 * directory.
 */

import { StudyItem } from "@/types/document";

const STORAGE_KEY = "ascend_study_library_v1";

export interface StudyLibraryStore {
  load(): Promise<StudyItem[]>;
  save(items: StudyItem[]): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageStudyLibraryStore implements StudyLibraryStore {
  async load(): Promise<StudyItem[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as StudyItem[]) : [];
    } catch (err) {
      console.warn("[study-library-store] Failed to load, starting clean:", err);
      return [];
    }
  }

  async save(items: StudyItem[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error("[study-library-store] Failed to save:", err);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}

let storeInstance: StudyLibraryStore | null = null;

export function getStudyLibraryStore(): StudyLibraryStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageStudyLibraryStore();
  }
  return storeInstance;
}
