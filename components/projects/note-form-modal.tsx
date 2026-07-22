"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * NoteFormModal — deliberately just a title. Content is written in the
 * DocumentReader/StudyItemView editor that opens immediately after
 * creating the note (same editable-note flow the Study Library already
 * uses) — asking for content here too would just duplicate that editor.
 */
export function NoteFormModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { title: string }) => void;
}) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open) setTitle("");
  }, [open]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="mb-4 font-display text-[16px] font-semibold text-ink-50">Create planning note</h3>
      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-500">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Architecture overview"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!title.trim()}>Create & open</Button>
      </div>
    </Modal>
  );
}
