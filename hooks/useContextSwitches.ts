"use client";
/**
 * useContextSwitches — thin hook that reads from ContextSwitchContext.
 * Mirrors hooks/useSessions.ts / hooks/useDistractions.ts.
 */
import { useContext } from "react";
import { ContextSwitchContext } from "@/lib/context-switch-context";

export function useContextSwitches() {
  const ctx = useContext(ContextSwitchContext);
  if (!ctx) throw new Error("useContextSwitches must be used inside <ContextSwitchProvider>");
  return ctx;
}
