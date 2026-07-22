"use client";
/**
 * SessionContext — single source of truth for sessions across the entire app.
 *
 * Previously each useSessions() call owned its own useState, so the sidebar,
 * dashboard, sessions page, and timer components all had independent copies.
 * Writing to one copy (e.g. addSession on the sessions page) didn't propagate
 * to the others (e.g. the sidebar), causing stale XP/level display.
 *
 * Fix: one provider mounted at the root layout wraps the whole app.
 * Every useSessions() call reads from this single shared state.
 *
 * Persistence: reads/writes go through `getSessionStore()`
 * (lib/storage/session-store.ts) rather than touching localStorage
 * directly. First launch always starts from an empty array — there is no
 * seeded/mock dataset anywhere in this path. See that file's header for
 * how this seam is meant to support a future SQLite/Tauri-fs migration
 * without touching this component.
 */

import { createContext, useCallback, useEffect, useState, ReactNode } from "react";
import { Session, SessionDraft } from "@/types/session";
import { draftToSession } from "@/lib/session-factory";
import { xpForSession } from "@/lib/xp-system";
import { getSessionStore } from "@/lib/storage/session-store";

export interface SessionContextValue {
  sessions: Session[];
  isLoading: boolean;
  addSession: (draft: SessionDraft) => { session: Session; xpEarned: number };
  updateSession: (id: string, patch: Partial<Pick<Session, "language" | "durationMinutes" | "note">>) => void;
  deleteSession: (id: string) => void;
  clearAll: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const store = getSessionStore();

    store.load().then((loaded) => {
      if (cancelled) return;
      // No seeding here on any failure/empty path — an empty result from
      // the store IS the correct first-launch state (zero sessions, zero
      // XP, zero streaks), not a signal to fall back to mock data.
      setSessions(loaded);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const addSession = useCallback((draft: SessionDraft) => {
    const session = draftToSession(draft);
    setSessions((prev) => {
      const next = [session, ...prev];
      void getSessionStore().save(next);
      return next;
    });
    return { session, xpEarned: xpForSession(session) };
  }, []);

  /**
   * Edits a manual session's language/duration/note in place. Deliberately
   * does NOT allow editing `kind`, `startedAt`, or `source` — changing kind
   * would need to re-run session-grouping's combined-bar logic, and this is
   * scoped to fixing an existing manual entry's details, not re-authoring
   * it. Also deliberately does not recompute `endedAt` from the new
   * duration — nothing currently renders endedAt for a manual entry, but
   * flagging this here so a future feature that does render it isn't
   * surprised that duration and endedAt can drift apart after an edit.
   */
  const updateSession = useCallback((id: string, patch: Partial<Pick<Session, "language" | "durationMinutes" | "note">>) => {
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
      void getSessionStore().save(next);
      return next;
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      void getSessionStore().save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSessions([]);
    void getSessionStore().clear();
  }, []);

  return (
    <SessionContext.Provider value={{ sessions, isLoading, addSession, updateSession, deleteSession, clearAll }}>
      {children}
    </SessionContext.Provider>
  );
}
