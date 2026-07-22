"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Project } from "@/types/project";

/**
 * ProjectFormModal — one modal for both "New project" and "Rename/edit
 * project", same as how AddStudyItemModal covers a single form shape.
 * Passing `project` pre-fills for editing; omitting it is the create path.
 */
export function ProjectFormModal({
  open,
  onClose,
  onSubmit,
  project,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; description?: string }) => void;
  project?: Project | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setDescription(project?.description ?? "");
    }
  }, [open, project]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name, description: description.trim() || undefined });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="mb-4 font-display text-[16px] font-semibold text-ink-50">
        {project ? "Edit project" : "New project"}
      </h3>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-500">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Off Grid Servers"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-500">
            Description <span className="normal-case text-ink-600">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this project is for"
            rows={3}
            className="w-full rounded-lg border border-base-600 bg-base-800 px-3 py-2 text-sm text-ink-50 placeholder:text-ink-500 focus:border-accent-violet focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!name.trim()}>
          {project ? "Save" : "Create project"}
        </Button>
      </div>
    </Modal>
  );
}
