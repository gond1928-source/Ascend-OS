"use client";

/**
 * ToastHost — quiet, in-app confirmations (e.g. "Saved to weekly-report.pdf").
 * Deliberately NOT an OS-level notification — see lib/tauri/bridge.ts's
 * showNotification stub comment for why those stay a separate, later
 * concern (Notifications phase) rather than reusing this mechanism.
 *
 * Mounted once in AppShell, reads from useShell()'s `toast` slice. Design
 * brief tone: plain factual text, no exclamation points, no color wash —
 * grayscale surface with a small accent/error dot only as the one
 * "this means X" signal (Tier 2 color use).
 */

import { Check, AlertCircle, X } from "lucide-react";
import { useShell } from "@/hooks/useShell";

export function ToastHost() {
  const { toast } = useShell();

  if (toast.items.length === 0) return null;

  return (
    <div className="toast-host">
      {toast.items.map((t) => (
        <div key={t.id} className={`toast-item${t.tone === "error" ? " toast-item--error" : ""}`}>
          {t.tone === "error" ? (
            <AlertCircle className="toast-item-icon" />
          ) : (
            <Check className="toast-item-icon" />
          )}
          <span className="toast-item-text">{t.text}</span>
          <button className="toast-item-dismiss" onClick={() => toast.dismiss(t.id)} aria-label="Dismiss">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
