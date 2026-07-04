import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Always returns decimal hours, e.g. "1.5". Does exactly what the name
 * says — no silent unit switching. For durations under an hour this will
 * read as "0.0", which is misleading for compact summary displays (2 real
 * minutes -> "0.0h" looks like no time was logged at all); use
 * formatDurationCompact below for those. This function exists for chart
 * axes or any future caller that specifically wants a true decimal-hours
 * value and is prepared to handle small magnitudes itself (e.g. clamping a
 * minimum tick, or simply not caring because the values plotted are always
 * large).
 */
export function formatHoursDecimal(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

/**
 * Compact, auto-scaling duration display for summary readouts (language
 * totals, stat cards): whole minutes below one hour, one-decimal hours at
 * or above it. Explicitly named for what it does — the unit transition
 * itself is the point, not a side effect to discover by reading the output.
 *
 *   formatDurationCompact(2)   -> "2m"
 *   formatDurationCompact(59)  -> "59m"
 *   formatDurationCompact(60)  -> "1.0h"
 *   formatDurationCompact(125) -> "2.1h"
 *
 * Use formatMinutes instead when you want "Xh Ym" style (e.g. "2h 5m")
 * regardless of magnitude — that function never switches to decimals.
 * Use formatHoursDecimal instead when you specifically want decimal hours
 * even for sub-hour values.
 */
export function formatDurationCompact(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  return `${formatHoursDecimal(minutes)}h`;
}
