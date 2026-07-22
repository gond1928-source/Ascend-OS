"use client";

import { useState, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdvancedPanel({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="today-section">
      <button type="button" className="advanced-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <ChevronRight className={cn("advanced-toggle-chevron", open && "advanced-toggle-chevron--open")} />
        {title}
      </button>
      <div className={cn("advanced-content", open && "advanced-content--open")}>
        <div className="advanced-content-inner">{children}</div>
      </div>
    </div>
  );
}
