"use client";
/**
 * useDistractions — thin hook that reads from DistractionContext.
 * Mirrors hooks/useSessions.ts.
 */
import { useContext } from "react";
import { DistractionContext } from "@/lib/distraction-context";

export function useDistractions() {
  const ctx = useContext(DistractionContext);
  if (!ctx) throw new Error("useDistractions must be used inside <DistractionProvider>");
  return ctx;
}
