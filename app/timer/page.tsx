"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Pomodoro } from "@/components/timer/pomodoro";
import { FocusTimer } from "@/components/timer/focus-timer";
import { cn } from "@/lib/utils";

type Tab = "pomodoro" | "stopwatch";

export default function TimerPage() {
  const [tab, setTab] = useState<Tab>("pomodoro");

  return (
    <div className="mx-auto max-w-lg space-y-6 p-7">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent-violet/70">Focus</p>
        <h1 className="mt-0.5 font-display text-[22px] font-semibold text-ink-50">Timer</h1>
      </header>

      <Card>
        {/* Tab switcher */}
        <div className="mb-5 flex gap-1 rounded-lg bg-base-800 p-1">
          {(["pomodoro", "stopwatch"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-md py-2 font-mono text-[11px] uppercase tracking-wider transition-colors",
                tab === t ? "bg-base-700 text-ink-50" : "text-ink-500 hover:text-ink-300"
              )}
            >
              {t === "pomodoro" ? "Pomodoro" : "Stopwatch"}
            </button>
          ))}
        </div>

        {tab === "pomodoro" ? <Pomodoro /> : <FocusTimer />}
      </Card>

      <Card eyebrow="How it works" title="Sessions auto-saved">
        <p className="text-sm text-ink-500 leading-relaxed">
          When a Pomodoro completes or you click Save on the stopwatch, a session is automatically logged and XP is awarded. Sessions persist across refreshes.
        </p>
      </Card>
    </div>
  );
}
