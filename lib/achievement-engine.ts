import { Session } from "@/types/session";
import { Achievement } from "@/types/achievement";
import { getStreak, getLanguageBreakdown } from "@/lib/analytics-engine";
import { totalXP } from "@/lib/xp-system";
import achievementsData from "@/data/achievements.json";

export function evaluateAchievements(sessions: Session[]): Achievement[] {
  const streak = getStreak(sessions);
  const langBreakdown = getLanguageBreakdown(sessions);
  const totalCodingMinutes = sessions
    .filter((s) => s.kind === "coding")
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const xp = totalXP(sessions);
  const uniqueLanguages = new Set(sessions.map((s) => s.language)).size;
  const maxLangMinutes = langBreakdown[0]?.totalMinutes ?? 0;
  const codingRatio = sessions.length >= 10
    ? sessions.filter((s) => s.kind === "coding").length / sessions.length
    : 0;
  const hasMarathon = sessions.some((s) => s.durationMinutes >= 120);
  const hasEarlyBird = sessions.some((s) => new Date(s.startedAt).getHours() < 7);
  const hasNightOwl = sessions.some((s) => new Date(s.startedAt).getHours() >= 22);

  function clamp(v: number): number { return Math.min(1, Math.max(0, v)); }

  const rules: Record<string, () => Partial<Achievement>> = {
    first_session:    () => ({ unlocked: sessions.length > 0, progress: clamp(sessions.length) }),
    sessions_10:      () => ({ unlocked: sessions.length >= 10,  progress: clamp(sessions.length / 10),  progressLabel: `${sessions.length}/10 sessions` }),
    sessions_50:      () => ({ unlocked: sessions.length >= 50,  progress: clamp(sessions.length / 50),  progressLabel: `${sessions.length}/50 sessions` }),
    sessions_100:     () => ({ unlocked: sessions.length >= 100, progress: clamp(sessions.length / 100), progressLabel: `${sessions.length}/100 sessions` }),
    streak_3:         () => ({ unlocked: streak.longestStreak >= 3,   progress: clamp(streak.longestStreak / 3),   progressLabel: `${streak.longestStreak}/3 days` }),
    streak_7:         () => ({ unlocked: streak.longestStreak >= 7,   progress: clamp(streak.longestStreak / 7),   progressLabel: `${streak.longestStreak}/7 days` }),
    streak_14:        () => ({ unlocked: streak.longestStreak >= 14,  progress: clamp(streak.longestStreak / 14),  progressLabel: `${streak.longestStreak}/14 days` }),
    streak_30:        () => ({ unlocked: streak.longestStreak >= 30,  progress: clamp(streak.longestStreak / 30),  progressLabel: `${streak.longestStreak}/30 days` }),
    streak_100:       () => ({ unlocked: streak.longestStreak >= 100, progress: clamp(streak.longestStreak / 100), progressLabel: `${streak.longestStreak}/100 days` }),
    coding_1h:        () => ({ unlocked: totalCodingMinutes >= 60,    progress: clamp(totalCodingMinutes / 60),    progressLabel: `${Math.round(totalCodingMinutes)}m / 60m` }),
    coding_10h:       () => ({ unlocked: totalCodingMinutes >= 600,   progress: clamp(totalCodingMinutes / 600),   progressLabel: `${(totalCodingMinutes/60).toFixed(1)}h / 10h` }),
    coding_50h:       () => ({ unlocked: totalCodingMinutes >= 3000,  progress: clamp(totalCodingMinutes / 3000),  progressLabel: `${(totalCodingMinutes/60).toFixed(1)}h / 50h` }),
    coding_100h:      () => ({ unlocked: totalCodingMinutes >= 6000,  progress: clamp(totalCodingMinutes / 6000),  progressLabel: `${(totalCodingMinutes/60).toFixed(1)}h / 100h` }),
    coding_500h:      () => ({ unlocked: totalCodingMinutes >= 30000, progress: clamp(totalCodingMinutes / 30000), progressLabel: `${(totalCodingMinutes/60).toFixed(0)}h / 500h` }),
    languages_2:      () => ({ unlocked: uniqueLanguages >= 2, progress: clamp(uniqueLanguages / 2), progressLabel: `${uniqueLanguages}/2 languages` }),
    languages_5:      () => ({ unlocked: uniqueLanguages >= 5, progress: clamp(uniqueLanguages / 5), progressLabel: `${uniqueLanguages}/5 languages` }),
    language_10h:     () => ({ unlocked: maxLangMinutes >= 600,  progress: clamp(maxLangMinutes / 600),  progressLabel: `${(maxLangMinutes/60).toFixed(1)}h / 10h` }),
    language_50h:     () => ({ unlocked: maxLangMinutes >= 3000, progress: clamp(maxLangMinutes / 3000), progressLabel: `${(maxLangMinutes/60).toFixed(1)}h / 50h` }),
    xp_1000:          () => ({ unlocked: xp >= 1000,  progress: clamp(xp / 1000),  progressLabel: `${xp.toLocaleString()} / 1,000 XP` }),
    xp_10000:         () => ({ unlocked: xp >= 10000, progress: clamp(xp / 10000), progressLabel: `${xp.toLocaleString()} / 10,000 XP` }),
    focus_ratio:      () => ({ unlocked: codingRatio >= 0.8, progress: clamp(codingRatio / 0.8), progressLabel: `${Math.round(codingRatio * 100)}% coding ratio` }),
    session_marathon: () => ({ unlocked: hasMarathon }),
    early_bird:       () => ({ unlocked: hasEarlyBird }),
    night_owl:        () => ({ unlocked: hasNightOwl }),
  };

  return (achievementsData as Achievement[]).map((a) => {
    const rule = rules[a.id];
    const patch = rule ? rule() : {};
    return { ...a, ...patch };
  });
}
