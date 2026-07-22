"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudyItem, StudyItemKind } from "@/types/document";
import { FileText, StickyNote, Link2, Search } from "lucide-react";

const STUDY_KIND_LABEL: Record<StudyItemKind, string> = {
  note: "Note", pdf: "PDF", link: "Link", reference: "Reference", screenshot: "Screenshot",
};
function iconForStudyKind(kind: StudyItemKind) {
  if (kind === "note") return StickyNote;
  if (kind === "link") return Link2;
  return FileText;
}

export type AddResourceInput =
  | { kind: "study-item"; studyItemId: string }
  | { kind: "link"; url: string; label: string };

/**
 * AddResourceModal — a resource is either a reference to an existing
 * Study Library item (picked from a filterable list, not duplicated) or a
 * raw external link (docs, GitHub repos, designs). Two tabs, one modal,
 * same pairing spirit as ProjectFormModal/TaskFormModal covering related
 * variants of one action.
 */
export function AddResourceModal({
  open,
  onClose,
  onSubmit,
  studyItems,
  alreadyLinkedIds,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: AddResourceInput) => void;
  studyItems: StudyItem[];
  alreadyLinkedIds: string[];
}) {
  const [mode, setMode] = useState<"study-item" | "link">("study-item");
  const [query, setQuery] = useState("");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return studyItems
      .filter((i) => !alreadyLinkedIds.includes(i.id))
      .filter((i) => !q || i.title.toLowerCase().includes(q) || i.topic.toLowerCase().includes(q));
  }, [studyItems, alreadyLinkedIds, query]);

  function reset() {
    setQuery("");
    setUrl("");
    setLabel("");
    setMode("study-item");
  }

  function submitLink() {
    if (!url.trim()) return;
    onSubmit({ kind: "link", url: url.trim(), label: label.trim() || url.trim() });
    reset();
    onClose();
  }

  function pickStudyItem(item: StudyItem) {
    onSubmit({ kind: "study-item", studyItemId: item.id });
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }}>
      <h3 className="mb-4 font-display text-[16px] font-semibold text-ink-50">Add resource</h3>

      <div className="mb-4 flex gap-1.5 rounded-lg border p-1" style={{ borderColor: "var(--border-subtle)" }}>
        <button
          onClick={() => setMode("study-item")}
          className="flex-1 rounded-md py-1.5 font-mono text-[10px] uppercase tracking-wide transition-colors"
          style={mode === "study-item" ? { color: "var(--accent-primary)" } : { color: "var(--text-muted)" }}
        >
          Study Library
        </button>
        <button
          onClick={() => setMode("link")}
          className="flex-1 rounded-md py-1.5 font-mono text-[10px] uppercase tracking-wide transition-colors"
          style={mode === "link" ? { color: "var(--accent-primary)" } : { color: "var(--text-muted)" }}
        >
          External link
        </button>
      </div>

      {mode === "study-item" ? (
        <div>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your Study Library"
              style={{ paddingLeft: "2rem" }}
              autoFocus
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto rounded-lg border" style={{ borderColor: "var(--border-subtle)" }}>
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
                {studyItems.length === 0 ? "Your Study Library is empty." : "Nothing matches that search."}
              </p>
            ) : (
              filtered.map((item) => {
                const Icon = iconForStudyKind(item.kind);
                return (
                  <button
                    key={item.id}
                    onClick={() => pickStudyItem(item)}
                    className="flex w-full items-center gap-2.5 border-b px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-[var(--surface-elevated)]"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                    <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>{item.title}</span>
                    <span className="flex-shrink-0 font-mono text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>
                      {STUDY_KIND_LABEL[item.kind]}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-500">URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && submitLink()}
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-500">
              Label <span className="normal-case text-ink-600">(optional)</span>
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Backend repo"
              onKeyDown={(e) => e.key === "Enter" && submitLink()}
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button variant="primary" onClick={submitLink} disabled={!url.trim()}>Add link</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
