import { XP_PER_CODING_MINUTE, XP_PER_WATCHING_MINUTE, XP_STREAK_BONUS_PER_DAY, XP_MAX_STREAK_MULTIPLIER } from "@/constants/xp-values";
import { Session } from "@/types/session";
import { ReflectionEntry } from "@/types/reflection";
import { getStreak } from "@/lib/analytics-engine";

export function xpForSession(session: Pick<Session, "kind" | "durationMinutes">): number {
  const rate = session.kind === "coding" ? XP_PER_CODING_MINUTE : XP_PER_WATCHING_MINUTE;
  return Math.round(session.durationMinutes * rate);
}

/**
 * Sum of every ReflectionEntry's recorded xpAwarded — all-time, flat.
 * Deliberately NOT read from getStreak()/any streak-related code path:
 * reflection participation must never affect streaks (see
 * types/reflection.ts's header), so this stays a completely separate,
 * additive number that only ever flows into totalXP() below.
 */
export function reflectionBonusXP(entries: ReflectionEntry[]): number {
  return entries.reduce((sum, e) => sum + e.xpAwarded, 0);
}

/**
 * `bonusXP` (reflectionBonusXP's output, in practice) is added AFTER the
 * streak multiplier, unmultiplied — it's a flat reward for participating,
 * not activity that should be amplified by a coding streak. Kept as a
 * plain parameter (not read internally) so this function stays pure and
 * testable; hooks/useXP.ts is what actually wires the reflection store in.
 */
/**
 * Sum of today's session XP only, weighted by the current streak
 * multiplier — same accounting totalXP() uses, just scoped to today's
 * sessions instead of all-time. Deliberately does NOT add today's
 * reflection bonus (REFLECTION_XP_FLAT): the Reflection section already
 * surfaces that "+15" next to its own row, so folding it in here would
 * either double-count visually or require lifting useReflection() to a
 * page level that doesn't otherwise need it. This is a quiet hero/quest
 * -summary stat, not a full ledger.
 */
export function todayXP(sessions: Session[]): number {
  const todayKey = new Date().toISOString().slice(0, 10);
  const todays = sessions.filter((s) => s.startedAt.slice(0, 10) === todayKey);
  if (todays.length === 0) return 0;
  const streak = getStreak(sessions);
  const multiplier = Math.min(
    XP_MAX_STREAK_MULTIPLIER,
    1 + streak.currentStreak * XP_STREAK_BONUS_PER_DAY,
  );
  const base = todays.reduce((sum, s) => sum + xpForSession(s), 0);
  return Math.round(base * multiplier);
}

export function totalXP(sessions: Session[], bonusXP: number = 0): number {
  if (sessions.length === 0) return bonusXP;
  const streak = getStreak(sessions);
  const multiplier = Math.min(
    XP_MAX_STREAK_MULTIPLIER,
    1 + streak.currentStreak * XP_STREAK_BONUS_PER_DAY
  );
  const base = sessions.reduce((sum, s) => sum + xpForSession(s), 0);
  return Math.round(base * multiplier) + bonusXP;
}
