import { Card } from "@/components/ui/card";
import { LanguageBreakdown } from "@/types/analytics";
import { formatDurationCompact } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function LanguageStats({ data }: { data: LanguageBreakdown[] }) {
  const total = data.reduce((s, l) => s + l.totalMinutes, 0) || 1;
  return (
    <Card
      title="Top languages"
      eyebrow="By total time"
      action={
        <Link href="/analytics" className="text-ink-500 hover:text-ink-300 transition-colors">
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <div className="space-y-2.5">
        {data.slice(0, 5).map((l) => {
          const pct = (l.totalMinutes / total) * 100;
          return (
            <div key={l.language}>
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-ink-300">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                  {l.language}
                </span>
                <span className="font-mono text-ink-50">{formatDurationCompact(l.totalMinutes)}</span>
              </div>
              <div className="h-[2px] w-full overflow-hidden rounded-full bg-base-700">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: l.color }}
                />
              </div>
            </div>
          );
        })}
        {data.length === 0 && (
          <p className="py-4 text-center font-mono text-[11px] text-ink-500">No sessions yet</p>
        )}
      </div>
    </Card>
  );
}
