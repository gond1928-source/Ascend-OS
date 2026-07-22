"use client";
/**
 * SettingsContext — single source of truth for AscendSettings, same
 * pattern as SessionContext/DistractionContext (see lib/session-context.tsx's
 * header for the full "why one provider" rationale).
 *
 * Persistence goes through lib/storage/settings-store.ts. First launch
 * always starts from DEFAULT_SETTINGS (types/settings.ts) — no seeded/mock
 * data, matching the rest of the app's local-first convention.
 *
 * Accent color side effect: whenever appearance.accentColor changes (on
 * load and on every update), this provider writes it straight to
 * `--accent-primary` on <html> via an inline style — the same
 * imperative-DOM-write pattern ThemeProvider's applyTheme() already uses
 * for [data-theme]. An inline style wins over the theme files' own
 * [data-theme="dark"/"glass"] { --accent-primary: ... } rules regardless of
 * which theme is active, so accent color and theme stay fully independent.
 */

import { createContext, useCallback, useEffect, useState, ReactNode } from "react";
import { AscendSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { getSettingsStore } from "@/lib/storage/settings-store";

export interface SettingsContextValue {
  settings: AscendSettings;
  isLoading: boolean;
  /** Shallow-merges a partial update into one section, e.g.
   * updateSettings("capabilities", { commandPaletteEnabled: false }). */
  updateSettings: <K extends keyof AscendSettings>(
    section: K,
    patch: Partial<AscendSettings[K]>,
  ) => void;
  resetSettings: () => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Mirrors ThemeProvider's applyTheme() — direct DOM write, no re-render
 * required for the CSS half of this to take effect. */
function applyAccentColor(hex: string) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--accent-primary", hex);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AscendSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const store = getSettingsStore();

    store.load().then((loaded) => {
      if (cancelled) return;
      setSettings(loaded);
      applyAccentColor(loaded.appearance.accentColor);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback<SettingsContextValue["updateSettings"]>((section, patch) => {
    setSettings((prev) => {
      const next: AscendSettings = {
        ...prev,
        [section]: { ...prev[section], ...patch },
      };
      void getSettingsStore().save(next);
      if (section === "appearance" && "accentColor" in patch) {
        applyAccentColor(next.appearance.accentColor);
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    applyAccentColor(DEFAULT_SETTINGS.appearance.accentColor);
    void getSettingsStore().reset();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
