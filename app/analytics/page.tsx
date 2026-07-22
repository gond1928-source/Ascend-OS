"use client";

/**
 * Analytics — Today / This Week / All Time tabs (Phase 3).
 *
 * This is a hierarchy/placement change, not a new-data change: every number
 * on this page comes from lib/analytics-engine.ts's existing pure functions
 * (getAnalyticsSummary, getDistractionSummary, getTopPeakHours, getStreak,
 * getWeekOverWeekTrend-style comparators), just fed scoped Session[]/
 * DistractionRecord[] arrays via the new filterSessionsByRange /
 * filterDistractionsByRange helpers added alongside them. No new chart or
 * aggregation logic lives in this file.
 *
 * Each tab renders as ONE .section-panel (hero + secondary + trend [week/
 * all-time only] + insights) with internal hairline dividers via
 * .section-row/.section-cell — reusing the primitive already established for
 * the old Analytics page rather than reintroducing separate boxed Cards
 * (design brief §4/§12).
 */

import { useMemo, useState } from "react";
import { useSessions } from "@/hooks/useSessions";
import { useDistractions } from "@/hooks/useDistractions";
import {
  AnalyticsRange,
  filterSessionsByRange,
  filterDistractionsByRange,
  getAnalyticsSummary,
  getDistractionSummary,
  getTopPeakHours,
  getStreak,
  getDailyActivity,
  getWeeklyTrend,
  getWeeksOfHistory,
  getDistractionWeekOverWeek,
} from "@/lib/analytics-engine";
import { CodingVsWatching } from "@/components/charts/coding-vs-watching";
import { LanguageBreakdownChart } from "@/components/charts/language-breakdown";
import { WeeklyTrendChart, DailyActivityChart } from "@/components/charts/weekly-activity";
import { formatMinutes } from "@/lib/utils";

const TABS: { id: AnalyticsRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "all", label: "All Time" },
];

function InsightCell({ label, text }: { label: string; text: string }) {
  return (
    <div className="insight-callout">
      <p className="insight-callout-label">{label}</p>
      <p className="insight-callout-text">{text}</p>
    </div>
  );
}

function peakHoursText(hours: { hour: number; minutes: number }[]): string {
  if (hours.length === 0) return "Not enough activity yet to spot a peak.";
  return hours.map((h) => `${h.hour}:00`).join(", ");
}

