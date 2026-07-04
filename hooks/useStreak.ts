"use client";
import { getStreak } from "@/lib/streak-system";
import { Session } from "@/types/session";

export function useStreak(sessions: Session[]) {
  return getStreak(sessions);
}
