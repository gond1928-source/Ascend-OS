/**
 * session-factory.ts — the single, authoritative SessionDraft -> Session
 * conversion.
 *
 * Before this module existed, the same conversion was implemented three
 * separate times (lib/session-context.tsx's addSession, lib/tracker/
 * storage.ts's draftToStoredSession, and lib/session-parser.ts's unused
 * draftToSession), each free to drift from the others. The unload-safety
 * path in storage.ts is exactly the kind of place a drifted copy would go
 * unnoticed for a long time, since it only runs during page teardown.
 *
 * Owns the runId assignment policy: a draft that already specifies a runId
 * (the native tracker stamps one per lifecycle; an ActivityWatch import
 * batch stamps one per batch) keeps it. A draft with no runId — a single
 * manual log entry, or anything else representing a one-off submission —
 * gets a freshly generated id, so every persisted Session always has one
 * going forward, and grouping (lib/session-grouping.ts) never has to guess.
 */

import { Session, SessionDraft } from "@/types/session";

function generateRunId(): string {
  // crypto.randomUUID() is available in both the browser and Node 19+;
  // this file only ever runs client-side (session-context.tsx, storage.ts's
  // unload handler) or in this project's Node-based test harnesses.
  return crypto.randomUUID();
}

/**
 * Converts a SessionDraft into a persisted Session, ending "now" (or the
 * given `endedAt`, for callers that need a stable timestamp across a batch
 * of conversions — see draftsToSessions below).
 */
export function draftToSession(draft: SessionDraft, endedAt: Date = new Date()): Session {
  const startedAt = new Date(endedAt.getTime() - draft.durationMinutes * 60_000);
  return {
    id: crypto.randomUUID(),
    language: draft.language,
    kind: draft.kind,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMinutes: draft.durationMinutes,
    source: draft.source ?? "manual",
    note: draft.note,
    runId: draft.runId ?? generateRunId(),
  };
}

/**
 * Converts a batch of drafts from the SAME flush/commit event. Each draft
 * still gets its own real timestamp (mirroring how the native tracker's
 * onSessionsCommitted historically called addSession once per draft in a
 * tight loop — real, slightly different wall-clock moments, not artificially
 * identical ones), but all share one `endedAt` baseline so per-draft
 * ordering reads naturally without needing draftToSession's default
 * `new Date()` to be called once per item in a way that could reorder under
 * slow execution.
 */
export function draftsToSessions(drafts: SessionDraft[], batchEndedAt: Date = new Date()): Session[] {
  return drafts.map((draft) => draftToSession(draft, batchEndedAt));
}
