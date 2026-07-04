"use client";
import { useMemo } from "react";
import { totalXP } from "@/lib/xp-system";
import { levelForXP } from "@/lib/level-system";
import { Session } from "@/types/session";

export function useXP(sessions: Session[]) {
  return useMemo(() => {
    const xp = totalXP(sessions);
    return { xp, ...levelForXP(xp) };
  }, [sessions]);
}
