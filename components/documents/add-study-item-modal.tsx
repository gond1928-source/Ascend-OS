"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudyItemKind } from "@/types/document";
import { LANGUAGES } from "@/constants/languages";
import { cn } from "@/lib/utils";

const KIND_OPTIONS: { value: StudyItemKind; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "pdf", label: "PDF" },
  { value: "link", label: "Link" },
  { value: "reference", label: "Reference" },
  { value: "screenshot", label: "Screenshot" },
];

export function AddStudyItemModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { topic: string; kind: StudyItemKind; title: string; content: string }) => void;
}) {
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState<StudyItemKind>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const reset = () => {
    setTopic("");
    setKind("note");
    setTitle("");
    setContent("");
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ topic, kind, title, content });
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }}>
      <h3 className="mb-4 font-display text-[16px] font-semibold text-ink-50">Add study material</h3>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-500">Topic</label>
          <Input
            list="topic-suggestions"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Python"
          />
          <datalist id="topic-suggestions">
            {LANGUAGES.map((l) => <option key={l.name} value={l.name} />)}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-500">Type</label>
          <div className="flex flex-wrap gap-1.5">
            {KIND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setKind(opt.value)}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[11px] transition-colors",
                  kind === opt.value
                    ? "border-accent-violet/50 bg-accent-violet/15 text-accent-violet"
                    : "border-white/[0.08] text-ink-500 hover:text-ink-300",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-500">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Decorators cheat sheet" />
        </div>

        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-500">
            {kind === "link" ? "URL" : kind === "pdf" ? "PDF URL" : "Content"}
          </label>
          {kind === "note" || kind === "reference" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-base-600 bg-base-800 px-3 py-2 text-sm text-ink-50 placeholder:text-ink-500 focus:border-accent-violet focus:outline-none"
              placeholder="Write your note in markdown…"
            />
          ) : (
            <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="https://…" />
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!title.trim()}>Add material</Button>
      </div>
    </Modal>
  );
}
