"use client";

import { useAnalytics } from "@/hooks/useAnalytics";
import { useSessions } from "@/hooks/useSessions";
import { useXP } from "@/hooks/useXP";
import { StreakCard } from "@/components/dashboard/streak-card";
import { FocusCard } from "@/components/dashboard/focus-card";
import { XPCard } from "@/components/dashboard/xp-card";
import { ProductivityScore } from "@/components/dashboard/productivity-score";
import { LanguageStats } from "@/components/dashboard/language-stats";
import { RecentSessions } from "@/components/dashboard/recent-sessions";
import { Card } from "@/components/ui/card";
import { CodingVsWatching } from "@/components/charts/coding-vs-watching";
import { DailyActivityChart } from "@/components/charts/weekly-activity";
import { DailyQuestsWidget } from "@/components/gamification/daily-quests";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { sessions, isLoading } = useSessions();
  const { data } = useAnalytics(sessions);
  const xp = useXP(sessions);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-sm text-ink-500">
        <span className="animate-pulse">initializing…</span>
      </div>
    );
  }

  const last30Coding = data.dailyActivity.reduce((sum, d) => sum + d.codingMinutes, 0);
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-8 pb-12">
      <header className="flex items-end justify-between pt-1">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent-violet/70">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-0.5 font-display text-[22px] font-semibold text-ink-50">{greeting}</h1>
        </div>
        <Link
          href="/analytics"
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-base-900/60 px-3.5 py-2 font-mono text-[11px] text-ink-300 shadow-sm transition-colors hover:border-white/[0.14] hover:text-ink-50"
        >
          Full analytics <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <XPCard
          level={xp.level}
          xpIntoLevel={xp.xpIntoLevel}
          xpToNextLevel={xp.xpToNextLevel}
          totalXP={xp.xp}
          rank={xp.rank}
          tier={xp.tier}
        />
        <StreakCard streak={data.streak} />
        <FocusCard codingMinutes={last30Coding} trend={data.trend.codingMinutes} />
        <ProductivityScore codingShare={data.codingShare} />
      </div>

      {/* Charts + quests */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card title="Focus split" eyebrow="All time" className="lg:col-span-2">
          <CodingVsWatching codingMinutes={data.totalCodingMinutes} watchingMinutes={data.totalWatchingMinutes} />
        </Card>
        <Card title="Daily activity" eyebrow="Last 30 days" className="lg:col-span-3">
          <DailyActivityChart data={data.dailyActivity} />
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <LanguageStats data={data.languageBreakdown} />
        <RecentSessions sessions={sessions} />
        <DailyQuestsWidget sessions={sessions} />
      </div>
    </div>
  );
}
