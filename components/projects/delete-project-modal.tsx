"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Project } from "@/types/project";
import { AlertTriangle } from "lucide-react";

/**
 * DeleteProjectModal — genuinely destructive confirmation, modeled on
 * GitHub's repository-delete flow rather than a generic "Are you sure?":
 * explicitly lists every category of data that will be permanently
 * removed with it (Tasks/Notes/Resources/Activity counts pulled from the
 * real stores, not a vague warning), states it cannot be undone, and
 * requires typing the project's exact name before the destructive button
 * enables. Archiving (elsewhere) is the non-destructive alternative — this
 * modal is only reached from an explicit "Delete" action, never a default.
 */
export function DeleteProjectModal({
  open,
  onClose,
  project,
  counts,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  counts: { tasks: number; notes: number; resources: number; activity: number };
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (open) setConfirmText("");
  }, [open]);

  if (!project) return null;

  const matches = confirmText.trim() === project.name;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" style={{ color: "var(--status-error)" }} />
        <h3 className="font-display text-[16px] font-semibold text-ink-50">Delete project</h3>
      </div>

      <p className="text-[13px] leading-relaxed text-ink-300">
        This will permanently delete <span className="font-semibold text-ink-50">{project.name}</span> and all of
        its data. This action cannot be undone.
      </p>

      <div className="my-4 space-y-1.5 rounded-lg border border-base-700 bg-base-900 px-3 py-3">
        <DeleteLine label="Tasks" count={counts.tasks} />
        <DeleteLine label="Planning notes" count={counts.notes} />
        <DeleteLine label="Resources" count={counts.resources} />
        <DeleteLine label="Activity entries" count={counts.activity} />
      </div>

      <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-500">
        Type <span className="text-ink-300">{project.name}</span> to confirm
      </label>
      <Input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={project.name}
        autoFocus
        spellCheck={false}
      />

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!matches}
          onClick={() => { onConfirm(); onClose(); }}
          className="!bg-status-error hover:!bg-status-error/90 disabled:!bg-status-error/40"
        >
          Delete this project
        </Button>
      </div>
    </Modal>
  );
}

function DeleteLine({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-ink-300">{label}</span>
      <span className="font-mono text-ink-500">{count}</span>
    </div>
  );
}
