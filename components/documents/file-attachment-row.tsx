"use client";

/**
 * FileAttachmentRow — shared file-icon + filename + size row (design brief
 * §11, Linear reference): "a small file/document icon, filename, and file
 * size, left-to-right, clickable, no thumbnail needed." Used for PDF
 * references in the Document Reader / Study Library today; Project
 * resources and Project Activity file attachments (a later phase) reuse
 * this same component rather than a new one.
 *
 * `sizeBytes` is optional on purpose — attachments added by URL (today's
 * PDF/link study items) don't have a known byte count, and this row reads
 * fine without one (icon + name + type label instead of icon + name +
 * size). A future file-upload path can pass a real size once bytes exist.
 */

import { FileText, Link2, Download } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

export function FileAttachmentRow({
  name,
  sizeBytes,
  typeLabel,
  dateLabel,
  icon: Icon = FileText,
  onClick,
  action = "open",
}: {
  /** Filename shown, e.g. "roadmap.pdf" */
  name: string;
  /** Known byte size, if any. Omit when unknown (e.g. URL-based attachments). */
  sizeBytes?: number;
  /** Fallback label shown instead of a size when sizeBytes is unknown, e.g. "PDF" or "Link". */
  typeLabel?: string;
  /** Optional relative-date string (e.g. "added 3d ago") appended as a third metadata segment. */
  dateLabel?: string;
  icon?: typeof FileText;
  onClick: () => void;
  /** Which trailing affordance icon to show — "open" (default) or "download". */
  action?: "open" | "download";
}) {
  const meta = sizeBytes !== undefined ? formatFileSize(sizeBytes) : typeLabel;

  return (
    <button
      onClick={onClick}
      className="file-attachment-row"
      title={name}
    >
      <Icon className="file-attachment-row-icon" />
      <span className="file-attachment-row-name">{name}</span>
      {meta && <span className="file-attachment-row-meta">· {meta}</span>}
      {dateLabel && <span className="file-attachment-row-meta">· {dateLabel}</span>}
      <span className="file-attachment-row-action">
        {action === "download" ? <Download className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
      </span>
    </button>
  );
}
