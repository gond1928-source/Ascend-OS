"use client";

import { useSessions } from "@/hooks/useSessions";
import { evaluateAchievements } from "@/lib/achievement-engine";
import { AchievementCategory } from "@/types/achievement";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Sparkles, Flame, Calendar, Layers, Trophy, Crown,
  Code2, Globe, Zap, Target, Clock, Star, Lock,
  Sunrise, Moon,
} from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  sparkles: <Sparkles className="h-4 w-4" />,
  flame:    <Flame className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  layers:   <Layers className="h-4 w-4" />,
  trophy:   <Trophy className="h-4 w-4" />,
  crown:    <Crown className="h-4 w-4" />,
  code2:    <Code2 className="h-4 w-4" />,
  globe:    <Globe className="h-4 w-4" />,
  zap:      <Zap className="h-4 w-4" />,
  target:   <Target className="h-4 w-4" />,
  clock:    <Clock className="h-4 w-4" />,
  star:     <Star className="h-4 w-4" />,
  sunrise:  <Sunrise className="h-4 w-4" />,
  moon:     <Moon className="h-4 w-4" />,
};

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  milestone: "Milestones",
  streak: "Streaks",
  coding: "Coding time",
  languages: "Languages",
  xp: "XP",
  quality: "Special",
};

const CATEGORY_ACCENT: Record<AchievementCategory, string> = {
  milestone: "#4dc8f5",
  streak:    "#f5b94d",
  coding:    "#3ddc97",
  languages: "#a78bfa",
  xp:        "#7c6cf6",
  quality:   "#f25f7a",
};

export default function AchievementsPage() {
  const { sessions, isLoading } = useSessions();
  const all = isLoading ? [] : evaluateAchievements(sessions);
  const unlocked = all.filter((a) => a.unlocked).length;

  const byCategory = (Object.keys(CATEGORY_LABELS) as AchievementCategory[]).map((cat) => ({
    cat,
    achievements: all.filter((a) => a.category === cat),
  }));

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-7 pb-10">
      <header className="flex items-end justify-between pt-1">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent-violet/70">Achievements</p>
          <h1 className="mt-0.5 font-display text-[22px] font-semibold text-ink-50">Badges & Milestones</h1>
        </div>
        {!isLoading && (
          <div className="text-right">
            <p className="font-display text-xl font-semibold text-ink-50">{unlocked}<span className="text-ink-500">/{all.length}</span></p>
            <p className="font-mono text-[10px] text-ink-500">unlocked</p>
          </div>
        )}
      </header>

      {/* Overall progress */}
      {!isLoading && (
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-base-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-sky transition-all duration-700"
            style={{ width: `${(unlocked / Math.max(1, all.length)) * 100}%` }}
          />
        </div>
      )}

      {byCategory.map(({ cat, achievements }) => {
        if (achievements.length === 0) return null;
        const accent = CATEGORY_ACCENT[cat];
        const catDone = achievements.filter((a) => a.unlocked).length;
        return (
          <div key={cat}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-widest" style={{ color: accent }}>
                {CATEGORY_LABELS[cat]}
              </h2>
              <span className="font-mono text-[10px] text-ink-500">{catDone}/{achievements.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "relative overflow-hidden rounded-xl border bg-base-900/70 p-4 transition-all",
                    a.unlocked
                      ? "border-white/[0.10]"
                      : "border-white/[0.04] opacity-50"
                  )}
                >
                  {a.unlocked && (
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ background: `radial-gradient(ellipse at 10% 10%, ${accent}12 0%, transparent 60%)` }}
                    />
                  )}
                  <div className="relative flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: a.unlocked ? `${accent}20` : "rgba(255,255,255,0.04)",
                        color: a.unlocked ? accent : "#717a92",
                      }}
                    >
                      {a.unlocked ? (ICONS[a.icon] ?? ICONS.sparkles) : <Lock className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink-50">{a.title}</p>
                      <p className="mt-0.5 text-[11px] text-ink-500">{a.description}</p>
                      {!a.unlocked && a.progress !== undefined && a.progress > 0 && (
                        <div className="mt-2">
                          <div className="h-[2px] w-full overflow-hidden rounded-full bg-base-700">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${a.progress * 100}%`, backgroundColor: accent }}
                            />
                          </div>
                          {a.progressLabel && (
                            <p className="mt-1 font-mono text-[9px] text-ink-500">{a.progressLabel}</p>
                          )}
                        </div>
                      )}
                      {a.unlocked && (
                        <p className="mt-1 font-mono text-[9px]" style={{ color: accent }}>✓ Unlocked</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
