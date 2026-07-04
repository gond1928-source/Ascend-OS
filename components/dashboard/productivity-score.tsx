import { Target } from "lucide-react";

export function ProductivityScore({ codingShare }: { codingShare: number }) {
  const pct = Math.round(codingShare * 100);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-base-900/70 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-sky/8 via-transparent to-transparent" />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">Focus ratio</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-sky/15">
            <Target className="h-4 w-4 text-accent-sky" />
          </div>
        </div>
        <p className="font-display text-3xl font-semibold text-ink-50">{pct}%</p>
        <p className="mt-0.5 font-mono text-[11px] text-ink-500">coding vs watching</p>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-base-700">
          <div
            className="h-full rounded-full bg-accent-sky transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
