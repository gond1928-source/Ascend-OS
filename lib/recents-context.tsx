"use client";
/**
 * RecentsContext — single source of truth for "recently opened" entries
 * shown in the sidebar's Recents section (design brief §1).
 *
 * Same "one provider, not a standalone useState hook" reasoning as
 * projects-context.tsx/notifications-context.tsx: recordOpen() is called
 * from two unrelated pages (app/projects/page.tsx, app/documents/page.tsx)
 * while the list itself is read by a third, always-mounted component
 * (the sidebar). A plain per-component hook would reproduce the exact
 * desync bug those files' headers document — the writer's copy updates,
 * the sidebar's separate copy doesn't, until a full remount.
 */

import { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from "react";
import { RecentEntry, RecentKind } from "@/types/recent";
import { getRecentsStore } from "@/lib/storage/recents-store";

/** Sidebar only ever displays the newest few; storing a little past that
 * costs nothing and avoids a sharp cutoff if the display limit ever grows. */
const MAX_STORED = 10;

export interface RecordOpenInput {
  id: string;
  kind: RecentKind;
  label: string;
  href: string;
}

interface RecentsContextValue {
  recents: RecentEntry[];
  isLoading: boolean;
  recordOpen: (input: RecordOpenInput) => void;
}

export const RecentsContext = createContext<RecentsContextValue | null>(null);

export function RecentsProvider({ children }: { children: ReactNode }) {
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getRecentsStore().load().then((loaded) => {
      if (cancelled) return;
      setRecents(loaded);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recordOpen = useCallback((input: RecordOpenInput) => {
    setRecents((prev) => {
      // Re-opening something already in the list moves it to the front
      // and refreshes its label/href/timestamp, rather than duplicating
      // the row — "recent" means most-recently-touched, not a full log.
      const withoutThis = prev.filter((r) => !(r.kind === input.kind && r.id === input.id));
      const next = [
        { ...input, openedAt: new Date().toISOString() },
        ...withoutThis,
      ].slice(0, MAX_STORED);
      void getRecentsStore().save(next);
      return next;
    });
  }, []);

  const value = useMemo<RecentsContextValue>(
    () => ({ recents, isLoading, recordOpen }),
    [recents, isLoading, recordOpen],
  );

  return <RecentsContext.Provider value={value}>{children}</RecentsContext.Provider>;
}
