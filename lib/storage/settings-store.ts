/**
 * lib/storage/settings-store.ts
 *
 * Same seam as lib/storage/session-store.ts: everything above this layer
 * (SettingsContext, useSettings, native-tracker.ts) works purely in terms
 * of `AscendSettings` — none of it knows or cares that this is
 * localStorage today. See session-store.ts's header for the full
 * migration-path rationale; it applies identically here.
 *
 * Also exports a synchronous `loadSettingsSync()`, mirroring
 * session-store.ts's `loadSessionsSync()`. NativeTracker reads settings on
 * every poll (every 5s) via this sync path rather than the async
 * SettingsStore interface, so a mid-session settings change (e.g. raising
 * the distraction floor) takes effect on the very next poll without any
 * extra subscription plumbing between SettingsContext and the tracker
 * singleton.
 */

import { AscendSettings, DEFAULT_SETTINGS } from "@/types/settings";

export interface SettingsStore {
  /** Load persisted settings, or DEFAULT_SETTINGS on first launch /
   * corrupt data. Never throws. */
  load(): Promise<AscendSettings>;
  save(settings: AscendSettings): Promise<void>;
  reset(): Promise<void>;
}

const STORAGE_KEY = "ascend_settings_v1";

/**
 * Merges a possibly-partial/old-shape parsed value over DEFAULT_SETTINGS,
 * one section at a time, so adding a new field to AscendSettings later
 * (e.g. a new capability) never breaks existing users' persisted settings
 * — missing keys just fall back to the default for that key rather than
 * the whole section reverting.
 */
function mergeWithDefaults(parsed: unknown): AscendSettings {
  const p = (parsed ?? {}) as Partial<AscendSettings>;
  return {
    general: { ...DEFAULT_SETTINGS.general, ...p.general },
    appearance: { ...DEFAULT_SETTINGS.appearance, ...p.appearance },
    capabilities: { ...DEFAULT_SETTINGS.capabilities, ...p.capabilities },
    privacy: { ...DEFAULT_SETTINGS.privacy, ...p.privacy },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...p.notifications },
  };
}

class LocalStorageSettingsStore implements SettingsStore {
  async load(): Promise<AscendSettings> {
    return loadSettingsSync();
  }

  async save(settings: AscendSettings): Promise<void> {
    saveSettingsSync(settings);
  }

  async reset(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Synchronous read — used by NativeTracker's per-poll settings read, and
 * as the actual implementation backing the async `load()` above. */
export function loadSettingsSync(): AscendSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return mergeWithDefaults(JSON.parse(raw));
  } catch (err) {
    console.warn("[settings-store] Failed to load settings, using defaults:", err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettingsSync(settings: AscendSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error("[settings-store] Failed to save settings:", err);
  }
}

let storeInstance: SettingsStore | null = null;

/** The single switch-point for the settings persistence backend — see
 * session-store.ts's getSessionStore() for the identical rationale. */
export function getSettingsStore(): SettingsStore {
  if (!storeInstance) {
    storeInstance = new LocalStorageSettingsStore();
  }
  return storeInstance;
}
