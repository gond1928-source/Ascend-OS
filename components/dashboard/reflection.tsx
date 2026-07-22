"use client";

/**
 * Reflection — Dashboard main-workspace section, below the Today Timeline
 * (Phase 2 brief). One flush list row per prompt (REFLECTION_PROMPTS today
 * has exactly one), styled with the SAME .timeline-row/.today-section-*
 * classes the Timeline above it uses — this is explicitly NOT a card.
 *
 * Answering awards a flat REFLECTION_XP_FLAT regardless of Yes/No or note
 * content (hooks/useReflection.ts enforces this — content is never read
 * for XP purposes). There is no unanswered/"missed" visual treatment: the
 * unanswered state uses the exact same muted, neutral styling
 * DailyQuestsWidget already uses for an incomplete quest (a plain outline
 * icon, muted text) — never a warning color, never copy implying something
 * was skipped or missed. Skipping a day silently does nothing: no entry is
 * created, nothing reads a missing entry as negative anywhere in the app.
 */

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { useReflection } from "@/hooks/useReflection";
import { REFLECTION_XP_FLAT } from "@/constants/xp-values";

export function Reflection() {
  const { isLoading, todaysEntries, remainingPrompts, hasAnsweredToday, submit } = useReflection();
  const [note, setNote] = useState("");

  if (isLoading) return null;

  return (
    <div>
      <div className="today-section-header">
        <span className="today-section-title">Reflection</span>
        {hasAnsweredToday && <span className="today-section-eyebrow">Answered today</span>}
      </div>
      <p className="reflection-framing">A short close to the day — a sentence is enough.</p>

      {remainingPrompts.map((prompt) => (
        <div key={prompt.id} className="timeline-row timeline-row--reflection" style={{ alignItems: "flex-start" }}>
          <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            <Circle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p style={{ fontSize: "var(--text-base)", color: "var(--text-primary)" }}>{prompt.question}</p>
            <div className="reflection-actions">
              <input
                type="text"
                className="reflection-note-input"
                placeholder="Optional note…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={280}
              />
              <button
                type="button"
                className="reflection-btn"
                onClick={() => {
                  submit(prompt.id, "yes", note);
                  setNote("");
                }}
              >
                Yes
              </button>
              <button
                type="button"
                className="reflection-btn"
                onClick={() => {
                  submit(prompt.id, "no", note);
                  setNote("");
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      ))}

      {todaysEntries.map((entry) => (
        <div key={entry.promptId} className="timeline-row timeline-row--reflection" style={{ alignItems: "flex-start" }}>
          <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--status-coding)" }}>
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p style={{ fontSize: "var(--text-base)", color: "var(--text-muted)" }}>
                {entry.answer === "yes" ? "Yes" : "No"}
                {entry.note ? ` — ${entry.note}` : ""}
              </p>
              <span
                className="flex-shrink-0 font-mono text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                +{REFLECTION_XP_FLAT}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
