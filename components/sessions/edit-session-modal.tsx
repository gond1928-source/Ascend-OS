"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSelector } from "./language-selector";
import { Session } from "@/types/session";

/**
 * EditSessionModal — edits a manual session group's language/duration in
 * place. Only ever opened for groups whose badge is "Manual" (session-
 * row.tsx already restricts the edit action to that case); tracked
 * sessions stay read-only, per the brief.
 *
 * Takes the raw underlying Session records for the group (1 or 2 — a
 * combined manual group is at most one coding + one watching draft that
 * shared a runId, per session-form.tsx) rather than a SessionGroup,
 * because SessionGroup only stores aggregated minutes + a flat id list —
 * it doesn't retain which id is the coding one vs the watching one. That
 * mapping already exists on the raw Session records themselves (`.kind`),
 * so resolving it here avoids touching lib/session-grouping.ts at all.
 *
 * Caller contract: mount this with a `key` derived from the group's ids
 * (e.g. `group.sessionIds.join(",")`) so a different group reliably
 * starts from fresh field values instead of the previous edit's state.
 */
export function EditSessionModal({
  open,
  onClose,
  sessions,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  sessions: Session[];
  onSave: (edits: { id: string; language: string; durationMinutes: number }[]) => void;
}) {
  const codingSession = sessions.find((s) => s.kind === "coding") ?? null;
  const watchingSession = sessions.find((s) => s.kind === "watching") ?? null;

  const [language, setLanguage] = useState(sessions[0]?.language ?? "Python");
  const [codingMinutes, setCodingMinutes] = useState(String(codingSession?.durationMinutes ?? ""));
  const [watchingMinutes, setWatchingMinutes] = useState(String(watchingSession?.durationMinutes ?? ""));

  const codingValue = Number(codingMinutes) || 0;
  const watchingValue = Number(watchingMinutes) || 0;
  const canSave = codingValue > 0 || watchingValue > 0;

  function handleSave() {
    if (!canSave) return;
    const edits: { id: string; language: string; durationMinutes: number }[] = [];
    if (codingSession) edits.push({ id: codingSession.id, language, durationMinutes: codingValue });
    if (watchingSession) edits.push({ id: watchingSession.id, language, durationMinutes: watchingValue });
    onSave(edits);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="mb-4 font-display text-[16px] font-semibold text-ink-50">Edit session</h3>

      <div className="space-y-3">
        <LanguageSelector value={language} onChange={setLanguage} />

        <div className="grid grid-cols-2 gap-2">
          {(codingSession || !watchingSession) && (
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-status-coding">Coding</label>
              <Input type="number" min={0} value={codingMinutes} onChange={(e) => setCodingMinutes(e.target.value)} placeholder="0" />
            </div>
          )}
          {(watchingSession || !codingSession) && (
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-status-learning">Watching</label>
              <Input type="number" min={0} value={watchingMinutes} onChange={(e) => setWatchingMinutes(e.target.value)} placeholder="0" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!canSave}>Save changes</Button>
      </div>
    </Modal>
  );
}
