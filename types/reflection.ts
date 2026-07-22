/**
 * types/reflection.ts — one daily self-reported prompt entry.
 *
 * Deliberately tiny and answer-agnostic: `xpAwarded` is recorded on the
 * entry itself (rather than re-derived from a constant at read time) so a
 * future change to the flat reward amount never rewrites history — past
 * entries keep whatever they were actually awarded at the time.
 *
 * There is no "skipped" state and no penalty field anywhere in this shape,
 * on purpose — a day with no ReflectionEntry for it simply has none. See
 * hooks/useReflection.ts / lib/xp-system.ts: nothing in the streak or XP
 * system ever treats a missing entry as negative.
 */

export type ReflectionAnswer = "yes" | "no";

export interface ReflectionEntry {
  /** Local calendar date this entry is FOR, "YYYY-MM-DD". Not necessarily
   * the same as createdAt's date near midnight, though in practice it
   * always will be — this is the field everything groups/dedupes by. */
  date: string;
  /** Which prompt this answers — see constants/reflection-prompts.ts. */
  promptId: string;
  answer: ReflectionAnswer;
  /** Optional short free-text note, trimmed, undefined if empty. */
  note?: string;
  /** Flat XP awarded for this entry, same regardless of `answer` or
   * `note` content — see constants/xp-values.ts's REFLECTION_XP_FLAT. */
  xpAwarded: number;
  createdAt: string;
}
