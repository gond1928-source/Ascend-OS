"use client";
/**
 * useReports — loads persisted ReportRecords and exposes generate/delete.
 * Generation reads live sessions + distractions and snapshots the result
 * via lib/report-engine.ts; only two kinds are ever generated (weekly,
 * monthly), matching the product spec.
 */
import { useCallback, useEffect, useState } from "react";
import { Session } from "@/types/session";
import { DistractionRecord } from "@/types/distraction";
import { ReportRecord, ReportPeriod } from "@/types/document";
import { buildWeeklyReport, buildMonthlyReport } from "@/lib/report-engine";
import { getReportStore } from "@/lib/storage/report-store";
import { useNotifications } from "@/hooks/useNotifications";

export function useReports(sessions: Session[], distractions: DistractionRecord[]) {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { notify } = useNotifications();

  useEffect(() => {
    let cancelled = false;
    getReportStore().load().then((loaded) => {
      if (cancelled) return;
      setReports(loaded);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const generateReport = useCallback(
    (period: ReportPeriod): ReportRecord => {
      const data = period === "weekly"
        ? buildWeeklyReport(sessions, distractions)
        : buildMonthlyReport(sessions, distractions);

      const record: ReportRecord = {
        id: crypto.randomUUID(),
        period,
        generatedAt: new Date().toISOString(),
        data,
      };

      setReports((prev) => {
        const next = [record, ...prev];
        void getReportStore().save(next);
        return next;
      });

      notify({
        kind: "report-generated",
        title: `${period === "weekly" ? "Weekly" : "Monthly"} report ready`,
        subtitle: data.periodLabel,
        path: `/documents?tab=reports&open=${record.id}`,
      });

      return record;
    },
    [sessions, distractions, notify],
  );

  const deleteReport = useCallback((id: string) => {
    setReports((prev) => {
      const next = prev.filter((r) => r.id !== id);
      void getReportStore().save(next);
      return next;
    });
  }, []);

  return { reports, isLoading, generateReport, deleteReport };
}
