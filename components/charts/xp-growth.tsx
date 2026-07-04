"use client";

// Placeholder chart — wired to lib/xp-system.ts once the gamification
// engine tracks real XP events. Kept isolated here so the dashboard can
// adopt it without touching analytics chart code.
export function XPGrowthChart() {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-base-700 font-mono text-xs text-ink-500">
      XP growth chart — coming with the gamification engine
    </div>
  );
}
