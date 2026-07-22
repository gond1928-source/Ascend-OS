/**
 * context-switch-factory.ts — the single ContextSwitchDraft ->
 * ContextSwitchEvent conversion. Mirrors lib/session-factory.ts and
 * lib/distraction-factory.ts exactly, for the same reason: one place owns
 * this so the tracker's live commit path and the page-unload safety net
 * can never drift apart on fields like runId.
 *
 * Unlike Session/DistractionRecord, a ContextSwitchDraft always carries a
 * real `occurredAt` (it's only ever produced from real segment data inside
 * NativeTracker — there's no manual-entry path for "a switch happened"),
 * so there is no "now minus duration" fallback needed here.
 */

import { ContextSwitchDraft, ContextSwitchEvent } from "@/types/context-switch";

function generateRunId(): string {
  return crypto.randomUUID();
}

export function draftToContextSwitchEvent(draft: ContextSwitchDraft): ContextSwitchEvent {
  return {
    id: crypto.randomUUID(),
    fromCategory: draft.fromCategory,
    toCategory: draft.toCategory,
    occurredAt: new Date(draft.occurredAt).toISOString(),
    runId: draft.runId ?? generateRunId(),
  };
}

export function draftsToContextSwitchEvents(drafts: ContextSwitchDraft[]): ContextSwitchEvent[] {
  return drafts.map(draftToContextSwitchEvent);
}
