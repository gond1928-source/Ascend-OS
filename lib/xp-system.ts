import { XP_PER_CODING_MINUTE, XP_PER_WATCHING_MINUTE, XP_STREAK_BONUS_PER_DAY, XP_MAX_STREAK_MULTIPLIER } from "@/constants/xp-values";
import { Session } from "@/types/session";
import { getStreak } from "@/lib/analytics-engine";

export function xpForSession(session: Pick<Session, "kind" | "durationMinutes">): number {
  const rate = session.kind === "coding" ? XP_PER_CODING_MINUTE : XP_PER_WATCHING_MINUTE;
  return Math.round(session.durationMinutes * rate);
}

export function totalXP(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  const streak = getStreak(sessions);
  const multiplier = Math.min(
    XP_MAX_STREAK_MULTIPLIER,
    1 + streak.currentStreak * XP_STREAK_BONUS_PER_DAY
  );
  const base = sessions.reduce((sum, s) => sum + xpForSession(s), 0);
  return Math.round(base * multiplier);
}
