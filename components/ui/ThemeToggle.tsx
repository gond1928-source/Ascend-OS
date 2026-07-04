"use client";

import { useTheme } from "@/lib/theme/ThemeProvider";
import { Moon, Layers } from "lucide-react";

/**
 * ThemeToggle — visible in the sidebar footer.
 * Switches between Dark and Glass themes with persistence via ThemeProvider.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle-group">
      <button
        onClick={() => setTheme("dark")}
        className={`theme-toggle-btn${theme === "dark" ? " theme-toggle-btn--active" : ""}`}
        aria-pressed={theme === "dark"}
        title="Dark theme"
      >
        <Moon className="h-3 w-3" />
        <span>Dark</span>
      </button>
      <button
        onClick={() => setTheme("glass")}
        className={`theme-toggle-btn${theme === "glass" ? " theme-toggle-btn--active" : ""}`}
        aria-pressed={theme === "glass"}
        title="Glass theme"
      >
        <Layers className="h-3 w-3" />
        <span>Glass</span>
      </button>
    </div>
  );
}
