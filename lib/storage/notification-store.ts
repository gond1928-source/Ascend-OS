/**
 * lib/storage/notification-store.ts
 *
 * Persists NotificationRecords. Same local-first seam as
 * report-store.ts/study-library-store.ts: everything above this works
 * purely in terms of NotificationRecord[].
 *
 * Also owns a tiny second key tracking which streak milestones have
 * already fired a notification (see lib/notifications-context.tsx) —
 * streaks themselves are derived fresh from sessions on every render
 * (lib/analytics-engine.ts's getStreak has no persisted state of its own),
 * so without this, "streak milestone reached" would refire the same
 * notification on every render past the threshold, not just once when it's
 * first crossed. Kept in this file rather than a separate store module
 * since it's a single number, not a real record list.
 */

const STORAGE_KEY = "ascend_notifications_v1";
const MILESTONE_KEY = "ascend_notified_streak_milestone_v1";

import { NotificationRecord } from "@/types/notification";

export interface NotificationStore {
  load(): Promise<NotificationRecord[]>;
  save(records: NotificationRecord[]): Promise<void>;
  clear(): Promise<void>;
  loadLastNotifiedStreakMilestone(): Promise<number>;
  saveLastNotifiedStreakMilestone(days: number): Promise<void>;
}

class LocalStorageNotificationStore implements NotificationStore {
  async load(): Promise<NotificationRecord[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as NotificationRecord[]) : [];
    } catch (err) {
      console.warn("[notification-store] Failed to load, starting clean:", err);
      return [];
    }
  }

  async save(records: NotificationRecord[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.error("[notification-store] Failed to save:", err);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }

  async loadLastNotifiedStreakMilestone(): Promise<number> {
    if (typeof window === "undefined") return 0;
    try {
      const raw = localStorage.getItem(MILESTONE_KEY);
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }

  async saveLastNotifiedStreakMilestone(days: number): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(MILESTONE_KEY, String(days));
    } catch (err) {
      console.error("[notification-store] Failed to save streak milestone:", err);
    }
  }
}

let storeInstance: NotificationStore | null = null;

export function getNotificationStore(): NotificationStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageNotificationStore();
  }
  return storeInstance;
}
