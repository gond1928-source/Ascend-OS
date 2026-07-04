"use client";

import { useAnalytics } from "@/hooks/useAnalytics";
import { useSessions } from "@/hooks/useSessions";
import { Card } from "@/components/ui/card";
import { CodingVsWatching } from "@/components/charts/coding-vs-watching";
import { LanguageBreakdownChart } from "@/components/charts/language-breakdown";
import { WeeklyTrendChart, DailyActivityChart } from "@/components/charts/weekly-activity";
import { StreakHeatmap } from "@/components/charts/streak-heatmap";
import { SessionTimeline } from "@/components/charts/session-timeline";
import { formatMinutes, formatDurationCompact } from "@/lib/utils";
import { Flame, Code2, Tv, Trophy } from "lucide-react";
import { TrendPoint } from "@/types/analytics";
import { TrendBadge } from "@/components/ui/trend-badge";

function StatPill({
  icon: Icon, label, value, accent, trend,
}: { icon: typeof Code2; label: string; value: string; accent: string; trend?: TrendPoint }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-base-900/70 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-current/5 via-transparent to-transparent" style={{ color: accent }} />
      <div className="relative flex items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}1f` }}>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
          <div className="flex items-center gap-2">
            <p className="font-display text-lg font-semibold text-ink-50">{value}</p>
            {trend && <TrendBadge trend={trend} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { sessions, isLoading } = useSessions();
  const { data } = useAnalytics(sessions);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-sm text-ink-500">
        <span className="animate-pulse">computing analytics…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-8 pb-12">
      <header className="flex items-end justify-between pt-1">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent-violet/70">Analytics</p>
          <h1 className="mt-0.5 font-display text-[22px] font-semibold text-ink-50">Coding vs. Watching</h1>
        </div>
        <span className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-base-900/60 px-3.5 py-2 font-mono text-[11px] text-ink-300 shadow-sm">
          {data.sessionCount} sessions
          <TrendBadge trend={data.trend.sessionCount} />
        </span>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatPill icon={Code2} label="Coding" value={formatMinutes(data.totalCodingMinutes)} accent="#3ddc97" trend={data.trend.codingMinutes} />
        <StatPill icon={Tv} label="Watching" value={formatMinutes(data.totalWatchingMinutes)} accent="#7c6cf6" trend={data.trend.watchingMinutes} />
        <StatPill icon={Flame} label="Streak" value={`${data.streak.currentStreak}d`} accent="#f5b94d" />
        <StatPill icon={Trophy} label="Top language" value={data.mostUsedLanguage ?? "—"} accent="#4dc8f5" />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-5">
        <Card title="Focus split" eyebrow="All time" className="lg:col-span-2">
          <CodingVsWatching codingMinutes={data.totalCodingMinutes} watchingMinutes={data.totalWatchingMinutes} />
        </Card>
        <Card title="Per-language breakdown" eyebrow="Coding vs. watching" className="lg:col-span-3">
          <LanguageBreakdownChart data={data.languageBreakdown} />
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Card title="Weekly trend" eyebrow="Last 8 weeks">
          <WeeklyTrendChart data={data.weeklyTrend} />
        </Card>
        <Card title="Daily activity" eyebrow="Last 30 days">
          <DailyActivityChart data={data.dailyActivity} />
        </Card>
      </div>

      <Card title="Activity heatmap" eyebrow="Daily streak tracking">
        <StreakHeatmap cells={data.heatmap} />
        <div className="mt-4 flex gap-6 border-t border-white/[0.06] pt-4 font-mono text-[11px] text-ink-500">
          <span>Current streak <span className="text-ink-300">{data.streak.currentStreak}d</span></span>
          <span>Longest <span className="text-ink-300">{data.streak.longestStreak}d</span></span>
          {data.streak.lastActiveDate && <span>Last active <span className="text-ink-300">{data.streak.lastActiveDate}</span></span>}
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-5">
        <Card title="Hours by language" eyebrow="All time" className="lg:col-span-2">
          <div className="space-y-3">
            {data.languageBreakdown.slice(0, 8).map((l) => (
              <div key={l.language} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-sm text-ink-300">{l.language}</span>
                </div>
                <span className="font-mono text-sm text-ink-50">{formatDurationCompact(l.totalMinutes)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Recent sessions" eyebrow="Timeline" className="lg:col-span-3">
          <SessionTimeline sessions={sessions} limit={8} />
        </Card>
      </div>
    </div>
  );
}
