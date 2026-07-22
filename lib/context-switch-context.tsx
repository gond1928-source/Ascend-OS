"use client";
/**
 * ContextSwitchContext — single source of truth for context-switch events
 * across the app. Mirrors SessionContext / DistractionContext exactly
 * (same rationale: one provider at the root, everything else reads
 * through useContextSwitches()).
 */

import { createContext, useCallback, useEffect, useState, ReactNode } from "react";
import { ContextSwitchEvent, ContextSwitchDraft } from "@/types/context-switch";
import { draftToContextSwitchEvent } from "@/lib/context-switch-factory";
import { getContextSwitchStore } from "@/lib/storage/context-switch-store";

export interface ContextSwitchContextValue {
  contextSwitches: ContextSwitchEvent[];
  isLoading: boolean;
  addContextSwitch: (draft: ContextSwitchDraft) => ContextSwitchEvent;
  deleteContextSwitch: (id: string) => void;
  clearAll: () => void;
}

export const ContextSwitchContext = createContext<ContextSwitchContextValue | null>(null);

export function ContextSwitchProvider({ children }: { children: ReactNode }) {
  const [contextSwitches, setContextSwitches] = useState<ContextSwitchEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const store = getContextSwitchStore();

    store.load().then((loaded) => {
      if (cancelled) return;
      setContextSwitches(loaded);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const addContextSwitch = useCallback((draft: ContextSwitchDraft) => {
    const event = draftToContextSwitchEvent(draft);
    setContextSwitches((prev) => {
      const next = [event, ...prev];
      void getContextSwitchStore().save(next);
      return next;
    });
    return event;
  }, []);

  const deleteContextSwitch = useCallback((id: string) => {
    setContextSwitches((prev) => {
      const next = prev.filter((e) => e.id !== id);
      void getContextSwitchStore().save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setContextSwitches([]);
    void getContextSwitchStore().clear();
  }, []);

  return (
    <ContextSwitchContext.Provider
      value={{ contextSwitches, isLoading, addContextSwitch, deleteContextSwitch, clearAll }}
    >
      {children}
    </ContextSwitchContext.Provider>
  );
}
