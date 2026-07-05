"use client";

/**
 * Documents — placeholder.
 * Will hold: (a) exported analytics reports, (b) study material library.
 *
 * Previously these panels were raw divs with hardcoded bg-base-900/border
 * classes instead of the shared `Card` (.app-card) component, so none of
 * the theme-aware surface/text handling applied here — that's why this
 * page specifically looked washed out in Glass while Dashboard/Analytics
 * (which do use Card) looked fine. Also removed the blanket `opacity-40`
 * that was wrapping entire rows: dimming the row's icon+text+badge all
 * together compounds with the text already being a muted color, which is
 * what pushed several captions below readable contrast. "Not built yet"
 * is now conveyed by the disabled cursor + a fixed muted tone instead of
 * multiplying opacity on top of it.
 */

import { Card } from "@/components/ui/card";
import { FileText, BookOpen, BarChart2, Plus, Search } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-[1000px] space-y-5 p-7 pb-10">
      <header className="flex items-end justify-between pt-1">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent-violet/70">Library</p>
          <h1 className="mt-0.5 font-display text-[22px] font-semibold text-ink-50">Documents</h1>
        </div>
        <span className="rounded-full border border-accent-violet/30 bg-accent-violet/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-accent-violet/80">
          Coming soon
        </span>
      </header>

      {/* Search bar placeholder — now an app-card so it themes correctly */}
      <div className="app-card flex items-center gap-3 !p-3">
        <Search className="h-3.5 w-3.5 flex-shrink-0 text-ink-500" />
        <span className="text-[13px] text-ink-500">Search documents…</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Analytics Reports */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-violet/10">
                <BarChart2 className="h-4 w-4 text-accent-violet" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-ink-50">Analytics Reports</p>
                <p className="font-mono text-[10px] text-ink-500">Weekly · Monthly exports</p>
              </div>
            </div>
            <button className="flex cursor-not-allowed items-center gap-1 rounded-md border border-white/[0.08] px-2.5 py-1.5 font-mono text-[10px] text-ink-500">
              <Plus className="h-3 w-3" /> New report
            </button>
          </div>
          <div className="space-y-2">
            {["June 2025 — Monthly", "Week 26 · Jun 23–29", "Week 25 · Jun 16–22"].map((name, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-base-800/40 px-3.5 py-2.5">
                <FileText className="h-3.5 w-3.5 flex-shrink-0 text-ink-500" />
                <p className="flex-1 text-[12px] text-ink-300">{name}</p>
                <span className="rounded bg-base-700 px-1.5 py-0.5 font-mono text-[9px] text-ink-500">PDF</span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[11px] text-ink-500">
            Auto-generated reports will appear here once the export engine is built.
          </p>
        </Card>

        {/* Study Library */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-sky/10">
                <BookOpen className="h-4 w-4 text-accent-sky" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-ink-50">Study Library</p>
                <p className="font-mono text-[10px] text-ink-500">Notes · PDFs · Links</p>
              </div>
            </div>
            <button className="flex cursor-not-allowed items-center gap-1 rounded-md border border-white/[0.08] px-2.5 py-1.5 font-mono text-[10px] text-ink-500">
              <Plus className="h-3 w-3" /> Add material
            </button>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookOpen className="mb-3 h-8 w-8 text-ink-500" />
            <p className="text-[13px] text-ink-500">No study materials yet</p>
            <p className="mt-1 font-mono text-[11px] text-ink-500">
              This section will hold notes, PDFs and links linked to Projects.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
