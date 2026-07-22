"use client";

import { Modal } from "@/components/ui/modal";
import { SessionForm } from "./session-form";
import { SessionDraft } from "@/types/session";

/**
 * ManualSessionModal — "Add Manual Session" from the Focus page's Quick
 * Actions. There was no existing dialog to reuse verbatim (SessionForm was
 * only ever embedded directly in a Card on the old /sessions page), so
 * this wraps the untouched SessionForm in the same Modal primitive every
 * other modal in the app already uses (AddStudyItemModal, the Projects
 * modals) — reusing both existing pieces rather than building a new form
 * or a new dialog shell.
 */
export function ManualSessionModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (drafts: SessionDraft[]) => void;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="mb-4 font-display text-[16px] font-semibold text-ink-50">Add manual session</h3>
      <SessionForm
        onSubmit={(drafts) => {
          onSubmit(drafts);
          onClose();
        }}
      />
    </Modal>
  );
}
