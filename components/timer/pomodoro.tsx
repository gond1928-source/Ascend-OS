"use client";
import { useState, useCallback } from "react";
import { useTimer } from "@/hooks/useTimer";
import { useSessions } from "@/hooks/useSessions";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/sessions/language-selector";
import { cn } from "@/lib/utils";

type Phase = "work" | "short-break" | "long-break";

const PHASE_CONFIG: Record<Phase, { label: string; minutes: number; color: string }> = {
  work: { label: "Focus", minutes: 25, color: "text-accent-violet" },
  "short-break": { label: "Short Break", minutes: 5, color: "text-status-coding" },
  "long-break": { label: "Long Break", minutes: 15, color: "text-status-learning" },
};

export function Pomodoro() {
  const [phase, setPhase] = useState<Phase>("work");
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [language, setLanguage] = useState("JavaScript");
  const [lastXP, setLastXP] = useState<number | null>(null);
  const { addSession } = useSessions();

  const cfg = PHASE_CONFIG[phase];

  const handleComplete = useCallback(() => {
    if (phase === "work") {
      const result = addSession({
        language,
        kind: "coding",
        durationMinutes: cfg.minutes,
        source: "timer",
      });
      setLastXP(result.xpEarned);
      setTimeout(() => setLastXP(null), 3000);
      setCompletedPomodoros((n) => n + 1);
      setPhase((completedPomodoros + 1) % 4 === 0 ? "long-break" : "short-break");
    } else {
      setPhase("work");
    }
  }, [phase, cfg.minutes, language, completedPomodoros, addSession]);

  const { displaySeconds, isRunning, start, pause, reset } = useTimer({
    mode: "countdown",
    initialSeconds: cfg.minutes * 60,
    onComplete: handleComplete,
  });

  const mins = String(Math.floor(displaySeconds / 60)).padStart(2, "0");
  const secs = String(displaySeconds % 60).padStart(2, "0");
  const progress = 1 - displaySeconds / (cfg.minutes * 60);
  const circumference = 2 * Math.PI * 54;

  function switchPhase(p: Phase) {
    reset();
    setPhase(p);
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Phase tabs */}
      <div className="flex gap-1 rounded-lg bg-base-800 p-1">
        {(Object.keys(PHASE_CONFIG) as Phase[]).map((p) => (
          <button
            key={p}
            onClick={() => switchPhase(p)}
            className={cn(
              "rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
              phase === p ? "bg-base-700 text-ink-50" : "text-ink-500 hover:text-ink-300"
            )}
          >
            {PHASE_CONFIG[p].label}
          </button>
        ))}
      </div>

      {/* Circular timer */}
      <div className="relative flex h-40 w-40 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="4" className="text-base-700" />
          <circle
            cx="60" cy="60" r="54" fill="none" strokeWidth="4"
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            className={cn("transition-all duration-1000", cfg.color)}
          />
        </svg>
        <div className="text-center">
          <span className="font-mono text-4xl font-light text-ink-50">{mins}:{secs}</span>
          <p className={cn("mt-0.5 font-mono text-[10px] uppercase tracking-widest", cfg.color)}>{cfg.label}</p>
        </div>
      </div>

      {/* Language selector (work phase only) */}
      {phase === "work" && (
        <div className="w-48">
          <LanguageSelector value={language} onChange={setLanguage} />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>Reset</Button>
        <Button
          variant="primary"
          className="w-24"
          onClick={isRunning ? pause : start}
        >
          {isRunning ? "Pause" : "Start"}
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-center">
        <div>
          <p className="font-mono text-lg text-ink-50">{completedPomodoros}</p>
          <p className="font-mono text-[10px] uppercase text-ink-500">Pomodoros</p>
        </div>
        {lastXP !== null && (
          <div className="rounded-lg border border-status-coding/20 bg-status-coding/10 px-3 py-1.5">
            <p className="font-mono text-xs text-status-coding">+{lastXP} XP</p>
          </div>
        )}
      </div>
    </div>
  );
}
