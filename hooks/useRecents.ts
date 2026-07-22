"use client";
/**
 * useRecents — thin reader over RecentsContext.
 * Mirrors hooks/useShell.ts / hooks/useProjects.ts.
 */
import { useContext } from "react";
import { RecentsContext } from "@/lib/recents-context";

export function useRecents() {
  const ctx = useContext(RecentsContext);
  if (!ctx) throw new Error("useRecents must be used inside <RecentsProvider>");
  return ctx;
}
