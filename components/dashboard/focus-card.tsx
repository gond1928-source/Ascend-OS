import { formatMinutes } from "@/lib/utils";
import { Code2 } from "lucide-react";
import { TrendPoint } from "@/types/analytics";
import { TrendBadge } from "@/components/ui/trend-badge";

export function FocusCard({ codingMinutes, trend }: { codingMinutes: number; trend?: TrendPoint }) {
  const hours = Math.floor(codingMinutes / 60);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-base-900/70 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-mint/8 via-transparent to-transparent" />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-500">Coding (30d)</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-mint/15">
            <Code2 className="h-4 w-4 text-accent-mint" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-display text-3xl font-semibold text-ink-50">{formatMinutes(codingMinutes)}</p>
          {trend && <TrendBadge trend={trend} />}
        </div>
        <p className="mt-0.5 font-mono text-[11px] text-ink-500">active coding time</p>
        <p className="mt-3 font-mono text-[10px] text-ink-500">≈ {hours}h this period</p>
      </div>
    </div>
  );
}
