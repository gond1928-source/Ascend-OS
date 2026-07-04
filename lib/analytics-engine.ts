import { Session } from "@/types/session";
import {
  AnalyticsSummary,
  DailyActivity,
  HeatmapCell,
  LanguageBreakdown,
  StreakInfo,
  TrendPoint,
  WeeklyTrendPoint,
  WeekOverWeekTrend,
} from "@/types/analytics";
import { languageColor } from "@/constants/languages";

/**
 * All analytics math lives here, isolated from any UI concern.
 * Every function is pure: (sessions, options) -> data. Components and API
 * routes should never compute aggregates themselves — they call into this
 * engine so the dashboard, the API, and (later) a server-side cron job all
 * agree on one definition of "coding time" vs "watching time".
 */

function toDateKey(iso: string): string {
  return iso.slice(0, 10); // yyyy-MM-dd
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getLanguageBreakdown(sessions: Session[]): LanguageBreakdown[] {
  const map = new Map<string, LanguageBreakdown>();

  for (const s of sessions) {
    // Both coding and watching sessions carry a real per-session language
    // (set at classification/session-build time) — neither kind is skipped
    // here. This is what lets "Python: coding 15m / watching 10m" appear as
    // a single combined entry instead of watching time vanishing.
    const entry =
      map.get(s.language) ??
      ({
        language: s.language,
        codingMinutes: 0,
        watchingMinutes: 0,
        totalMinutes: 0,
        color: languageColor(s.language),
      } satisfies LanguageBreakdown);

    if (s.kind === "coding") entry.codingMinutes += s.durationMinutes;
    else entry.watchingMinutes += s.durationMinutes;
    entry.totalMinutes = entry.codingMinutes + entry.watchingMinutes;

    map.set(s.language, entry);
  }

  return Array.from(map.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
}

export function getDailyActivity(sessions: Session[], days = 30): DailyActivity[] {
  const today = startOfDay(new Date());
  const buckets = new Map<string, DailyActivity>();

  for (let i = days - 1; i >= 0; i--) {
    const key = formatDateKey(addDays(today, -i));
    buckets.set(key, { date: key, codingMinutes: 0, watchingMinutes: 0 });
  }

  for (const s of sessions) {
    const key = toDateKey(s.startedAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (s.kind === "coding") bucket.codingMinutes += s.durationMinutes;
    else bucket.watchingMinutes += s.durationMinutes;
  }

  return Array.from(buckets.values());
}

export function getWeeklyTrend(sessions: Session[], weeks = 8): WeeklyTrendPoint[] {
  const today = startOfDay(new Date());
  const points: WeeklyTrendPoint[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = addDays(today, -w * 7);
    const weekStart = addDays(weekEnd, -6);

    let coding = 0;
    let watching = 0;
    for (const s of sessions) {
      const d = startOfDay(new Date(s.startedAt));
      if (d >= weekStart && d <= weekEnd) {
        if (s.kind === "coding") coding += s.durationMinutes;
        else watching += s.durationMinutes;
      }
    }

    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    points.push({
      weekLabel: `${fmt(weekStart)} – ${fmt(weekEnd)}`,
      codingMinutes: coding,
      watchingMinutes: watching,
    });
  }

  return points;
}

export function getHeatmap(sessions: Session[], days = 119): HeatmapCell[] {
  const daily = getDailyActivity(sessions, days);
  const max = Math.max(1, ...daily.map((d) => d.codingMinutes + d.watchingMinutes));

  return daily.map((d) => {
    const total = d.codingMinutes + d.watchingMinutes;
    const ratio = total / max;
    let intensity: HeatmapCell["intensity"] = 0;
    if (total > 0) intensity = 1;
    if (ratio > 0.25) intensity = 2;
    if (ratio > 0.5) intensity = 3;
    if (ratio > 0.75) intensity = 4;
    return { date: d.date, totalMinutes: total, intensity };
  });
}

export function getStreak(sessions: Session[]): StreakInfo {
  const activeDays = new Set(
    sessions.filter((s) => s.durationMinutes > 0).map((s) => toDateKey(s.startedAt))
  );

  if (activeDays.size === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  }

  const sortedDates = Array.from(activeDays)
    .map((d) => new Date(d + "T00:00:00Z"))
    .sort((a, b) => a.getTime() - b.getTime());

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / 86400000;
    run = diff === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // current streak: walk back from today/yesterday while days are active
  const today = startOfDay(new Date());
  let cursor = activeDays.has(formatDateKey(today)) ? today : addDays(today, -1);
  let current = 0;
  while (activeDays.has(formatDateKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    currentStreak: current,
    longestStreak: longest,
    lastActiveDate: sortedDates[sortedDates.length - 1].toISOString().slice(0, 10),
  };
}

/**
 * Trend calculation — isolated from the rest of the engine.
 * Compares the last 7 days to the 7 days before that. Nothing above this
 * function is read or modified by it; it only re-derives its own totals
 * from `sessions`, so it can't affect any existing dashboard number.
 */
function toTrendPoint(current: number, previous: number): TrendPoint {
  if (previous === 0) {
    return {
      current,
      previous,
      pctChange: null,
      direction: current > 0 ? "up" : "flat",
    };
  }
  const pctChange = ((current - previous) / previous) * 100;
  return {
    current,
    previous,
    pctChange,
    direction: pctChange > 0.5 ? "up" : pctChange < -0.5 ? "down" : "flat",
  };
}

export function getWeekOverWeekTrend(sessions: Session[]): WeekOverWeekTrend {
  const today = startOfDay(new Date());
  const currentStart = addDays(today, -6);
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -6);

  let curCoding = 0, curWatching = 0, curSessions = 0;
  let prevCoding = 0, prevWatching = 0, prevSessions = 0;

  for (const s of sessions) {
    const d = startOfDay(new Date(s.startedAt));
    if (d >= currentStart && d <= today) {
      curSessions += 1;
      if (s.kind === "coding") curCoding += s.durationMinutes;
      else curWatching += s.durationMinutes;
    } else if (d >= previousStart && d <= previousEnd) {
      prevSessions += 1;
      if (s.kind === "coding") prevCoding += s.durationMinutes;
      else prevWatching += s.durationMinutes;
    }
  }

  return {
    codingMinutes: toTrendPoint(curCoding, prevCoding),
    watchingMinutes: toTrendPoint(curWatching, prevWatching),
    sessionCount: toTrendPoint(curSessions, prevSessions),
  };
}

export function getAnalyticsSummary(sessions: Session[]): AnalyticsSummary {
  const totalCodingMinutes = sessions
    .filter((s) => s.kind === "coding")
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalWatchingMinutes = sessions
    .filter((s) => s.kind === "watching")
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalActiveMinutes = totalCodingMinutes + totalWatchingMinutes;

  const languageBreakdown = getLanguageBreakdown(sessions);
  const mostUsedLanguage = languageBreakdown[0]?.language ?? null;

  return {
    totalCodingMinutes,
    totalWatchingMinutes,
    totalActiveMinutes,
    mostUsedLanguage,
    codingShare: totalActiveMinutes ? totalCodingMinutes / totalActiveMinutes : 0,
    watchingShare: totalActiveMinutes ? totalWatchingMinutes / totalActiveMinutes : 0,
    languageBreakdown,
    dailyActivity: getDailyActivity(sessions, 30),
    weeklyTrend: getWeeklyTrend(sessions, 8),
    heatmap: getHeatmap(sessions, 119),
    streak: getStreak(sessions),
    sessionCount: sessions.length,
    trend: getWeekOverWeekTrend(sessions),
  };
}