"use client";
/**
 * NotificationsContext — single source of truth for in-app notification
 * history + the gate into OS-level notifications (Phase 6).
 *
 * Same "one provider, not a standalone useState hook" reasoning as
 * projects-context.tsx: notifications are both written from several
 * unrelated places (report generation, study library, project resources,
 * export flow, streak tracking) and read from one shared UI surface (the
 * top-bar bell panel). A plain per-component hook would reproduce the
 * exact desync bug projects-context.tsx's header documents — two mounted
 * consumers, each with their own copy, one of them stale.
 *
 * Mounted in app/layout.tsx below SessionProvider (needs live sessions for
 * streak-milestone detection) and above ProjectsProvider (so ProjectsProvider
 * can call notify() when a resource is added).
 *
 * Two independent layers, per the phase spec:
 *  - In-app history: always recorded, regardless of Settings. It's just a
 *    log; muting OS notifications shouldn't blank out the log too.
 *  - OS notification: only fires if Settings → Notifications' master switch
 *    AND the specific event's toggle are both on. See types/settings.ts's
 *    NotificationsSettings for the four real toggles this checks.
 */

import { createContext, useCallback, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { NotificationRecord, NotificationKind } from "@/types/notification";
import { getNotificationStore } from "@/lib/storage/notification-store";
import { showNotification } from "@/lib/tauri/bridge";
import { useSessions } from "@/hooks/useSessions";
import { getStreak } from "@/lib/analytics-engine";
import { useSettings } from "@/hooks/useSettings";

/** Matches achievement-engine.ts's streak_3/7/14/30/100 thresholds, so a
 * milestone notification lines up with the same numbers the Achievements
 * page already treats as meaningful — not a second, competing definition
 * of "milestone". */
const STREAK_MILESTONES = [3, 7, 14, 30, 100];

export interface NotifyInput {
  kind: NotificationKind;
  title: string;
  subtitle: string;
  path: string;
}

interface NotificationsContextValue {
  notifications: NotificationRecord[];
  isLoading: boolean;
  unreadCount: number;
  notify: (input: NotifyInput) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/** Which Settings → Notifications toggle gates which event kind. */
function eventEnabled(kind: NotificationKind, notif: { reportGenerated: boolean; studyOrResourceAdded: boolean; streakMilestones: boolean; exportCompleted: boolean }): boolean {
  switch (kind) {
    case "report-generated": return notif.reportGenerated;
    case "study-item-added":
    case "resource-added": return notif.studyOrResourceAdded;
    case "streak-milestone": return notif.streakMilestones;
    case "export-completed": return notif.exportCompleted;
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useSettings();
  const { sessions } = useSessions();

  useEffect(() => {
    let cancelled = false;
    getNotificationStore().load().then((loaded) => {
      if (cancelled) return;
      setNotifications(loaded);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const notify = useCallback((input: NotifyInput) => {
    const record: NotificationRecord = {
      id: crypto.randomUUID(),
      kind: input.kind,
      title: input.title,
      subtitle: input.subtitle,
      createdAt: new Date().toISOString(),
      read: false,
      path: input.path,
    };

    // Layer 1 — in-app history. Always recorded.
    setNotifications((prev) => {
      const next = [record, ...prev];
      void getNotificationStore().save(next);
      return next;
    });

    // Layer 2 — OS notification. Gated behind the master switch + the
    // event's own toggle. Fire-and-forget: showNotification already
    // no-ops safely outside Tauri / without permission (bridge.ts).
    if (settings.notifications.enabled && eventEnabled(input.kind, settings.notifications)) {
      void showNotification(input.title, input.subtitle);
    }
  }, [settings.notifications]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      void getNotificationStore().save(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.read ? n : { ...n, read: true }));
      void getNotificationStore().save(next);
      return next;
    });
  }, []);

  // ── Streak milestone edge-detection ─────────────────────────────────────
  //
  // getStreak() is pure/derived — it has no memory of "have we already told
  // the person about this milestone", so without the guard below this would
  // fire again on every sessions change once currentStreak has crossed a
  // threshold. lastNotifiedRef starts as "unknown" (null) until the
  // persisted value loads, so a person who already has e.g. a 9-day streak
  // on their very first run under this feature doesn't immediately get
  // notified for 3 and 7 retroactively — only milestones crossed from here
  // forward.
  const lastNotifiedRef = useRef<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    getNotificationStore().loadLastNotifiedStreakMilestone().then((saved) => {
      if (!cancelled) lastNotifiedRef.current = saved > 0 ? saved : getStreak(sessions).currentStreak;
    });
    return () => {
      cancelled = true;
    };
    // Intentionally only on mount — this seeds the starting point once;
    // the effect below is what reacts to subsequent session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lastNotifiedRef.current === null) return; // not seeded yet
    const { currentStreak } = getStreak(sessions);
    const newlyCrossed = STREAK_MILESTONES.find(
      (m) => currentStreak >= m && lastNotifiedRef.current! < m,
    );
    if (newlyCrossed !== undefined) {
      lastNotifiedRef.current = newlyCrossed;
      void getNotificationStore().saveLastNotifiedStreakMilestone(newlyCrossed);
      notify({
        kind: "streak-milestone",
        title: `${newlyCrossed}-day streak`,
        subtitle: "Focus consistency milestone reached",
        path: "/achievements",
      });
    }
  }, [sessions, notify]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, isLoading, unreadCount, notify, markRead, markAllRead }),
    [notifications, isLoading, unreadCount, notify, markRead, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
