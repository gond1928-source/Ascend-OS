/**
 * export-engine.ts — real export/share implementations for reports.
 *
 * Markdown/CSV: pure string builders (reportToMarkdown/reportToCSV) — no
 * placeholder content, every number backing every on-screen chart is
 * represented (language breakdown, peak hours, top distractions, the
 * coding-vs-watching trend) so nothing is lost just because a chart can't
 * render in a text format.
 *
 * PDF: native PDF bytes via jsPDF + jspdf-autotable (real PDF generation,
 * not the browser's print-to-PDF dialog) — see reportToPdfBytes. Chart
 * visuals are embedded as captured PNGs of the report's actual on-screen
 * recharts SVGs (lib/chart-capture.ts), not a redrawn approximation.
 *
 * Save flow: one entry point, saveReport(), builds the content for the
 * chosen format and hands it to lib/tauri/bridge.ts's tauriSaveFile,
 * which opens the native OS save dialog and writes real bytes to disk
 * (falling back to a plain browser download outside Tauri).
 */

import { ReportData } from "@/types/document";
import { tauriSaveFile, SaveFileResult } from "@/lib/tauri/bridge";
import { CapturedChart } from "@/lib/chart-capture";

export type ExportFormat = "pdf" | "markdown" | "csv";

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── Markdown export ──────────────────────────────────────────────────────────

