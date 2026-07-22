"use client";
/**
 * useAppRules — thin hook that reads from AppRulesContext.
 * Mirrors hooks/useSessions.ts / hooks/useSettings.ts.
 */
import { useContext } from "react";
import { AppRulesContext } from "@/lib/app-rules-context";

export function useAppRules() {
  const ctx = useContext(AppRulesContext);
  if (!ctx) throw new Error("useAppRules must be used inside <AppRulesProvider>");
  return ctx;
}
