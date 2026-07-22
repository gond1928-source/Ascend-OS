"use client";
/**
 * useReflection — single-consumer stateful hook (no Context — same
 * precedent as hooks/useActivityWatch.ts; only the Reflection section
 * uses this today). Backed by lib/storage/reflection-store.ts.
 *
 * `submit` is idempotent per (date, promptId): calling it again for a
 * prompt already answered today is a no-op rather than double-awarding
 * XP or creating a duplicate entry.
 */

import { useCallback, useEffect, useState } from "react";
import { ReflectionAnswer, ReflectionEntry } from "@/types/reflection";
import { REFLECTION_PROMPTS } from "@/constants/reflection-prompts";
import { REFLECTION_XP_FLAT } from "@/constants/xp-values";
import { getReflectionStore } from "@/lib/storage/reflection-store";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useReflection() {
  const [entries, setEntries] = useState<ReflectionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getReflectionStore().load().then((loaded) => {
      if (cancelled) return;
      setEntries(loaded);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = todayKey();
  const todaysEntries = entries.filter((e) => e.date === today);
  const answeredPromptIds = new Set(todaysEntries.map((e) => e.promptId));
  const remainingPrompts = REFLECTION_PROMPTS.filter((p) => !answeredPromptIds.has(p.id));
  /** True once every prompt in REFLECTION_PROMPTS has an entry for today.
   * Never true "by default" and never treated as a failure state when
   * false — see the Reflection component, which shows the same neutral
   * row either way. */
  const hasAnsweredToday = remainingPrompts.length === 0;

  const submit = useCallback(
    (promptId: string, answer: ReflectionAnswer, note?: string) => {
      setEntries((prev) => {
        const already = prev.some((e) => e.date === today && e.promptId === promptId);
        if (already) return prev;

        const entry: ReflectionEntry = {
          date: today,
          promptId,
          answer,
          note: note?.trim() ? note.trim() : undefined,
          xpAwarded: REFLECTION_XP_FLAT,
          createdAt: new Date().toISOString(),
        };
        const next = [...prev, entry];
        void getReflectionStore().save(next);
        return next;
      });
    },
    [today],
  );

  return { isLoading, todaysEntries, remainingPrompts, hasAnsweredToday, submit };
}
