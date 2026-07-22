import { AlertTriangle } from "lucide-react";

export function DistractionCard({ focusScore, distractionMinutes }: { focusScore: number; distractionMinutes: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-base-900/70 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-status-warning/8 via-transparent to-transparent" />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">Focus score</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-status-warning/15">
            <AlertTriangle className="h-4 w-4 text-status-warning" />
          </div>
        </div>
        <p className="font-display text-3xl font-semibold text-ink-50">{focusScore}<span className="text-lg text-ink-500">/100</span></p>
        <p className="mt-0.5 font-mono text-[11px] text-ink-500">focus ratio (all time)</p>
        <p className="mt-3 font-mono text-[10px] text-ink-500">{Math.round(distractionMinutes)}m distracted (30d)</p>
      </div>
    </div>
  );
}
