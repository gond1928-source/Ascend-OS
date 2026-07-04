export type ActivityKind = "coding" | "watching";
export type SessionSource = "manual" | "activitywatch" | "timer" | "native";

export interface Session {
  id: string;
  language: string;
  kind: ActivityKind;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  source: SessionSource;
  note?: string;
  /**
   * Stable identifier shared by every session fragment produced during the
   * same tracker lifecycle/run (or the same one-off submission, for manual
   * entries and batch imports). This is the authoritative grouping key for
   * the Sessions history display — see lib/session-grouping.ts.
   *
   * Always present on sessions created after this field was introduced.
   * OPTIONAL ONLY for migration safety: sessions persisted before this field
   * existed (old localStorage data, the static seed dataset) won't have it.
   * Treat a missing runId as "this session is its own group of one" at read
   * time — never backfill a synthetic shared runId for old data, since
   * there's no reliable way to know which old sessions actually belonged
   * together.
   */
  runId?: string;
}

export interface SessionDraft {
  language: string;
  kind: ActivityKind;
  durationMinutes: number;
  source?: SessionSource;
  note?: string;
  /**
   * Run identity to stamp onto the resulting Session. Optional here because
   * not every draft producer represents a multi-fragment "run" — a single
   * manual log entry is trivially its own run of one, so the conversion
   * layer (lib/session-factory.ts) generates a fresh runId for drafts that
   * don't supply one, rather than requiring every call site to know or care.
   * Producers that DO span multiple fragments of one logical run (the
   * native tracker, an ActivityWatch import batch) must set this explicitly
   * and reuse the same value across every draft from that run/batch.
   */
  runId?: string;
}
