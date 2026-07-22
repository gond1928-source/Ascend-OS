"use client";
import { useEffect, useMemo, useReducer, useState } from "react";
import { totalXP, reflectionBonusXP } from "@/lib/xp-system";
import { levelForXP } from "@/lib/level-system";
import { Session } from "@/types/session";
import { loadReflectionsSync, subscribeReflections } from "@/lib/storage/reflection-store";

export function useXP(sessions: Session[]) {
  // Bumps on every reflection write anywhere in the app (see
  // reflection-store.ts's subscribeReflections doc comment) so XP/level
  // shown here — icon rail, Dashboard, /sessions — updates the instant a
  // person submits today's reflection, without needing `sessions` itself
  // to change.
  const [tick, bump] = useReducer((c: number) => c + 1, 0);
  useEffect(() => subscribeReflections(bump), []);

  // `loadReflectionsSync()` reads localStorage, which only exists
  // client-side. This used to be called directly inside the useMemo
  // below, which runs during render — including the very first CLIENT
  // render, the one React diffs against server-rendered (localStorage-
  // less) HTML during hydration. Any existing reflection data made that
  // first client render's XP/level differ from the server's markup,
  // producing a hydration mismatch (icon-rail's `--xp-pct` custom
  // property was the visible symptom). Reading it inside an effect
  // instead means the first client render computes bonus=0, exactly
  // matching the server; the real value then arrives via a normal
  // post-hydration re-render, which never triggers a hydration warning.
  const [reflectionBonus, setReflectionBonus] = useState(0);
  useEffect(() => {
    setReflectionBonus(reflectionBonusXP(loadReflectionsSync()));
    // `tick` is intentionally a dependency purely to force recomputation
    // on every reflection write — its value itself is never read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return useMemo(() => {
    const xp = totalXP(sessions, reflectionBonus);
    return { xp, ...levelForXP(xp) };
  }, [sessions, reflectionBonus]);
}
