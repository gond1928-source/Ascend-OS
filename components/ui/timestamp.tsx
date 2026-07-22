"use client";

import { formatRelativeTime, formatFullTimestamp } from "@/lib/utils";

/**
 * Timestamp — relative time (e.g. "2h ago") with a native tooltip showing
 * the full date/time/timezone on hover. Extracted from Activity's own
 * inline version (Checkpoint C) since Reports/Study Library/Projects all
 * want the same thing during this polish pass — one implementation, not
 * four copies of the same Intl call.
 */
export function Timestamp({ iso, prefix }: { iso: string; prefix?: string }) {
  return (
    <time dateTime={iso} title={formatFullTimestamp(iso)}>
      {prefix ? `${prefix} ` : ""}
      {formatRelativeTime(iso)}
    </time>
  );
}
