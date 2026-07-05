import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { TrendPoint } from "@/types/analytics";

/**
 * Small "↑ 18% vs last 7 days" pill, matching the reference dashboard's
 * stat-card trend indicators. Purely presentational — takes an already
 * computed TrendPoint and renders it, no calculation here.
 */
export function TrendBadge({ trend, label = "vs last 7 days" }: { trend: TrendPoint; label?: string }) {
  if (trend.pctChange === null) {
    return trend.current > 0 ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-status-success/15 px-2 py-0.5 font-mono text-[10px] font-medium text-status-success">
        <ArrowUp className="h-2.5 w-2.5" /> new
      </span>
    ) : null;
  }

  const rounded = Math.round(Math.abs(trend.pctChange));
  const Icon = trend.direction === "up" ? ArrowUp : trend.direction === "down" ? ArrowDown : Minus;
  const colorClass =
    trend.direction === "up" ? "bg-status-success/15 text-status-success" :
    trend.direction === "down" ? "bg-status-error/15 text-status-error" :
    "bg-white/[0.07] text-ink-500";

  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${colorClass}`}>
        <Icon className="h-2.5 w-2.5" /> {rounded}%
      </span>
    </span>
  );
}
