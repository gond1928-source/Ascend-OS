"use client";
import { ReactNode } from "react";

// Minimal stub modal — fleshed out alongside the session-form flow.
export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl2 border border-base-700 bg-base-900 p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
