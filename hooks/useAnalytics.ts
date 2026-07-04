"use client";
import { useMemo } from "react";
import { Session } from "@/types/session";
import { getAnalyticsSummary } from "@/lib/analytics-engine";
import { AnalyticsSummary } from "@/types/analytics";

export function useAnalytics(sessions: Session[]): { data: AnalyticsSummary } {
  const data = useMemo(() => getAnalyticsSummary(sessions), [sessions]);
  return { data };
}
