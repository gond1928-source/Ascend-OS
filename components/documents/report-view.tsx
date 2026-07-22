"use client";

import { ReportData } from "@/types/document";
import { formatMinutes, formatDurationCompact } from "@/lib/utils";
import { CodingVsWatching } from "@/components/charts/coding-vs-watching";
import { LanguageBreakdownChart } from "@/components/charts/language-breakdown";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_AXIS_COLOR, CHART_GRID_COLOR, CODING_COLOR, WATCHING_COLOR } from "@/constants/themes";

/** Section ids double as anchor targets for the viewer's table of contents. */
export const REPORT_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "focus", label: "Focus & Deep Work" },
  { id: "coding-learning", label: "Coding vs. Learning" },
  { id: "distractions", label: "Distractions" },
] as const;

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="doc-h2 scroll-mt-24">
      {children}
    </h2>
  );
}

export function ReportView({ data }: { data: ReportData }) {
  // ── Derived interpretive text — composed only from fields already on
  // ReportData. No new numbers are invented here, just plain-language framing
  // around the existing values.
  const peakHoursText =
    data.peakHours.length > 0
      ? `Most of that time landed around ${data.peakHours
          .slice(0, 3)
          .map((h) => `${h.hour}:00`)
          .join(", ")}.`
      : "There isn't enough peak-hour data yet to spot a pattern.";

  const streakText =
    data.streak.currentStreak > 0
      ? `You're on a ${data.streak.currentStreak}-day streak right now (longest this period: ${data.streak.longestStreak} days), active ${data.streak.activeDaysInPeriod} of ${data.streak.totalDaysInPeriod} days.`
      : `No active streak at the moment — longest this period was ${data.streak.longestStreak} day${data.streak.longestStreak === 1 ? "" : "s"}, active ${data.streak.activeDaysInPeriod} of ${data.streak.totalDaysInPeriod} days.`;

  const codingLearningText = (() => {
    const lang = data.mostProductiveLanguage ? `${data.mostProductiveLanguage} led the way` : "No single language dominated";
    const ratio = data.codingToWatchingRatio
      ? `you spent roughly ${data.codingToWatchingRatio} minute${data.codingToWatchingRatio === 1 ? "" : "s"} coding for every minute watching`
      : "there wasn't enough watching time to compute a coding-to-watching ratio";
    return `${lang} this ${data.period === "weekly" ? "week" : "month"}, and ${ratio}.`;
  })();

  const distractionShare =
    data.totalActiveMinutes + data.totalDistractionMinutes > 0
      ? Math.round((data.totalDistractionMinutes / (data.totalActiveMinutes + data.totalDistractionMinutes)) * 100)
      : 0;

  const distractionText = data.topDistractions.length > 0
    ? `Distractions took up about ${distractionShare}% of tracked time (${formatMinutes(data.totalDistractionMinutes)}), spread across ${data.contextSwitchCount} context switch${data.contextSwitchCount === 1 ? "" : "es"}. "${data.topDistractions[0].label}" was the single biggest pull.`
    : `Barely any distraction time was logged — ${formatMinutes(data.totalDistractionMinutes)} total across ${data.contextSwitchCount} context switch${data.contextSwitchCount === 1 ? "" : "es"}.`;

  const trendData = data.learningTrend.map((t) => ({ label: t.label, Coding: t.codingMinutes, Watching: t.watchingMinutes }));

  return (
    <div className="doc-prose">
      <section aria-labelledby="overview">
        <SectionHeading id="overview">Overview</SectionHeading>
        <div className="insight-callout mb-4">
          <p className="insight-callout-label">Summary</p>
          <p className="insight-callout-text">{data.activitySummary}</p>
        </div>
        <div className="doc-stat-row">
          <span>
            <b>{formatMinutes(data.totalActiveMinutes)}</b> active
          </span>
          <span>
            <b>{formatMinutes(data.totalCodingMinutes)}</b> coding
          </span>
          <span>
            <b>{formatMinutes(data.totalWatchingMinutes)}</b> watching
          </span>
          <span>
            <b>{data.focusScore}/100</b> focus score
          </span>
        </div>
      </section>

      <section aria-labelledby="focus">
        <SectionHeading id="focus">Focus &amp; Deep Work</SectionHeading>
        <p className="doc-p">
          Your focus score landed at <b>{data.focusScore}/100</b> this {data.period === "weekly" ? "week" : "month"}
          {data.productiveToDistractedRatio ? ` — a ${data.productiveToDistractedRatio}:1 focused-to-distracted ratio.` : "."}
          {" "}
          {streakText} {peakHoursText}
        </p>
        {data.peakHours.length > 0 && (
          <div className="doc-inline-figure">
            <div className="flex flex-wrap gap-2">
              {data.peakHours.map((h) => (
                <span key={h.hour} className="doc-chip">
                  {h.hour}:00 · {formatDurationCompact(h.minutes)}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="coding-learning">
        <SectionHeading id="coding-learning">Coding vs. Learning</SectionHeading>
        <p className="doc-p">{codingLearningText}</p>
        {(data.totalCodingMinutes > 0 || data.totalWatchingMinutes > 0) && (
          <div className="doc-inline-figure" data-export-chart="coding-vs-watching" data-export-chart-title="Coding vs. watching">
            <CodingVsWatching codingMinutes={data.totalCodingMinutes} watchingMinutes={data.totalWatchingMinutes} />
          </div>
        )}
        {data.languageBreakdown.length > 0 && (
          <div className="doc-inline-figure" data-export-chart="language-breakdown" data-export-chart-title="Language breakdown">
            <LanguageBreakdownChart data={data.languageBreakdown} />
          </div>
        )}
        {trendData.length > 0 && (
          <div className="doc-inline-figure" data-export-chart="learning-trend" data-export-chart-title="Coding vs. watching over time">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-500">Coding vs. watching over time</p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ left: -16, right: 8 }}>
                  <defs>
                    <linearGradient id="rvCodingFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CODING_COLOR} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CODING_COLOR} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rvWatchingFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={WATCHING_COLOR} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={WATCHING_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
                  <XAxis dataKey="label" tick={{ fill: CHART_AXIS_COLOR, fontSize: 10 }} axisLine={{ stroke: CHART_GRID_COLOR }} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 60)}h`} tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#1c1c1c", border: "1px solid #282828", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => formatMinutes(value)}
                  />
                  <Area type="monotone" dataKey="Coding" stroke={CODING_COLOR} fill="url(#rvCodingFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Watching" stroke={WATCHING_COLOR} fill="url(#rvWatchingFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="distractions">
        <SectionHeading id="distractions">Distractions</SectionHeading>
        <p className="doc-p">{distractionText}</p>
        {data.topDistractions.length > 0 && (
          <div className="doc-inline-figure space-y-1.5">
            {data.topDistractions.slice(0, 6).map((dist) => (
              <div key={dist.label} className="flex items-center justify-between border-b border-white/[0.05] py-1.5 text-[13px] last:border-0">
                <span className="text-ink-300">{dist.label}</span>
                <span className="font-mono text-ink-500">{formatMinutes(dist.minutes)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
