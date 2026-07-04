"use client";
import { useState } from "react";
import { useTimer } from "@/hooks/useTimer";
import { useSessions } from "@/hooks/useSessions";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/sessions/language-selector";
import { cn } from "@/lib/utils";

type Kind = "coding" | "watching";

export function FocusTimer() {
  const [language, setLanguage] = useState("JavaScript");
  const [kind, setKind] = useState<Kind>("coding");
  const [savedXP, setSavedXP] = useState<number | null>(null);
  const { addSession } = useSessions();

  const { displaySeconds, elapsedSeconds, isRunning, start, pause, stop } = useTimer({ mode: "stopwatch" });

  const mins = String(Math.floor(displaySeconds / 60)).padStart(2, "0");
  const secs = String(displaySeconds % 60).padStart(2, "0");

  function handleSave() {
    const elapsed = stop();
    const durationMinutes = Math.max(1, Math.round(elapsed / 60));
    const result = addSession({ language, kind, durationMinutes, source: "timer" });
    setSavedXP(result.xpEarned);
    setTimeout(() => setSavedXP(null), 3000);
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Kind toggle */}
      <div className="flex gap-1 rounded-lg bg-base-800 p-1">
        {(["coding", "watching"] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn(
              "rounded-md px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
              kind === k ? "bg-base-700 text-ink-50" : "text-ink-500 hover:text-ink-300"
            )}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className="text-center">
        <span className="font-mono text-6xl font-light tabular-nums text-ink-50">{mins}:{secs}</span>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-ink-500">elapsed</p>
      </div>

      {/* Language selector */}
      <div className="w-48">
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={pause} disabled={!isRunning}>Pause</Button>
        <Button variant="primary" className="w-24" onClick={isRunning ? pause : start}>
          {isRunning ? "Pause" : "Start"}
        </Button>
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={elapsedSeconds < 60}
          className="border-accent-mint/40 text-accent-mint hover:border-accent-mint/80"
        >
          Save
        </Button>
      </div>

      {savedXP !== null && (
        <div className="rounded-lg border border-accent-mint/20 bg-accent-mint/10 px-4 py-2">
          <p className="font-mono text-sm text-accent-mint">Session saved! +{savedXP} XP</p>
        </div>
      )}
    </div>
  );
}
