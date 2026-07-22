"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectTask, TaskStatus } from "@/types/project";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

/**
 * TaskFormModal — one modal for both "New task" and "Edit task", same
 * pairing as ProjectFormModal. Status is editable here too (not just via
 * the right-panel quick-actions) since editing title/description without
 * touching status is a common case on its own.
 */
export function TaskFormModal({
  open,
  onClose,
  onSubmit,
  task,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { title: string; description?: string; status: TaskStatus }) => void;
  task?: ProjectTask | null;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setStatus(task?.status ?? "todo");
    }
  }, [open, task]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title, description: description.trim() || undefined, status });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="mb-4 font-display text-[16px] font-semibold text-ink-50">
        {task ? "Edit task" : "New task"}
      </h3>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-500">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Wire up the API rate limiter"
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
            placeholder="Only shown in the task's detail view, not the list row"
            rows={3}
            className="w-full rounded-lg border border-base-600 bg-base-800 px-3 py-2 text-sm text-ink-50 placeholder:text-ink-500 focus:border-accent-violet focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-500">Status</label>
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className="flex-1 rounded-md border py-1.5 font-mono text-[10px] uppercase tracking-wide transition-colors"
                style={
                  status === opt.value
                    ? { borderColor: "var(--border-accent)", color: "var(--accent-primary)" }
                    : { borderColor: "var(--border-subtle)", color: "var(--text-muted)" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!title.trim()}>
          {task ? "Save" : "Create task"}
        </Button>
      </div>
    </Modal>
  );
}
