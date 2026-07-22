"use client";
/**
 * useNotifications — thin hook that reads from NotificationsContext.
 * Mirrors hooks/useSessions.ts / hooks/useShell.ts.
 */
import { useContext } from "react";
import { NotificationsContext } from "@/lib/notifications-context";

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationsProvider>");
  return ctx;
}
