"use client";
/**
 * AppRulesContext — single source of truth for AppRule[], same pattern as
 * SessionContext/SettingsContext. Persistence goes through
 * lib/storage/app-rules-store.ts. First launch starts from an empty array
 * — there is no seeded/default rule set; every app is "auto" classified,
 * "on" tracking, "counts" progress, "visible" until a person explicitly
 * configures a rule for it (see the App Rules panel UI).
 *
 * This context owns CRUD only (upsert/remove/get). The matching/lookup
 * logic that actually applies a rule during live tracking lives in
 * lib/app-rules.ts, and NativeTracker reads rules directly off
 * lib/storage/app-rules-store.ts's synchronous loadAppRulesSync() rather
 * than through this context — the tracker singleton isn't a React
 * component, so it can't consume a context. This context exists purely for
 * the Settings UI to read/edit rules and have every consumer (just the App
 * Rules panel today) share one state.
 */

import { createContext, useCallback, useEffect, useState, ReactNode } from "react";
import { AppRule, AppRuleDraft } from "@/types/app-rule";
import { getAppRulesStore, draftToNewRule } from "@/lib/storage/app-rules-store";
import { findRuleForApp } from "@/lib/app-rules";

export interface AppRulesContextValue {
  rules: AppRule[];
  isLoading: boolean;
  /** Looks up an existing rule by app/site label, case-insensitive. */
  getRuleForApp: (appName: string) => AppRule | undefined;
  /** Creates a new rule, or updates the existing one for this appName if
   * one already exists (upsert — the App Rules panel edits one row's
   * controls at a time, it never needs to manage ids directly). */
  upsertRule: (draft: AppRuleDraft) => void;
  removeRule: (id: string) => void;
  clearAll: () => void;
}

export const AppRulesContext = createContext<AppRulesContextValue | null>(null);

export function AppRulesProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<AppRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const store = getAppRulesStore();

    store.load().then((loaded) => {
      if (cancelled) return;
      setRules(loaded);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const getRuleForApp = useCallback(
    (appName: string) => findRuleForApp(rules, appName),
    [rules],
  );

  const upsertRule = useCallback((draft: AppRuleDraft) => {
    setRules((prev) => {
      const key = draft.appName.trim().toLowerCase();
      const existingIndex = prev.findIndex((r) => r.appName.trim().toLowerCase() === key);

      let next: AppRule[];
      if (existingIndex >= 0) {
        next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          ...draft,
          updatedAt: new Date().toISOString(),
        };
      } else {
        next = [...prev, draftToNewRule(draft)];
      }

      void getAppRulesStore().save(next);
      return next;
    });
  }, []);

  const removeRule = useCallback((id: string) => {
    setRules((prev) => {
      const next = prev.filter((r) => r.id !== id);
      void getAppRulesStore().save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRules([]);
    void getAppRulesStore().clear();
  }, []);

  return (
    <AppRulesContext.Provider value={{ rules, isLoading, getRuleForApp, upsertRule, removeRule, clearAll }}>
      {children}
    </AppRulesContext.Provider>
  );
}
