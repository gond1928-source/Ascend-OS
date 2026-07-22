"use client";
import { useMemo } from "react";
import { Session } from "@/types/session";
import { DistractionRecord } from "@/types/distraction";
import { getDistractionSummary, getTopPeakHours } from "@/lib/analytics-engine";
import { DistractionSummary, PeakHour } from "@/types/analytics";

export function useDistractionAnalytics(
  sessions: Session[],
  distractions: DistractionRecord[],
): { data: DistractionSummary; peakHours: PeakHour[] } {
  const data = useMemo(
    () => getDistractionSummary(sessions, distractions),
    [sessions, distractions],
  );
  const peakHours = useMemo(() => getTopPeakHours(sessions, 3), [sessions]);
  return { data, peakHours };
}
