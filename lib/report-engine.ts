/**
 * report-engine.ts — the ONLY place that assembles a Weekly or Monthly
 * report. Per the product spec: exactly two report kinds exist, and every
 * metric (coding/watching/distraction time, focus score, language mix,
 * peak hours, streak consistency, context switching) lives inside ONE
 * ReportData object per report — never split into separate mini-reports.
 *
 * Pure functions: (sessions, distractions, referenceDate) -> ReportData.
 * No storage, no UI. lib/storage's report store persists the output;
 * components render it.
 */

import { Session } from "@/types/session";
import { DistractionRecord } from "@/types/distraction";
import {
  ReportData,
  ReportLearningTrendPoint,
  ReportPeriod,
  ReportRecord,
} from "@/types/document";
import {
  getLanguageBreakdown,
  getDistractionBreakdown,
  getStreak,
  getTopPeakHours,
} from "@/lib/analytics-engine";

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

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const d = startOfDay(new Date(iso));
  return d >= start && d <= end;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Builds the weekly learning-trend series (one point per day in range). */
function buildDailyLearningTrend(
  sessions: Session[],
  start: Date,
  end: Date,
): ReportLearningTrendPoint[] {
  const points: ReportLearningTrendPoint[] = [];
  let cursor = start;
  while (cursor <= end) {
    const key = toDateKey(cursor.toISOString());
    let coding = 0;
    let watching = 0;
    for (const s of sessions) {
      if (toDateKey(s.startedAt) !== key) continue;
      if (s.kind === "coding") coding += s.durationMinutes;
      else watching += s.durationMinutes;
    }
    points.push({
      label: cursor.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      codingMinutes: coding,
      watchingMinutes: watching,
    });
    cursor = addDays(cursor, 1);
  }
  return points;
}

/** Builds the monthly learning-trend series (one point per week in range). */
function buildWeeklyLearningTrend(
  sessions: Session[],
  start: Date,
  end: Date,
): ReportLearningTrendPoint[] {
  const points: ReportLearningTrendPoint[] = [];
  let weekStart = start;
  while (weekStart <= end) {
    const weekEnd = addDays(weekStart, 6) > end ? end : addDays(weekStart, 6);
    let coding = 0;
    let watching = 0;
    for (const s of sessions) {
      const d = startOfDay(new Date(s.startedAt));
      if (d >= weekStart && d <= weekEnd) {
        if (s.kind === "coding") coding += s.durationMinutes;
        else watching += s.durationMinutes;
      }
    }
    points.push({
      label: `${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`,
      codingMinutes: coding,
      watchingMinutes: watching,
    });
    weekStart = addDays(weekEnd, 1);
  }
  return points;
}

function buildActivitySummary(params: {
  periodLabel: string;
  totalCodingMinutes: number;
  totalWatchingMinutes: number;
  totalDistractionMinutes: number;
  focusScore: number;
  mostProductiveLanguage: string | null;
  peakHours: { hour: number; minutes: number }[];
  currentStreak: number;
}): string {
  const {
    periodLabel, totalCodingMinutes, totalWatchingMinutes, totalDistractionMinutes,
    focusScore, mostProductiveLanguage, peakHours, currentStreak,
  } = params;

  const fmtHour = (h: number) => {
    const period = h < 12 ? "AM" : "PM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}${period}`;
  };

  const parts: string[] = [];
  parts.push(
    `During ${periodLabel}, you logged ${Math.round(totalCodingMinutes)} minutes of coding and ` +
      `${Math.round(totalWatchingMinutes)} minutes of learning/watching, against ` +
      `${Math.round(totalDistractionMinutes)} minutes of tracked distraction.`,
  );
  parts.push(`Your focus score for this period is ${focusScore}/100.`);
  if (mostProductiveLanguage) {
    parts.push(`${mostProductiveLanguage} was your most active language.`);
  }
  if (peakHours.length > 0) {
    parts.push(`You were most active around ${peakHours.map((p) => fmtHour(p.hour)).join(", ")}.`);
  }
  if (currentStreak > 0) {
    parts.push(`You're on a ${currentStreak}-day active streak.`);
  }
  return parts.join(" ");
}

