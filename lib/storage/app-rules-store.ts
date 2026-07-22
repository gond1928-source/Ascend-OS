/**
 * lib/storage/app-rules-store.ts
 *
 * Same seam as lib/storage/session-store.ts and settings-store.ts — see
 * session-store.ts's header for the full rationale. `AppRulesContext` /
 * `useAppRules()` are the only things above this layer that should ever
 * import this file directly (plus NativeTracker's synchronous read below).
 */

import { AppRule, AppRuleDraft } from "@/types/app-rule";

export interface AppRulesStore {
  /** Load all persisted rules. Empty array on first launch / corrupt data. */
  load(): Promise<AppRule[]>;
  save(rules: AppRule[]): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = "ascend_app_rules_v1";

class LocalStorageAppRulesStore implements AppRulesStore {
  async load(): Promise<AppRule[]> {
    return loadAppRulesSync();
  }

  async save(rules: AppRule[]): Promise<void> {
    saveAppRulesSync(rules);
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Synchronous read — used by NativeTracker on every poll (see
 * lib/app-rules.ts / native-tracker.ts) so a rule edited mid-session takes
 * effect on the very next poll, and as the real implementation backing the
 * async `load()` above. */
export function loadAppRulesSync(): AppRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppRule[]) : [];
  } catch (err) {
    console.warn("[app-rules-store] Failed to load app rules, starting clean:", err);
    return [];
  }
}

export function saveAppRulesSync(rules: AppRule[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch (err) {
    console.error("[app-rules-store] Failed to save app rules:", err);
  }
}

let storeInstance: AppRulesStore | null = null;

/** The single switch-point for the app-rules persistence backend — see
 * session-store.ts's getSessionStore() for the identical rationale. */
export function getAppRulesStore(): AppRulesStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageAppRulesStore();
  }
  return storeInstance;
}

// ── Draft → Rule helpers (used by AppRulesContext) ──────────────────────────

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function draftToNewRule(draft: AppRuleDraft): AppRule {
  const now = new Date().toISOString();
  return { id: newId(), ...draft, createdAt: now, updatedAt: now };
}
