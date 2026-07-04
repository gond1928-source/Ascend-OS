import { StreakInfo } from "@/types/analytics";
import { Flame } from "lucide-react";

export function StreakCard({ streak }: { streak: StreakInfo }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-base-900/70 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-amber/8 via-transparent to-transparent" />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">Streak</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-amber/15">
            <Flame className="h-4 w-4 text-accent-amber" />
          </div>
        </div>
        <p className="font-display text-3xl font-semibold text-ink-50">{streak.currentStreak}d</p>
        <p className="mt-0.5 font-mono text-[11px] text-ink-500">current streak</p>
        <p className="mt-3 font-mono text-[10px] text-ink-500">
          Best: {streak.longestStreak} days
        </p>
      </div>
    </div>
  );
}
