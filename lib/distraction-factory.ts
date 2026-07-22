/**
 * distraction-factory.ts — the single DistractionDraft -> DistractionRecord
 * conversion. Mirrors lib/session-factory.ts's rationale exactly: one place
 * owns this so the tracker's live commit path and the page-unload safety
 * net can never drift apart on fields like runId.
 */

import { DistractionDraft, DistractionRecord } from "@/types/distraction";

function generateRunId(): string {
  return crypto.randomUUID();
}

export function draftToDistraction(
  draft: DistractionDraft,
  endedAt: Date = new Date(),
): DistractionRecord {
  const startedAt = new Date(endedAt.getTime() - draft.durationMinutes * 60_000);
  return {
    id: crypto.randomUUID(),
    label: draft.label,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMinutes: draft.durationMinutes,
    source: draft.source ?? "native",
    note: draft.note,
    runId: draft.runId ?? generateRunId(),
  };
}

export function draftsToDistractions(
  drafts: DistractionDraft[],
  batchEndedAt: Date = new Date(),
): DistractionRecord[] {
  return drafts.map((draft) => draftToDistraction(draft, batchEndedAt));
}
