"use client";

/**
 * DocumentReader — the reading surface for Reports and Study Library items,
 * rendered as normal in-flow workspace content (not a modal overlay).
 *
 * This is a chrome swap around the same content components the old
 * DocumentViewer modal used (ReportView / StudyItemView / the TOC rail /
 * export actions) — none of that content logic changed. What changed is
 * the shell: no fixed-inset backdrop, no centered floating card. This
 * fills the workspace pane the way opening a file in VS Code or a page in
 * Notion replaces the editor content, with the nav rail/sidebar still
 * visible around it. A "Back" arrow returns to the list, driven by the
 * Documents page's `?open=` query param (browser back/forward and
 * command-palette deep links both work through it).
 */

import { useEffect, useRef, useState } from "react";
import { ViewableDocument, ReportData } from "@/types/document";
import { ReportView, REPORT_SECTIONS } from "./report-view";
import { StudyItemView, looksLikeLoadablePdfUrl } from "./study-item-view";
import { saveReport, defaultReportFilename, ExportFormat, shareReport } from "@/lib/export-engine";
import { captureReportCharts } from "@/lib/chart-capture";
import { useShell } from "@/hooks/useShell";
import { useNotifications } from "@/hooks/useNotifications";
import { tauriOpenUrl } from "@/lib/tauri/bridge";
import { ArrowLeft, Save, FileText, Share2, StickyNote, BookMarked, Link2, Image as ImageIcon, ExternalLink, Loader2, Trash2 } from "lucide-react";
import "@/styles/document-viewer.css";

const STUDY_KIND_ICON = {
  note: StickyNote,
  reference: BookMarked,
  link: Link2,
  pdf: FileText,
  screenshot: ImageIcon,
} as const;