export default function AnalyticsPage() {
  const { sessions, isLoading } = useSessions();
  const { distractions } = useDistractions();
  const [range, setRange] = useState<AnalyticsRange>("today");

  const rangeSessions = useMemo(() => filterSessionsByRange(sessions, range), [sessions, range]);
  const rangeDistractions = useMemo(() => filterDistractionsByRange(distractions, range), [distractions, range]);

  const summary = useMemo(() => getAnalyticsSummary(rangeSessions), [rangeSessions]);
  const distractionSummary = useMemo(
    () => getDistractionSummary(rangeSessions, rangeDistractions),
    [rangeSessions, rangeDistractions],
  );
  const peakHours = useMemo(() => getTopPeakHours(rangeSessions, 3), [rangeSessions]);

  // Trend charts window off "today" internally, so they take the full
  // unfiltered arrays and just control the day/week count — not the
  // range-scoped arrays used for the hero/secondary/insights totals above.
  const weekTrendData = useMemo(() => getDailyActivity(sessions, 7), [sessions]);
  const weeksOfHistory = useMemo(() => getWeeksOfHistory(sessions), [sessions]);
  const allTimeTrendData = useMemo(() => getWeeklyTrend(sessions, weeksOfHistory), [sessions, weeksOfHistory]);

  const allTimeStreak = useMemo(() => getStreak(sessions), [sessions]);
  const distractionWoW = useMemo(() => getDistractionWeekOverWeek(distractions), [distractions]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-sm" style={{ color: "var(--text-muted)" }}>
        computing analytics…
      </div>
    );
  }

  const totalActive = summary.totalCodingMinutes + summary.totalWatchingMinutes;
  const codingSharePct = totalActive ? Math.round((summary.totalCodingMinutes / totalActive) * 100) : null;

  const patternText =
    codingSharePct === null
      ? "Nothing tracked yet today."
      : codingSharePct >= 50
        ? `Coding made up ${codingSharePct}% of today's activity.`
        : `Watching made up ${100 - codingSharePct}% of today's activity.`;

  const weekOverWeekText = (() => {
    if (distractionWoW.pctChange === null) {
      return distractionWoW.current > 0 ? "New distraction time this week — nothing recorded the week before." : "No distraction time recorded this or last week.";
    }
    const rounded = Math.round(Math.abs(distractionWoW.pctChange));
    if (distractionWoW.direction === "flat") return "Distraction time is about the same as last week.";
    return `Distraction time is ${distractionWoW.direction === "up" ? "up" : "down"} ${rounded}% vs. last week.`;
  })();

  const consistencyText =
    allTimeStreak.currentStreak > 0
      ? `${allTimeStreak.currentStreak}-day current streak (longest: ${allTimeStreak.longestStreak} day${allTimeStreak.longestStreak === 1 ? "" : "s"}).`
      : `No active streak right now — longest so far is ${allTimeStreak.longestStreak} day${allTimeStreak.longestStreak === 1 ? "" : "s"}.`;

  const heroEyebrow = range === "today" ? "Today" : range === "week" ? "This week" : "All time";

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-8 pb-12">
      <header className="flex items-end justify-between pt-1">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em]" style={{ color: "var(--accent-primary)" }}>Analytics</p>
          <h1 className="mt-0.5 text-[22px] font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Coding vs. Watching</h1>
        </div>
        <span className="flex items-center gap-2 rounded-lg border px-3.5 py-2 font-mono text-[11px]" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
          {rangeSessions.length} session{rangeSessions.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="workspace-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={range === t.id ? "workspace-tab workspace-tab--active" : "workspace-tab"}
            onClick={() => setRange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="section-panel">
        <div className="section-row" style={{ gridTemplateColumns: "2fr 3fr" }}>
          <div className="section-cell">
            <div className="section-cell-header">
              <p className="panel-eyebrow">{heroEyebrow}</p>
              <p className="panel-title">Focus split</p>
            </div>
            <CodingVsWatching codingMinutes={summary.totalCodingMinutes} watchingMinutes={summary.totalWatchingMinutes} />
          </div>
          <div className="section-cell">
            <div className="section-cell-header">
              <p className="panel-eyebrow">Coding vs. watching</p>
              <p className="panel-title">Language breakdown</p>
            </div>
            <LanguageBreakdownChart data={summary.languageBreakdown} />
          </div>
        </div>

        {range === "week" && (
          <div className="section-row">
            <div className="section-cell">
              <div className="section-cell-header">
                <p className="panel-eyebrow">Last 7 days</p>
                <p className="panel-title">Daily activity</p>
              </div>
              <DailyActivityChart data={weekTrendData} />
            </div>
          </div>
        )}

        {range === "all" && (
          <div className="section-row">
            <div className="section-cell">
              <div className="section-cell-header">
                <p className="panel-eyebrow">Full history · {weeksOfHistory} week{weeksOfHistory === 1 ? "" : "s"}</p>
                <p className="panel-title">Weekly trend</p>
              </div>
              <WeeklyTrendChart data={allTimeTrendData} />
            </div>
          </div>
        )}

        <div className="section-row">
          <div className="section-cell">
            <div className="section-cell-header">
              <p className="panel-eyebrow">{heroEyebrow}</p>
              <p className="panel-title">Insights</p>
            </div>
            <div className="insight-callout-grid">
              {range === "today" && (
                <>
                  <InsightCell label="Peak hours today" text={peakHoursText(peakHours)} />
                  <InsightCell label="Pattern" text={patternText} />
                  <InsightCell label="Context switches" text={`${distractionSummary.contextSwitchCount} today`} />
                </>
              )}
              {range === "week" && (
                <>
                  <InsightCell label="Peak hours this week" text={peakHoursText(peakHours)} />
                  <InsightCell label="Vs. last week" text={weekOverWeekText} />
                  <InsightCell label="Context switches" text={`${distractionSummary.contextSwitchCount} this week`} />
                </>
              )}
              {range === "all" && (
                <>
                  <InsightCell label="All-time peak hours" text={peakHoursText(peakHours)} />
                  <InsightCell label="Consistency" text={consistencyText} />
                  <InsightCell label="Context switches" text={`${distractionSummary.contextSwitchCount} all time`} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
        {formatMinutes(summary.totalActiveMinutes)} tracked · {formatMinutes(distractionSummary.totalDistractionMinutes)} distracted
      </p>
    </div>
  );
}
