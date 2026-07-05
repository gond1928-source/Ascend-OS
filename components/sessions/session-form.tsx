"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSelector } from "./language-selector";
import { SessionDraft } from "@/types/session";

/**
 * Manual session logging.
 *
 * Previously this form logged ONE kind (coding OR watching) per submission,
 * so a session that was actually both (e.g. 20m coding + 10m watching in
 * the same sitting) had to be entered as two unrelated log entries with no
 * connection between them — unlike the native tracker, which stamps a
 * shared `runId` on every draft from one lifecycle so they render as a
 * single combined coding/watching block (see lib/session-grouping.ts).
 *
 * This form now adopts that same mechanism instead of inventing a new one:
 * when both fields are filled in, it builds two SessionDrafts (one per
 * kind) and stamps the SAME runId on both. Existing grouping logic (never
 * touched here) then merges them into one combined block automatically,
 * exactly like a native-tracker run would. Filling in only one field still
 * works exactly as before — a single draft, its own runId, a normal
 * solo-kind entry.
 */
export function SessionForm({ onSubmit }: { onSubmit: (drafts: SessionDraft[]) => void }) {
  const [language, setLanguage] = useState("Python");
  const [codingMinutes, setCodingMinutes] = useState<string>("");
  const [watchingMinutes, setWatchingMinutes] = useState<string>("");

  const codingValue = Number(codingMinutes) || 0;
  const watchingValue = Number(watchingMinutes) || 0;
  const canSubmit = codingValue > 0 || watchingValue > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    // Shared identity for this submission — the same idea as the native
    // tracker's per-lifecycle runId, just generated once per manual log
    // instead of once per start()/stop(). If only one kind was filled in,
    // this still works fine: a runId shared by exactly one draft is just
    // a singleton group, identical to today's behavior.
    const runId = crypto.randomUUID();

    const drafts: SessionDraft[] = [];
    if (codingValue > 0) {
      drafts.push({ language, kind: "coding", durationMinutes: codingValue, source: "manual", runId });
    }
    if (watchingValue > 0) {
      drafts.push({ language, kind: "watching", durationMinutes: watchingValue, source: "manual", runId });
    }

    onSubmit(drafts);
    setCodingMinutes("");
    setWatchingMinutes("");
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <LanguageSelector value={language} onChange={setLanguage} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-status-coding">
            Coding
          </label>
          <Input
            type="number"
            min={0}
            value={codingMinutes}
            onChange={(e) => setCodingMinutes(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-status-learning">
            Watching
          </label>
          <Input
            type="number"
            min={0}
            value={watchingMinutes}
            onChange={(e) => setWatchingMinutes(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <p className="font-mono text-[10px] text-ink-500">
        Fill in one or both — minutes are in the same unit the tracker uses.
      </p>

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        Log session
      </Button>
    </form>
  );
}
