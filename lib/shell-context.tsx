"use client";
/**
 * shell-context.tsx — UI-only state for the persistent shell.
 *
 * Independent pieces of state, one provider (they're small and only ever
 * consumed together at the shell level): Command palette, Toast.
 *
 * The shell used to also own a collapsible contextual sidebar (a rail icon
 * would toggle it open with a given "section" id). That's gone as of the
 * single-sidebar shell (design brief §1 revision) — the sidebar is now one
 * persistent, always-expanded surface with no open/closed/section state of
 * its own, so there's nothing left here to track for it.
 *
 *  - Command palette: just open/closed. The registry of navigable items
 *    lives in the CommandPalette component itself, not here.
 *
 * No app data lives here — purely presentation-layer state, same spirit as
 * SessionContext/DistractionContext but for UI chrome instead of records.
 */

import { createContext, useCallback, useMemo, useState, ReactNode } from "react";

// ── Command palette ───────────────────────────────────────────────────────────

interface CommandPaletteState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

// ── Toast ────────────────────────────────────────────────────────────────────
//
// Quiet, in-app confirmation for actions like "file saved" — deliberately
// NOT an OS-level notification (those are a separate, later concern for
// the Notifications phase; see lib/tauri/bridge.ts's showNotification stub
// comment). Small queue rather than a single slot so two quick actions
// (e.g. saving two reports back to back) don't clobber each other.

export type ToastTone = "info" | "error";

export interface ToastMessage {
  id: string;
  text: string;
  tone: ToastTone;
}

interface ToastState {
  items: ToastMessage[];
  show: (text: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

interface ShellContextValue {
  commandPalette: CommandPaletteState;
  toast: ToastState;
}

export const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  // Command palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const togglePalette = useCallback(() => setPaletteOpen((v) => !v), []);

  // Toast
  const [toastItems, setToastItems] = useState<ToastMessage[]>([]);
  const dismissToast = useCallback((id: string) => {
    setToastItems((items) => items.filter((t) => t.id !== id));
  }, []);
  const showToast = useCallback((text: string, tone: ToastTone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToastItems((items) => [...items, { id, text, tone }]);
    // Auto-dismiss — quiet confirmations shouldn't require manual cleanup,
    // but ToastHost also renders a manual dismiss control for anyone who
    // wants it gone sooner (or needs longer to read an error).
    setTimeout(() => dismissToast(id), tone === "error" ? 6000 : 4000);
  }, [dismissToast]);

  const value = useMemo<ShellContextValue>(
    () => ({
      commandPalette: {
        isOpen: paletteOpen,
        open: openPalette,
        close: closePalette,
        toggle: togglePalette,
      },
      toast: {
        items: toastItems,
        show: showToast,
        dismiss: dismissToast,
      },
    }),
    [
      paletteOpen, openPalette, closePalette, togglePalette,
      toastItems, showToast, dismissToast,
    ],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}
