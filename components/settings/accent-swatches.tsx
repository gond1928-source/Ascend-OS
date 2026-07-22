"use client";
/**
 * AccentSwatches — the curated accent-color picker for Settings →
 * Appearance. Deliberately a small fixed set of swatches (design brief §2:
 * "one accent color, used sparingly"), not a free color picker.
 *
 * Renders with inline styles reading the swatch's own hex value directly
 * (never a Tailwind utility class), so this component has zero exposure to
 * the `accent-violet` static-alias bug flagged in the handoff notes.
 */

import { Check } from "lucide-react";
import { CURATED_ACCENT_SWATCHES } from "@/types/settings";

export function AccentSwatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="settings-swatches">
      {CURATED_ACCENT_SWATCHES.map((swatch) => {
        const active = swatch.value.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={swatch.id}
            type="button"
            title={swatch.label}
            aria-label={swatch.label}
            aria-pressed={active}
            className={active ? "settings-swatch settings-swatch--active" : "settings-swatch"}
            style={{ background: swatch.value }}
            onClick={() => onChange(swatch.value)}
          >
            {active && (
              <span className="settings-swatch-check">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
