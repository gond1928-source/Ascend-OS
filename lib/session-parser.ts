import { Session, SessionDraft } from "@/types/session";

// Normalizes raw input (manual form, ActivityWatch payload, timer output)
// into the canonical Session shape used everywhere else in the app.
export function draftToSession(draft: SessionDraft): Session {
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - draft.durationMinutes * 60000);
  return {
    id: crypto.randomUUID(),
    language: draft.language,
    kind: draft.kind,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMinutes: draft.durationMinutes,
    source: "manual",
    note: draft.note,
  };
}
