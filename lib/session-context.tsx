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
 */

import { createContext, useCallback, useEffect, useState, ReactNode } from "react";
import { Session, SessionDraft } from "@/types/session";
import { draftToSession } from "@/lib/session-factory";
import { xpForSession } from "@/lib/xp-system";
import starterData from "@/data/starter-data.json";

const STORAGE_KEY = "ascend_sessions_v1";

function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Session[];
  } catch {}
  const seeded = starterData.sessions as Session[];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveSessions(sessions: Session[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export interface SessionContextValue {
  sessions: Session[];
  isLoading: boolean;
  addSession: (draft: SessionDraft) => { session: Session; xpEarned: number };
  deleteSession: (id: string) => void;
  clearAll: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSessions(loadSessions());
    setIsLoading(false);
  }, []);

  const addSession = useCallback((draft: SessionDraft) => {
    const session = draftToSession(draft);
    setSessions((prev) => {
      const next = [session, ...prev];
      saveSessions(next);
      return next;
    });
    return { session, xpEarned: xpForSession(session) };
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSessions([]);
    saveSessions([]);
  }, []);

  return (
    <SessionContext.Provider value={{ sessions, isLoading, addSession, deleteSession, clearAll }}>
      {children}
    </SessionContext.Provider>
  );
}
