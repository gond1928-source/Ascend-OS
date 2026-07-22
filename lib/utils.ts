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

/**
 * Full date + time + timezone for a native tooltip on a relative
 * timestamp — e.g. hovering "2h ago" shows the exact moment. Shared by
 * every relative-time display in the app (Reports, Study Library,
 * Projects, Activity) via components/ui/timestamp.tsx, rather than each
 * page reimplementing the same Intl call.
 */
export function formatFullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }) + ` (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
}

/**
 * Compact relative timestamp for "Last updated"/"Last activity" readouts
 * (Project Overview tab). Plain and factual per the design brief's copy
 * tone — no "just now!" exclamation, no fuzzy marketing phrasing.
 */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(months / 12);
  return `${years}y ago`;
}

/**
 * File size for the file-attachment row (design brief §11 — e.g.
 * "filename.pdf · 152.49 KB"). Bytes in, human string out; caller decides
 * whether a size is even known (many attachments today are external URLs
 * with no byte count available, so this is only called when one exists).
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
