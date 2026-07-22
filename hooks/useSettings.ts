"use client";
/**
 * useSettings — thin hook that reads from SettingsContext.
 * Mirrors hooks/useSessions.ts / hooks/useShell.ts.
 */
import { useContext } from "react";
import { SettingsContext } from "@/lib/settings-context";

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
