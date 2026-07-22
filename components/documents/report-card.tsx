"use client";

import { useState } from "react";
import { ReportRecord } from "@/types/document";
import { saveReport, defaultReportFilename, shareReport } from "@/lib/export-engine";
import { formatMinutes } from "@/lib/utils";
import { Timestamp } from "@/components/ui/timestamp";
import { FileText, Download, Share2, Trash2, Eye } from "lucide-react";

export function ReportCard({
  report,
  onView,
  onDelete,
}: {
  report: ReportRecord;
  onView: () => void;
  onDelete: () => void;
}) {
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied">("idle");

  const handleShare = async () => {
    const result = await shareReport(report.data);
    if (result === "shared" || result === "copied") {
      setShareState(result);
      setTimeout(() => setShareState("idle"), 1800);
    }
  };

  // Richer metadata line — active time and the top language when the
  // report has one, both real signal already computed at generation time
  // (ReportData), just not surfaced on the row before now.
  const metaParts = [
    `Focus ${report.data.focusScore}/100`,
    `${report.data.sessionCount} sessions`,
    report.data.totalActiveMinutes > 0 ? formatMinutes(report.data.totalActiveMinutes) + " active" : null,
    report.data.mostProductiveLanguage,
  ].filter(Boolean);

  return (
    <div
      className="group flex items-center gap-3 border-b px-1 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--surface-elevated)]"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
      <button onClick={onView} className="flex-1 min-w-0 text-left">
        <p className="truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>
          {report.period === "weekly" ? "Weekly" : "Monthly"} — {report.data.periodLabel}
        </p>
        <p className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
          {metaParts.join(" · ")} · <Timestamp iso={report.generatedAt} />
        </p>
      </button>

      <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          title="Open"
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="rounded p-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button
          title="Export markdown"
          onClick={(e) => { e.stopPropagation(); saveReport(report.data, "markdown", defaultReportFilename(report.data, "markdown")); }}
          className="rounded p-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          title={shareState === "idle" ? "Share" : shareState === "shared" ? "Shared!" : "Copied!"}
          onClick={(e) => { e.stopPropagation(); handleShare(); }}
          className="rounded p-1.5"
          style={{ color: shareState === "idle" ? "var(--text-muted)" : "var(--status-coding)" }}
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
        <button title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded p-1.5" style={{ color: "var(--text-muted)" }}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