function buildReport(
  period: ReportPeriod,
  periodLabel: string,
  sessions: Session[],
  distractions: DistractionRecord[],
  start: Date,
  end: Date,
): ReportData {
  const periodSessions = sessions.filter((s) => inRange(s.startedAt, start, end));
  const periodDistractions = distractions.filter((d) => inRange(d.startedAt, start, end));

  const totalCodingMinutes = periodSessions
    .filter((s) => s.kind === "coding")
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalWatchingMinutes = periodSessions
    .filter((s) => s.kind === "watching")
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalActiveMinutes = totalCodingMinutes + totalWatchingMinutes;
  const totalDistractionMinutes = periodDistractions.reduce((sum, d) => sum + d.durationMinutes, 0);

  const focusDenominator = totalActiveMinutes + totalDistractionMinutes;
  const focusScore = focusDenominator > 0
    ? Math.round((totalActiveMinutes / focusDenominator) * 100)
    : 100;
  const productiveToDistractedRatio = totalDistractionMinutes > 0
    ? Math.round((totalActiveMinutes / totalDistractionMinutes) * 100) / 100
    : null;
  const codingToWatchingRatio = totalWatchingMinutes > 0
    ? Math.round((totalCodingMinutes / totalWatchingMinutes) * 100) / 100
    : null;

  const languageBreakdown = getLanguageBreakdown(periodSessions);
  const mostProductiveLanguage = languageBreakdown[0]?.language ?? null;

  const peakHours = getTopPeakHours(periodSessions, 3).map((h) => ({ hour: h.hour, minutes: h.minutes }));

  // Streak consistency uses ALL sessions (a streak is inherently a
  // cross-period concept — clipping it to the report window would make
  // "current streak" report something other than the user's actual streak).
  const streakInfo = getStreak(sessions);
  const activeDays = new Set(periodSessions.map((s) => toDateKey(s.startedAt)));
  const totalDaysInPeriod = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  const learningTrend = period === "weekly"
    ? buildDailyLearningTrend(periodSessions, start, end)
    : buildWeeklyLearningTrend(periodSessions, start, end);

  const topDistractions = getDistractionBreakdown(periodDistractions);

  const activitySummary = buildActivitySummary({
    periodLabel,
    totalCodingMinutes,
    totalWatchingMinutes,
    totalDistractionMinutes,
    focusScore,
    mostProductiveLanguage,
    peakHours,
    currentStreak: streakInfo.currentStreak,
  });

  return {
    period,
    periodLabel,
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
    totalCodingMinutes,
    totalWatchingMinutes,
    totalActiveMinutes,
    totalDistractionMinutes,
    focusScore,
    productiveToDistractedRatio,
    codingToWatchingRatio,
    mostProductiveLanguage,
    languageBreakdown,
    peakHours,
    streak: {
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      activeDaysInPeriod: activeDays.size,
      totalDaysInPeriod,
    },
    learningTrend,
    topDistractions,
    contextSwitchCount: periodDistractions.length,
    sessionCount: periodSessions.length,
    distractionEventCount: periodDistractions.length,
    activitySummary,
  };
}

/** Weekly report: the 7 days ending on (and including) referenceDate. */
export function buildWeeklyReport(
  sessions: Session[],
  distractions: DistractionRecord[],
  referenceDate: Date = new Date(),
): ReportData {
  const end = startOfDay(referenceDate);
  const start = addDays(end, -6);
  const label = `Week of ${fmtDate(start)} – ${fmtDate(end)}`;
  return buildReport("weekly", label, sessions, distractions, start, end);
}

/** Monthly report: the calendar month referenceDate falls in. */
export function buildMonthlyReport(
  sessions: Session[],
  distractions: DistractionRecord[],
  referenceDate: Date = new Date(),
): ReportData {
  const start = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
  const end = startOfDay(addDays(addMonths(start, 1), -1));
  const label = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return buildReport("monthly", label, sessions, distractions, start, end);
}

// ── Recency grouping (Documents/Reports list) ───────────────────────────────
//
// Design brief §11 "grouped list with counts" pattern applied to the Reports
// list: buckets by how recently a report was generated (not by period type —
// weekly and monthly reports interleave in the same list) so the most
// relevant reports surface first with a section header + count, matching
// App Rules / Study Library's grouping treatment rather than a separate
// weekly/monthly split.
export interface ReportRecencyGroup {
  label: string;
  reports: ReportRecord[];
}

export function groupReportsByRecency(reports: ReportRecord[]): ReportRecencyGroup[] {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const thisWeek: ReportRecord[] = [];
  const thisMonth: ReportRecord[] = [];
  const earlier: ReportRecord[] = [];

  for (const r of reports) {
    const ageMs = now - new Date(r.generatedAt).getTime();
    if (ageMs < 7 * DAY) thisWeek.push(r);
    else if (ageMs < 30 * DAY) thisMonth.push(r);
    else earlier.push(r);
  }

  const groups: ReportRecencyGroup[] = [
    { label: "This week", reports: thisWeek },
    { label: "This month", reports: thisMonth },
    { label: "Earlier", reports: earlier },
  ];

  return groups.filter((g) => g.reports.length > 0);
}
