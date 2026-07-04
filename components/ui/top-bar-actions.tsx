"use client";

/**
 * TopBarActions — floating "Customize" + "Notifications" controls,
 * pinned to the top-right of the main content area on every page.
 *
 * Theme switching used to live in the sidebar footer; it now lives here,
 * inside the Customize panel, matching where the reference dashboard
 * puts its "Customize" button. Selecting a theme still saves it via
 * ThemeProvider's existing localStorage persistence, so whatever you
 * pick here is automatically what loads next time — no separate
 * "set as default" action needed.
 */

import { useEffect, useRef, useState } from "react";
import { Settings2, Bell } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { cn } from "@/lib/utils";

export function TopBarActions() {
  const [open, setOpen] = useState<"customize" | "notifications" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  return (
    <div ref={rootRef} className="topbar-actions">
      {/* Notifications */}
      <div className="topbar-item">
        <button
          className="topbar-btn topbar-icon-btn"
          onClick={() => setOpen((o) => (o === "notifications" ? null : "notifications"))}
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        {open === "notifications" && (
          <div className="topbar-panel topbar-panel--right">
            <p className="topbar-panel-title">Notifications</p>
            <div className="topbar-panel-empty">
              <Bell className="h-5 w-5 opacity-40" />
              <p>No new notifications yet</p>
            </div>
          </div>
        )}
      </div>

      {/* Customize */}
      <div className="topbar-item">
        <button
          className={cn("topbar-btn", open === "customize" && "topbar-btn--active")}
          onClick={() => setOpen((o) => (o === "customize" ? null : "customize"))}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Customize
        </button>
        {open === "customize" && (
          <div className="topbar-panel topbar-panel--right topbar-panel--wide">
            <p className="topbar-panel-title">Appearance</p>
            <ThemeToggle />
            <p className="topbar-panel-hint">
              Currently using <strong>{theme === "dark" ? "Dark" : "Glass"}</strong>. Your choice is
              saved automatically and becomes the default the next time you open Ascend OS.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
