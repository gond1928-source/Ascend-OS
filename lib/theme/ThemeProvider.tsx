"use client";

/**
 * ThemeProvider.tsx
 *
 * Manages the active theme by toggling [data-theme="..."] on <html>.
 * This drives all CSS variable overrides defined in styles/themes/*.css.
 *
 * Usage:
 *   <ThemeProvider defaultTheme="dark">
 *     {children}
 *   </ThemeProvider>
 *
 * To add a new theme:
 *   1. Create styles/themes/your-theme.css with [data-theme="your-theme"] overrides.
 *   2. Import it in globals.css.
 *   3. Add "your-theme" to the Theme union type below.
 *   Done — the switcher handles everything else.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "glass";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = "ascend-os:theme";
const THEMES: Theme[] = ["dark", "glass"];

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = "dark" }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored && THEMES.includes(stored)) {
        applyTheme(stored);
        setThemeState(stored);
      } else {
        applyTheme(defaultTheme);
      }
    } catch {
      applyTheme(defaultTheme);
    }
  }, [defaultTheme]);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (Tauri sandboxed env) — in-memory only
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "glass" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Applies theme by setting data-theme on <html>. Pure DOM, no re-render needed. */
function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}
