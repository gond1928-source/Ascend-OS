"use client";
/**
 * DistractionContext — single source of truth for distraction records
 * across the app. Mirrors SessionContext exactly (same rationale: one
 * provider at the root, everything else reads through useDistractions()).
 */

import { createContext, useCallback, useEffect, useState, ReactNode } from "react";
import { DistractionRecord, DistractionDraft } from "@/types/distraction";
import { draftToDistraction } from "@/lib/distraction-factory";
import { getDistractionStore } from "@/lib/storage/distraction-store";

export interface DistractionContextValue {
  distractions: DistractionRecord[];
  isLoading: boolean;
  addDistraction: (draft: DistractionDraft) => DistractionRecord;
  deleteDistraction: (id: string) => void;
  clearAll: () => void;
}

export const DistractionContext = createContext<DistractionContextValue | null>(null);

export function DistractionProvider({ children }: { children: ReactNode }) {
  const [distractions, setDistractions] = useState<DistractionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const store = getDistractionStore();

    store.load().then((loaded) => {
      if (cancelled) return;
      setDistractions(loaded);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const addDistraction = useCallback((draft: DistractionDraft) => {
    const record = draftToDistraction(draft);
    setDistractions((prev) => {
      const next = [record, ...prev];
      void getDistractionStore().save(next);
      return next;
    });
    return record;
  }, []);

  const deleteDistraction = useCallback((id: string) => {
    setDistractions((prev) => {
      const next = prev.filter((d) => d.id !== id);
      void getDistractionStore().save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setDistractions([]);
    void getDistractionStore().clear();
  }, []);

  return (
    <DistractionContext.Provider value={{ distractions, isLoading, addDistraction, deleteDistraction, clearAll }}>
      {children}
    </DistractionContext.Provider>
  );
}
