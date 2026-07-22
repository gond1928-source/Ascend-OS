"use client";
/**
 * useShell — thin hook that reads from ShellContext.
 * Mirrors hooks/useSessions.ts / hooks/useDistractions.ts.
 */
import { useContext } from "react";
import { ShellContext } from "@/lib/shell-context";

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <ShellProvider>");
  return ctx;
}
