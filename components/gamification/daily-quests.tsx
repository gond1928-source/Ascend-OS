"use client";

/**
 * DailyQuestsWidget — lives in the main Dashboard workspace, below the
 * Today Timeline (design brief §7). Originally shipped as the right
 * panel's default content (Phase 2); moved here when the right panel was
 * removed entirely (see design brief §1's revision note) since Daily
 * Quests was its only default-content use and this is where the brief
 * always intended it to end up.
 *
 * Styled as flat, flush "plain list rows matching the Timeline's
 * hairline-row treatment" per §7 — literally the same `.timeline-row`
 * class TodayTimeline and Reflection use, not the old right-panel
 * "Properties panel" collapsible-sections look. No sub-grouping: there
 * are only three quests today, and every sibling section on this page
 * (Timeline, Reflection) is a single flat list, so keeping this flat too
 * is what "plain list rows" actually means in context.
 *
 * All quests remain fully auto-detected from tracked session data — see
 * lib/quest-engine.ts, untouched by this pass. Zero manual checkboxes.
 *
 * Completion summary strip (progress bar + % + today's XP) added as a
 * quiet at-a-glance layer above the row list — deliberately a thin bar and
 * small mono text, not a Duolingo-style ring/badge. `earnedToday` is
 * optional and computed once at the page level (lib/xp-system.ts's
 * todayXP) rather than recomputed here, so it always matches the same
 * number the hero strip shows.
 */

import { Session } from "@/types/session";
import { getDailyQuests } from "@/lib/quest-engine";
import { CheckCircle2, Circle } from "lucide-react";

export function DailyQuestsWidget({ sessions, earnedToday }: { sessions: Session[]; earnedToday?: number }) {
  const quests = getDailyQuests(sessions);
  const completedCount = quests.filter((q) => q.completed).length;
  const completionPct = quests.length === 0 ? 0 : Math.round((completedCount / quests.length) * 100);

  return (
    <div>
      <div className="today-section-header">
        <span className="today-section-title">Daily quests</span>
        <span className="today-section-eyebrow">{completedCount}/{quests.length} complete</span>
      </div>

      <div className="quests-summary">
        <div className="quests-summary-bar">
          <div className="quests-summary-bar-fill" style={{ width: `${completionPct}%` }} />
        </div>
        {typeof earnedToday === "number" && (
          <span className="quests-summary-xp">+{earnedToday} XP today</span>
        )}
      </div>

      {quests.map((quest) => (
        <div key={quest.id} className="timeline-row" style={{ alignItems: "flex-start" }}>
          <span className="mt-0.5 flex-shrink-0" style={{ color: quest.completed ? "var(--status-coding)" : "var(--text-muted)" }}>
            {quest.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p
                style={{
                  fontSize: "var(--text-base)",
                  color: quest.completed ? "var(--text-muted)" : "var(--text-primary)",
                  textDecoration: quest.completed ? "line-through" : "none",
                }}
              >
                {quest.title}
              </p>
              <span className="flex-shrink-0 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                +{quest.xpReward}
              </span>
            </div>
            {!quest.completed && (
              <div className="mt-1.5 h-[2px] w-full max-w-[220px] overflow-hidden rounded-full" style={{ background: "var(--border-default)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${quest.progress * 100}%`, background: "var(--accent-primary-muted)" }}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