export function reportToMarkdown(report: ReportData): string {
  const lines: string[] = [];
  lines.push(`# ${report.period === "weekly" ? "Weekly" : "Monthly"} Report — ${report.periodLabel}`);
  lines.push("");
  lines.push(report.activitySummary);
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push(`- **Coding time:** ${report.totalCodingMinutes} min`);
  lines.push(`- **Watching/learning time:** ${report.totalWatchingMinutes} min`);
  lines.push(`- **Distraction time:** ${report.totalDistractionMinutes} min`);
  lines.push(`- **Focus score:** ${report.focusScore}/100`);
  lines.push(
    `- **Coding vs. watching ratio:** ${report.codingToWatchingRatio ?? "—"}`,
  );
  lines.push(
    `- **Productive vs. distracted ratio:** ${report.productiveToDistractedRatio ?? "—"}`,
  );
  lines.push(`- **Most productive language:** ${report.mostProductiveLanguage ?? "—"}`);
  lines.push(`- **Sessions logged:** ${report.sessionCount}`);
  lines.push(`- **Context switches (distraction events):** ${report.contextSwitchCount}`);
  lines.push("");

  lines.push("## Streak consistency");
  lines.push("");
  lines.push(`- Current streak: ${report.streak.currentStreak} days`);
  lines.push(`- Longest streak: ${report.streak.longestStreak} days`);
  lines.push(
    `- Active ${report.streak.activeDaysInPeriod} of ${report.streak.totalDaysInPeriod} days this period`,
  );
  lines.push("");

  if (report.peakHours.length > 0) {
    lines.push("## Peak activity hours");
    lines.push("");
    for (const h of report.peakHours) {
      lines.push(`- ${h.hour}:00 — ${h.minutes} min`);
    }
    lines.push("");
  }

  if (report.languageBreakdown.length > 0) {
    lines.push("## Language breakdown");
    lines.push("");
    lines.push("| Language | Coding (min) | Watching (min) | Total (min) |");
    lines.push("|---|---|---|---|");
    for (const l of report.languageBreakdown) {
      lines.push(`| ${l.language} | ${l.codingMinutes} | ${l.watchingMinutes} | ${l.totalMinutes} |`);
    }
    lines.push("");
  }

  if (report.topDistractions.length > 0) {
    lines.push("## Top distractions");
    lines.push("");
    lines.push("| Source | Minutes |");
    lines.push("|---|---|");
    for (const d of report.topDistractions) {
      lines.push(`| ${d.label} | ${d.minutes} |`);
    }
    lines.push("");
  }

  if (report.learningTrend.length > 0) {
    lines.push("## Session distribution");
    lines.push("");
    lines.push("| Period | Coding (min) | Watching (min) |");
    lines.push("|---|---|---|");
    for (const t of report.learningTrend) {
      lines.push(`| ${t.label} | ${t.codingMinutes} | ${t.watchingMinutes} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ── CSV export ───────────────────────────────────────────────────────────────

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRows(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

/**
 * Every underlying number behind every chart on the report — CSV can't
 * hold the charts themselves, but nothing they represent is missing here:
 * language breakdown, peak hours, top distractions, and the coding-vs-
 * watching trend all get their own table below the summary metrics.
 */
export function reportToCSV(report: ReportData): string {
  const blocks: string[] = [];

  blocks.push(csvRows([
    ["Metric", "Value"],
    ["Period", report.periodLabel],
    ["Coding minutes", report.totalCodingMinutes],
    ["Watching minutes", report.totalWatchingMinutes],
    ["Distraction minutes", report.totalDistractionMinutes],
    ["Focus score", report.focusScore],
    ["Most productive language", report.mostProductiveLanguage ?? ""],
    ["Sessions logged", report.sessionCount],
    ["Context switches", report.contextSwitchCount],
    ["Current streak (days)", report.streak.currentStreak],
    ["Longest streak (days)", report.streak.longestStreak],
  ]));

  if (report.languageBreakdown.length > 0) {
    blocks.push(csvRows([
      ["Language breakdown"],
      ["Language", "Coding (min)", "Watching (min)", "Total (min)"],
      ...report.languageBreakdown.map((l) => [l.language, l.codingMinutes, l.watchingMinutes, l.totalMinutes]),
    ]));
  }

  if (report.peakHours.length > 0) {
    blocks.push(csvRows([
      ["Peak activity hours"],
      ["Hour", "Minutes"],
      ...report.peakHours.map((h) => [`${h.hour}:00`, h.minutes]),
    ]));
  }

  if (report.topDistractions.length > 0) {
    blocks.push(csvRows([
      ["Top distractions"],
      ["Source", "Minutes"],
      ...report.topDistractions.map((d) => [d.label, d.minutes]),
    ]));
  }

  if (report.learningTrend.length > 0) {
    blocks.push(csvRows([
      ["Session distribution (coding vs. watching over time)"],
      ["Period", "Coding (min)", "Watching (min)"],
      ...report.learningTrend.map((t) => [t.label, t.codingMinutes, t.watchingMinutes]),
    ]));
  }

  return blocks.join("\n\n");
}

// ── PDF export (native bytes via jsPDF, real charts via captured PNGs) ──────

export async function reportToPdfBytes(report: ReportData, charts: CapturedChart[] = []): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  // v5+ no longer auto-applies the plugin or exposes a default export —
  // autoTable is a named export you call as autoTable(doc, options), see
  // jspdf-autotable's v5 release notes (jsPDF 4.x peer-dep support landed
  // alongside this API change).
  //
  // Important: autoTable()'s return type is `void` (confirmed against the
  // published v5.0.8 type declarations) — there is no returned Table to
  // read .finalY off, and v5 also dropped doc.lastAutoTable. The
  // documented way to know where a table ended is the didDrawPage hook,
  // which receives HookData with a `table.finalY` — see drawTable below.
  const { autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginX * 2;
  let y = 48;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 40) {
      doc.addPage();
      y = 48;
    }
  };

  /** Draws a table and returns the Y position right after it, captured via
   * the didDrawPage hook rather than a return value (see comment above). */
  const drawTable = (options: Parameters<typeof autoTable>[1]): number => {
    let finalY = (typeof options.startY === "number" ? options.startY : y);
    autoTable(doc, {
      ...options,
      didDrawPage: (data) => {
        if (typeof data.table.finalY === "number") finalY = data.table.finalY;
        options.didDrawPage?.(data);
      },
    });
    return finalY;
  };

  const chartByKey = new Map(charts.map((c) => [c.key, c]));
  const addChart = (key: string) => {
    const chart = chartByKey.get(key);
    if (!chart) return;
    const displayWidth = Math.min(contentWidth, 360);
    const displayHeight = (chart.height / chart.width) * displayWidth;
    ensureSpace(displayHeight + 20);
    doc.addImage(chart.dataUrl, "PNG", marginX, y, displayWidth, displayHeight);
    y += displayHeight + 20;
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`${report.period === "weekly" ? "Weekly" : "Monthly"} Report`, marginX, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(report.periodLabel, marginX, y);
  y += 20;
  doc.setTextColor(20);
  doc.setFontSize(10.5);
  const summaryLines = doc.splitTextToSize(report.activitySummary, contentWidth);
  doc.text(summaryLines, marginX, y);
  y += summaryLines.length * 14 + 14;

  // Overview table
  ensureSpace(140);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Overview", marginX, y);
  y += 8;
  y = drawTable({
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 4 },
    columnStyles: { 0: { textColor: [90, 90, 90] }, 1: { fontStyle: "bold" } },
    body: [
      ["Coding time", `${report.totalCodingMinutes} min`],
      ["Watching/learning time", `${report.totalWatchingMinutes} min`],
      ["Distraction time", `${report.totalDistractionMinutes} min`],
      ["Focus score", `${report.focusScore}/100`],
      ["Coding vs. watching ratio", String(report.codingToWatchingRatio ?? "—")],
      ["Productive vs. distracted ratio", String(report.productiveToDistractedRatio ?? "—")],
      ["Most productive language", report.mostProductiveLanguage ?? "—"],
      ["Sessions logged", String(report.sessionCount)],
      ["Context switches", String(report.contextSwitchCount)],
      ["Current streak", `${report.streak.currentStreak} days`],
      ["Longest streak", `${report.streak.longestStreak} days`],
    ],
  }) + 24;

  // Coding vs. watching (pie chart)
  if (report.totalCodingMinutes > 0 || report.totalWatchingMinutes > 0) {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Coding vs. Learning", marginX, y);
    y += 12;
    addChart("coding-vs-watching");
  }

  // Language breakdown (bar chart + table)
  if (report.languageBreakdown.length > 0) {
    addChart("language-breakdown");
    ensureSpace(30);
    y = drawTable({
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: "striped",
      styles: { fontSize: 9 },
      head: [["Language", "Coding (min)", "Watching (min)", "Total (min)"]],
      body: report.languageBreakdown.map((l) => [l.language, l.codingMinutes, l.watchingMinutes, l.totalMinutes]),
    }) + 24;
  }

  // Coding vs. watching trend (area chart)
  if (report.learningTrend.length > 0) {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Coding vs. watching over time", marginX, y);
    y += 12;
    addChart("learning-trend");
  }

  // Top distractions
  if (report.topDistractions.length > 0) {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Top distractions", marginX, y);
    y += 8;
    y = drawTable({
      startY: y,
      margin: { left: marginX, right: marginX },
      theme: "striped",
      styles: { fontSize: 9 },
      head: [["Source", "Minutes"]],
      body: report.topDistractions.map((d) => [d.label, d.minutes]),
    }) + 24;
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

// ── Unified save flow ─────────────────────────────────────────────────────

const FORMAT_META: Record<ExportFormat, { extension: string; mimeType: string; filterName: string }> = {
  pdf: { extension: "pdf", mimeType: "application/pdf", filterName: "PDF" },
  markdown: { extension: "md", mimeType: "text/markdown", filterName: "Markdown" },
  csv: { extension: "csv", mimeType: "text/csv", filterName: "CSV" },
};

export function defaultReportFilename(report: ReportData, format: ExportFormat): string {
  return `${slug(report.periodLabel)}-report.${FORMAT_META[format].extension}`;
}

/**
 * Builds the report in the requested format and writes it via the native
 * save dialog (tauriSaveFile — see that function's doc comment for the
 * Tauri-vs-browser-fallback behavior). `charts` is only used for PDF;
 * pass what lib/chart-capture.ts captured from the currently-mounted
 * report, or omit it for a numbers-only PDF (sections just fall back to
 * their table with no chart image above it).
 */
export async function saveReport(
  report: ReportData,
  format: ExportFormat,
  filename: string,
  charts: CapturedChart[] = [],
): Promise<SaveFileResult> {
  const meta = FORMAT_META[format];
  const name = filename.trim() || defaultReportFilename(report, format);
  const withExtension = name.toLowerCase().endsWith(`.${meta.extension}`) ? name : `${name}.${meta.extension}`;

  let data: string | Uint8Array;
  if (format === "pdf") {
    data = await reportToPdfBytes(report, charts);
  } else if (format === "markdown") {
    data = reportToMarkdown(report);
  } else {
    data = reportToCSV(report);
  }

  return tauriSaveFile({
    defaultName: withExtension,
    filters: [{ name: meta.filterName, extensions: [meta.extension] }],
    data,
    mimeType: meta.mimeType,
  });
}

// ── Share ────────────────────────────────────────────────────────────────────

/**
 * Shares a productivity summary via the Web Share API when available
 * (mobile/modern desktop browsers); falls back to copying the markdown
 * summary to the clipboard. Both are real actions — never a no-op.
 */
export async function shareReport(report: ReportData): Promise<"shared" | "copied" | "failed"> {
  const text = `${report.period === "weekly" ? "Weekly" : "Monthly"} report — ${report.periodLabel}\n\n${report.activitySummary}`;

  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
        title: `${report.periodLabel} — Ascend OS`,
        text,
      });
      return "shared";
    } catch {
      // User cancelled or share failed — fall through to clipboard.
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
