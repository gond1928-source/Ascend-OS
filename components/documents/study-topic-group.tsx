"use client";

import { useState } from "react";
import { StudyItem, StudyItemKind } from "@/types/document";
import { ChevronRight, FileText, Link2, StickyNote, BookMarked, Image as ImageIcon, Trash2, ExternalLink } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { FileAttachmentRow } from "./file-attachment-row";

export const KIND_ICON: Record<StudyItemKind, typeof FileText> = {
  note: StickyNote,
  pdf: FileText,
  link: Link2,
  reference: BookMarked,
  screenshot: ImageIcon,
};

export const KIND_LABEL: Record<StudyItemKind, string> = {
  note: "Notes",
  pdf: "PDFs",
  link: "Links",
  reference: "References",
  screenshot: "Screenshots",
};

export function StudyTopicGroup({
  topic,
  items,
  onOpen,
  onDelete,
}: {
  topic: string;
  items: StudyItem[];
  /**
   * Opens the item in the full reader AND populates the right panel with
   * its quick metadata/actions (documents/page.tsx's openDoc does both
   * together) — one click, both effects, no flicker.
   */
  onOpen: (item: StudyItem) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const byKind = new Map<StudyItemKind, StudyItem[]>();
  for (const item of items) {
    const list = byKind.get(item.kind) ?? [];
    list.push(item);
    byKind.set(item.kind, list);
  }

  return (
    <div className="grouped-list">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grouped-list-header"
      >
        <span className="grouped-list-title">{topic}</span>
        <span className="grouped-list-count">{items.length}</span>
        <ChevronRight className={cn("grouped-list-chevron", open && "grouped-list-chevron--open")} />
      </button>

      {open && (
        <div className="space-y-2.5 px-1 pb-3">
          {Array.from(byKind.entries()).map(([kind, kindItems]) => {
            const Icon = KIND_ICON[kind];

            // PDFs are real files — use the shared file-attachment row
            // (icon + name + size, clickable) and open them natively in
            // the Document Reader rather than an external tab (design
            // brief §11 "PDF/document rendering").
            if (kind === "pdf") {
              return (
                <div key={kind}>
                  <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-ink-600">
                    {KIND_LABEL[kind]}
                  </p>
                  <div className="space-y-1">
                    {kindItems.map((item) => (
                      <div key={item.id} className="group flex items-center gap-1.5">
                        <div className="flex-1 min-w-0">
                          <FileAttachmentRow
                            name={item.title}
                            typeLabel="PDF"
                            dateLabel={`added ${formatRelativeTime(item.createdAt)}`}
                            icon={FileText}
                            onClick={() => onOpen(item)}
                          />
                        </div>
                        <button
                          onClick={() => onDelete(item.id)}
                          title="Delete"
                          className="flex-shrink-0 rounded p-1 text-ink-600 opacity-0 hover:bg-status-error/10 hover:text-status-error group-hover:opacity-100 group-focus-within:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div key={kind}>
                <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-ink-600">
                  {KIND_LABEL[kind]}
                </p>
                <div className="space-y-1">
                  {kindItems.map((item) => (
                    <div key={item.id} className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-base-800/60">
                      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-ink-500" />
                      <div className="min-w-0 flex-1">
                        {item.kind === "link" ? (
                          // Links still open externally by default (clicking
                          // the title itself is the browser link, unchanged
                          // from before) — the separate "View details" icon
                          // opens the in-app reader, same as every other
                          // kind's row click.
                          <a
                            href={item.content}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-[12.5px] text-ink-300 hover:text-accent-sky"
                          >
                            {item.title}
                          </a>
                        ) : (
                          <button
                            onClick={() => onOpen(item)}
                            className="block w-full truncate text-left text-[12.5px] text-ink-300 hover:text-accent-violet"
                            title={item.content}
                          >
                            {item.title}
                          </button>
                        )}
                        <p className="font-mono text-[10.5px] text-ink-600">
                          added {formatRelativeTime(item.createdAt)}
                        </p>
                      </div>
                      {item.kind === "link" && (
                        <button
                          onClick={() => onOpen(item)}
                          className="flex-shrink-0 rounded p-1 text-ink-600 opacity-0 hover:bg-accent-violet/10 hover:text-accent-violet group-hover:opacity-100 group-focus-within:opacity-100"
                          title="View details"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(item.id)}
                        title="Delete"
                        className="flex-shrink-0 rounded p-1 text-ink-600 opacity-0 hover:bg-status-error/10 hover:text-status-error group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
