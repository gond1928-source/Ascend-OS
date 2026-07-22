"use client";

import { useState } from "react";
import { ProjectResource } from "@/types/project";
import { StudyItem, StudyItemKind } from "@/types/document";
import { FileAttachmentRow } from "@/components/documents/file-attachment-row";
import { detectLinkKind } from "@/lib/link-preview";
import { ChevronRight, FileText, StickyNote, Link2, Trash2, Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const STUDY_KIND_LABEL: Record<StudyItemKind, string> = {
  note: "Note",
  pdf: "PDF",
  link: "Link",
  reference: "Reference",
  screenshot: "Screenshot",
};

function iconForStudyKind(kind: StudyItemKind) {
  if (kind === "note") return StickyNote;
  if (kind === "link") return Link2;
  return FileText;
}

/**
 * ResourceList — grouped-list-with-counts (design brief §11), split into
 * the two natural categories a resource can be: a linked Study Library
 * item (still lives in the flat library — this is only a reference) or a
 * raw external link. Links get a "smart" icon/type/label parsed straight
 * from the URL (lib/link-preview.ts) — GitHub, YouTube, Figma, Notion,
 * Google Docs, Discord all get recognized without any network call. Rows
 * still reuse FileAttachmentRow, with a hover-revealed Copy Link action
 * alongside the existing remove action — deliberately compact (GitHub
 * Desktop/Raycast-style rows, not a large card with a thumbnail).
 */
export function ResourceList({
  resources,
  studyItems,
  onOpenStudyItem,
  onOpenLink,
  onDelete,
}: {
  resources: ProjectResource[];
  studyItems: StudyItem[];
  onOpenStudyItem: (item: StudyItem) => void;
  onOpenLink: (url: string) => void;
  onDelete: (resourceId: string) => void;
}) {
  const studyResources = resources.filter((r) => r.kind === "study-item");
  const linkResources = resources.filter((r) => r.kind === "link");

  return (
    <div className="space-y-3">
      <ResourceGroup label="Study Library" count={studyResources.length}>
        {studyResources.map((r) => {
          if (r.kind !== "study-item") return null;
          const item = studyItems.find((s) => s.id === r.studyItemId);
          if (!item) {
            return (
              <div key={r.id} className="flex items-center gap-2 border-b px-1 py-2 last:border-b-0" style={{ borderColor: "var(--border-subtle)" }}>
                <span className="flex-1 text-[13px] italic" style={{ color: "var(--text-muted)" }}>
                  Study item removed
                </span>
                <button
                  onClick={() => onDelete(r.id)}
                  aria-label="Remove from project"
                  className="rounded p-1.5 hover:bg-status-error/10 hover:text-status-error"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          }
          return (
            <ResourceRow
              key={r.id}
              name={item.title}
              typeLabel={STUDY_KIND_LABEL[item.kind]}
              icon={iconForStudyKind(item.kind)}
              onOpen={() => onOpenStudyItem(item)}
              onDelete={() => onDelete(r.id)}
            />
          );
        })}
      </ResourceGroup>

      <ResourceGroup label="Links" count={linkResources.length}>
        {linkResources.map((r) => {
          if (r.kind !== "link") return null;
          const detected = detectLinkKind(r.url);
          return (
            <ResourceRow
              key={r.id}
              name={r.label || detected.label}
              typeLabel={detected.type}
              icon={detected.icon}
              copyUrl={r.url}
              onOpen={() => onOpenLink(r.url)}
              onDelete={() => onDelete(r.id)}
            />
          );
        })}
      </ResourceGroup>
    </div>
  );
}

function ResourceRow({
  name, typeLabel, icon, copyUrl, onOpen, onDelete,
}: {
  name: string;
  typeLabel: string;
  icon: typeof FileText;
  copyUrl?: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!copyUrl) return;
    try {
      await navigator.clipboard.writeText(copyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard access can fail (permissions, non-secure context) —
      // silently no-op rather than surface a disruptive error for a
      // low-stakes convenience action.
    }
  }

  const openLabel = typeLabel === "Repository" ? "Open Repository" : `Open ${typeLabel}`;

  return (
    <div className="group flex items-center gap-1">
      <div className="min-w-0 flex-1">
        <FileAttachmentRow name={name} typeLabel={typeLabel} icon={icon} onClick={onOpen} />
      </div>
      <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          onClick={onOpen}
          aria-label={openLabel}
          title={openLabel}
          className="rounded p-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        {copyUrl && (
          <button
            onClick={copyLink}
            aria-label="Copy link"
            title="Copy link"
            className="rounded p-1.5"
            style={{ color: copied ? "var(--status-success)" : "var(--text-muted)" }}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          onClick={onDelete}
          aria-label="Remove from project"
          title="Remove from project"
          className="rounded p-1.5 hover:bg-status-error/10 hover:text-status-error"
          style={{ color: "var(--text-muted)" }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ResourceGroup({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="grouped-list">
      <button className="grouped-list-header" onClick={() => setOpen((o) => !o)}>
        <span className="grouped-list-title">{label}</span>
        <span className="grouped-list-count">{count}</span>
        <ChevronRight className={cn("grouped-list-chevron", open && "grouped-list-chevron--open")} />
      </button>
      {open && (count === 0 ? <p className="grouped-list-empty">Nothing here.</p> : <div>{children}</div>)}
    </div>
  );
}
