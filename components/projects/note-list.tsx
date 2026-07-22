"use client";

import { useState } from "react";
import { ProjectNote } from "@/types/project";
import { formatRelativeTime, cn } from "@/lib/utils";
import { ChevronRight, StickyNote, Trash2 } from "lucide-react";

/**
 * NoteList — grouped-list of a project's planning notes. Row click hands
 * off to the page's openNote, which just navigates into the full
 * DocumentReader now (no more right-panel selection step — design brief
 * §1's revision note). Delete is a hover-revealed row action, matching
 * ReportCard/StudyTopicGroup/TaskGroupList's established convention —
 * DocumentReader's own header also gets a Delete action once a note is
 * open, for parity with Reports/Study Items.
 */
export function NoteList({
  notes,
  onOpenNote,
  onDelete,
}: {
  notes: ProjectNote[];
  onOpenNote: (note: ProjectNote) => void;
  onDelete: (note: ProjectNote) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="grouped-list">
      <button className="grouped-list-header" onClick={() => setOpen((o) => !o)}>
        <span className="grouped-list-title">Notes</span>
        <span className="grouped-list-count">{notes.length}</span>
        <ChevronRight className={cn("grouped-list-chevron", open && "grouped-list-chevron--open")} />
      </button>
      {open && (
        <div>
          {notes.map((note) => (
            <div
              key={note.id}
              className="group flex items-center gap-2.5 border-b px-1 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--surface-elevated)]"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <button onClick={() => onOpenNote(note)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                <StickyNote className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>{note.title}</p>
                  <p className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                    updated {formatRelativeTime(note.updatedAt)}
                  </p>
                </div>
              </button>
              <div className="flex flex-shrink-0 items-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  title="Delete"
                  onClick={(e) => { e.stopPropagation(); onDelete(note); }}
                  className="rounded p-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