export function DocumentReader({
  document: doc,
  onBack,
  onSaveStudyItem,
  onDelete,
}: {
  document: ViewableDocument;
  onBack: () => void;
  onSaveStudyItem?: (id: string, patch: { content: string }) => void;
  /**
   * Optional — when provided, shows a Delete action in the header. This is
   * what closes the one real gap left by removing the right panel
   * (design brief §1's revision note): opening a document used to also
   * populate the panel with a Delete action, so you could delete while
   * reading without going back to the list first. Callers own the actual
   * delete + navigate-away; this component just renders the trigger.
   * Shared by Reports, Study Items, and Project Notes (Notes render
   * through this same component — see app/projects/page.tsx).
   */
  onDelete?: () => void;
}) {
  const [shareState, setShareState] = useState<"idle" | "done">("idle");
  const contentRef = useRef<HTMLDivElement>(null);

  const isReport = doc.kind === "report";
  const d = isReport ? doc.record.data : null;
  const isPdf = doc.kind === "study-item" && doc.item.kind === "pdf";

  const handleShare = async () => {
    if (!d) return;
    const result = await shareReport(d);
    if (result !== "failed") {
      setShareState("done");
      setTimeout(() => setShareState("idle"), 1800);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Header — hairline bottom border, back arrow, no backdrop ──────── */}
      <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b px-6 py-4" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex min-w-0 items-start gap-3">
          <button
            onClick={onBack}
            className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
            style={{ color: "var(--text-muted)" }}
            title="Back to Documents"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {isReport ? (
                doc.record.data.period === "weekly" ? "Weekly report" : "Monthly report"
              ) : (
                <>
                  {(() => {
                    const Icon = STUDY_KIND_ICON[doc.item.kind];
                    return <Icon className="h-3 w-3" />;
                  })()}
                  {doc.item.topic}
                </>
              )}
            </p>
            <h1 className="mt-0.5 truncate text-[20px] font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              {isReport ? doc.record.data.periodLabel : doc.item.title}
            </h1>
            <p className="mt-0.5 font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
              {isReport
                ? `Generated ${new Date(doc.record.generatedAt).toLocaleString()}`
                : `Added ${new Date(doc.item.createdAt).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        {(isReport || (isPdf && doc.kind === "study-item" && looksLikeLoadablePdfUrl(doc.item.content)) || onDelete) && (
          <div className="flex flex-shrink-0 items-center gap-2">
            {isReport && d && (
              <>
                <SaveMenu report={d} reportId={doc.record.id} contentRef={contentRef} />
                <IconAction onClick={handleShare} label={shareState === "done" ? "Shared" : "Share"}><Share2 className="h-3.5 w-3.5" /></IconAction>
              </>
            )}
            {isPdf && doc.kind === "study-item" && looksLikeLoadablePdfUrl(doc.item.content) && (
              <IconAction onClick={() => tauriOpenUrl(doc.item.content)} label="Open externally">
                <ExternalLink className="h-3.5 w-3.5" />
              </IconAction>
            )}
            {onDelete && (
              <IconAction onClick={onDelete} label="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </IconAction>
            )}
          </div>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {isReport && (
          <nav
            className="hidden w-[190px] flex-shrink-0 space-y-0.5 overflow-y-auto border-r px-3 py-5 lg:block"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Contents</p>
            {REPORT_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-md px-2 py-1.5 text-[12px]"
                style={{ color: "var(--text-secondary)" }}
              >
                {s.label}
              </a>
            ))}
          </nav>
        )}

        {isPdf && doc.kind === "study-item" ? (
          // PDFs render full-bleed (native viewer, not reading-width prose) —
          // no point constraining a document viewer to a 720px text column.
          <div className="flex min-w-0 flex-1 overflow-hidden p-4">
            <StudyItemView
              item={doc.item}
              onSave={(patch) => onSaveStudyItem?.(doc.item.id, { content: patch.content ?? doc.item.content })}
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1 overflow-y-auto px-6 py-6 md:px-10">
            <div ref={contentRef} className="mx-auto w-full max-w-[720px]">
              {isReport && d && <ReportView data={d} />}
              {!isReport && (
                <StudyItemView
                  item={doc.item}
                  onSave={(patch) => onSaveStudyItem?.(doc.item.id, { content: patch.content ?? doc.item.content })}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IconAction({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px]"
      style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ── Save menu ────────────────────────────────────────────────────────────
//
// One "Save" action replacing the old three separate Markdown/CSV/PDF
// buttons: choose a format + filename here, then hand off to
// lib/export-engine's saveReport (native OS save dialog + real file write,
// with a browser-download fallback outside Tauri). Confirmation is an
// in-app toast — never an OS notification (see ToastHost's doc comment).
const FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "markdown", label: "Markdown" },
  { value: "csv", label: "CSV" },
];

function extensionFor(format: ExportFormat): string {
  return format === "pdf" ? "pdf" : format === "markdown" ? "md" : "csv";
}

function SaveMenu({ report, reportId, contentRef }: { report: ReportData; reportId: string; contentRef: React.RefObject<HTMLDivElement> }) {
  const { toast } = useShell();
  const { notify } = useNotifications();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [filename, setFilename] = useState(() => defaultReportFilename(report, "pdf"));
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  const changeFormat = (next: ExportFormat) => {
    // Swap just the extension so a filename the person already edited
    // isn't clobbered — only the auto-generated default portion changes.
    const base = filename.replace(/\.[a-z0-9]+$/i, "");
    setFilename(`${base}.${extensionFor(next)}`);
    setFormat(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Chart images only matter for PDF — Markdown/CSV are numbers-only
      // by design (see export-engine.ts header comment).
      const charts = format === "pdf" && contentRef.current
        ? await captureReportCharts(contentRef.current)
        : [];

      const result = await saveReport(report, format, filename, charts);

      if (result.status === "saved" || result.status === "downloaded") {
        toast.show(result.status === "saved" ? `Saved to ${result.path}` : `Downloaded ${result.path}`);
        setOpen(false);
        notify({
          kind: "export-completed",
          title: "Export complete",
          subtitle: filename,
          path: `/documents?tab=reports&open=${reportId}`,
        });
      } else if (result.status === "cancelled") {
        // Quiet — no toast, the person just closed the OS dialog.
      } else {
        toast.show(`Couldn't save the file: ${result.message}`, "error");
      }
    } catch (err) {
      toast.show(`Couldn't save the file: ${err instanceof Error ? err.message : "unknown error"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <IconAction onClick={() => setOpen((v) => !v)} label="Save">
        <Save className="h-3.5 w-3.5" />
      </IconAction>

      {open && (
        <div className="export-menu">
          <p className="export-menu-label">Format</p>
          <div className="export-menu-formats">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`export-menu-format-btn${format === opt.value ? " export-menu-format-btn--active" : ""}`}
                onClick={() => changeFormat(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <p className="export-menu-label">File name</p>
          <input
            className="export-menu-filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            spellCheck={false}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="export-menu-save-btn"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
