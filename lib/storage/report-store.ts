/**
 * lib/storage/report-store.ts
 *
 * Persists generated ReportRecords (Weekly/Monthly). Same local-first
 * seam as session-store.ts/distraction-store.ts: everything above this
 * works purely in terms of ReportRecord[].
 */

import { ReportRecord } from "@/types/document";

const STORAGE_KEY = "ascend_reports_v1";

export interface ReportStore {
  load(): Promise<ReportRecord[]>;
  save(records: ReportRecord[]): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageReportStore implements ReportStore {
  async load(): Promise<ReportRecord[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ReportRecord[]) : [];
    } catch (err) {
      console.warn("[report-store] Failed to load, starting clean:", err);
      return [];
    }
  }

  async save(records: ReportRecord[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.error("[report-store] Failed to save:", err);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}

let storeInstance: ReportStore | null = null;

export function getReportStore(): ReportStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageReportStore();
  }
  return storeInstance;
}
