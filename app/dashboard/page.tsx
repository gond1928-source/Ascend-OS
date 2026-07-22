"use client";

/**
 * Dashboard → "Today View" (design brief §7), restructured per Phase 2:
 *
 *  - Daily Quests lives in the main workspace, below the Today Timeline —
 *    plain list rows matching the Timeline's own hairline-row treatment
 *    (design brief §7). This was briefly the right panel's default
 *    content in an earlier pass; now that the right panel has been
 *    removed entirely (design brief §1's revision note), this is its
 *    permanent, only home. See DailyQuestsWidget's header comment.
 *  - New Quick Actions bar near the top.
 *  - New Reflection section, below the Today Timeline.
 *  - Recent Workspaces is now tabbed internally (RecentWorkspaces owns
 *    the tabs — see that component).
 *
 * Native tracker ownership: this page now owns the ONE useNativeTracker()
 * subscription for the whole Dashboard (moved up from CurrentStateBanner)
 * because QuickActionsBar's Start/Stop button needs the exact same
 * isRunning/start/stop CurrentStateBanner displays — a second independent
 * subscription would double-commit every session. See current-state.tsx's
 * and quick-actions.tsx's header comments.
 */

import { useRouter } from "next/navigation";
import { useSessions } from "@/hooks/useSessions";
import { useDistractions } from "@/hooks/useDistractions";
import { useReports } from "@/hooks/useReports";
import { useStudyLibrary } from "@/hooks/useStudyLibrary";
import { useNativeTracker } from "@/hooks/useNativeTracker";
import { useXP } from "@/hooks/useXP";
import { useStreak } from "@/hooks/useStreak";
import { todayXP } from "@/lib/xp-system";
import { CurrentStateBanner, MODE_LABEL } from "@/components/dashboard/current-state";
import { QuickActionsBar } from "@/components/dashboard/quick-actions";
import { TodayTimeline } from "@/components/dashboard/today-timeline";
import { Reflection } from "@/components/dashboard/reflection";
import { RecentWorkspaces } from "@/components/dashboard/recent-workspaces";
import { DailyQuestsWidget } from "@/components/gamification/daily-quests";
import Link from "next/link";
import { ArrowRight, Flame, Zap, Target } from "lucide-react";
import { formatMinutes } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const { sessions, addSession, isLoading } = useSessions();
  const { distractions, addDistraction } = useDistractions();
  const { reports, generateReport } = useReports(sessions, distractions);
  const { items: studyItems } = useStudyLibrary();

  const {
    isRunning: isMonitoringRunning,
    currentMode,
    currentApp,
    currentLanguage,
    currentSessionDurationMs,
    start: startMonitoring,
    stop: stopMonitoring,
  } = useNativeTracker(
    (drafts) => drafts.forEach((d) => addSession(d)),
    (drafts) => drafts.forEach((d) => addDistraction(d)),
  );

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  // Hero strip data — deliberately derived from what's already loaded on
  // this page (sessions / tracker state), not a new data source. useXP/
  // useStreak are the exact same hooks the icon rail's identity block
  // already reads, so the streak/level shown here always agrees with the
  // rail rather than risking a second, competing computation.
  const xp = useXP(sessions);
  const streak = useStreak(sessions);
  const earnedToday = todayXP(sessions);
  const todaysSessions = sessions.filter((s) => s.startedAt.slice(0, 10) === now.toISOString().slice(0, 10));
  const codingMinutesToday = todaysSessions.filter((s) => s.kind === "coding").reduce((sum, s) => sum + s.durationMinutes, 0);
  const watchingMinutesToday = todaysSessions.filter((s) => s.kind === "watching").reduce((sum, s) => sum + s.durationMinutes, 0);

  // A live, not-yet-committed session previously fell through the cracks
  // here — committed totals only update once a segment closes, so the
  // hero could say "No focus time logged yet today" while a session was
  // visibly running in the Current State banner a few lines below it.
  // Live state takes priority when present; committed totals are the
  // fallback once nothing's actively running.
  const isLiveFocusMode = isMonitoringRunning && currentMode !== null && currentMode !== "idle";
  const primaryFocusToday =
    isLiveFocusMode
      ? { label: MODE_LABEL[currentMode as string] ?? "Active", minutes: Math.floor(currentSessionDurationMs / 60000), live: true as const }
    : codingMinutesToday === 0 && watchingMinutesToday === 0 ? null
    : codingMinutesToday >= watchingMinutesToday
      ? { label: "Coding", minutes: codingMinutesToday, live: false as const }
      : { label: "Watching", minutes: watchingMinutesToday, live: false as const };

  function handleGenerateReport() {
    // Quick Actions is one-click by design — no period picker. Weekly is
    // the more commonly generated period elsewhere in the app (Documents'
    // own Generate buttons default to showing weekly first), so that's
    // the assumption here; a person wanting monthly still has that button
    // on the Documents page itself.
    generateReport("weekly");
    router.push("/documents?tab=reports");
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-sm" style={{ color: "var(--text-muted)" }}>
        initializing…
      </div>
    );
  }

  return (
    <div className="today-page">
      <header className="today-header today-fade-in">
        <div>
          <p className="today-date">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="today-greeting">{greeting}</h1>
          <div className="growth-strip growth-strip--hero">
            <span className="growth-item">
              <Target className="h-3 w-3" />
              {primaryFocusToday ? (
                primaryFocusToday.live ? (
                  <><strong>{primaryFocusToday.label}</strong> now · {formatMinutes(primaryFocusToday.minutes)} so far</>
                ) : (
                  <>Today: <strong>{primaryFocusToday.label.toLowerCase()}</strong> · {formatMinutes(primaryFocusToday.minutes)}</>
                )
              ) : (
                "No focus time logged yet today"
              )}
            </span>
            <span className="growth-item">
              <Flame className="h-3 w-3" />
              <strong>{streak.currentStreak}</strong> day streak
            </span>
            <span className="growth-item">
              <Zap className="h-3 w-3" />
              <strong>+{earnedToday}</strong> XP today · Level {xp.level}
            </span>
          </div>
        </div>
        <Link href="/analytics" className="today-link">
          Full analytics <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="today-fade-in" style={{ animationDelay: "40ms" }}>
        <QuickActionsBar
          isMonitoringRunning={isMonitoringRunning}
          onStartMonitoring={startMonitoring}
          onStopMonitoring={stopMonitoring}
          onGenerateReport={handleGenerateReport}
        />
      </div>

      <div className="today-fade-in" style={{ animationDelay: "80ms" }}>
        <CurrentStateBanner
          isRunning={isMonitoringRunning}
          currentMode={currentMode}
          currentApp={currentApp}
          currentLanguage={currentLanguage}
          currentSessionDurationMs={currentSessionDurationMs}
        />
      </div>

      <div className="today-section today-fade-in" style={{ animationDelay: "120ms" }}>
        <TodayTimeline
          sessions={sessions}
          distractions={distractions}
          onStartMonitoring={startMonitoring}
          isMonitoringRunning={isMonitoringRunning}
        />
      </div>

      <div className="today-section today-fade-in" style={{ animationDelay: "160ms" }}>
        <DailyQuestsWidget sessions={sessions} earnedToday={earnedToday} />
      </div>

      <div className="today-section today-fade-in" style={{ animationDelay: "200ms" }}>
        <Reflection />
      </div>

      <div className="today-section today-fade-in" style={{ animationDelay: "240ms" }}>
        <div className="today-section-header">
          <span className="today-section-title">Recent workspaces</span>
        </div>
        <RecentWorkspaces reports={reports} studyItems={studyItems} />
      </div>
    </div>
  );
}
