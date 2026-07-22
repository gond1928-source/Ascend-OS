"use client";
/**
 * SettingsRow / SettingsToggle — the settings-row pattern from design
 * brief §11: bold label, one-line muted description, right-aligned
 * control, hairline divider between rows. No cards, no boxes, ever. A row
 * rendered without a description is considered incomplete per the brief,
 * so `description` is required, not optional.
 */

import { ReactNode } from "react";

export function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <div className="settings-row-label">{label}</div>
        <div className="settings-row-desc">{description}</div>
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

export function SettingsToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible label — the row's own visible label already names the
   * setting, so this is screen-reader-only context ("Enabled"/"Disabled"). */
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={checked ? "settings-toggle settings-toggle--on" : "settings-toggle"}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-toggle-thumb" />
    </button>
  );
}
