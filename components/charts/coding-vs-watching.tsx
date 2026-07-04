"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CODING_COLOR, WATCHING_COLOR } from "@/constants/themes";
import { formatMinutes } from "@/lib/utils";

interface CodingVsWatchingProps {
  codingMinutes: number;
  watchingMinutes: number;
}

export function CodingVsWatching({ codingMinutes, watchingMinutes }: CodingVsWatchingProps) {
  const total = codingMinutes + watchingMinutes;
  const data = [
    { name: "Coding", value: codingMinutes, color: CODING_COLOR },
    { name: "Watching", value: watchingMinutes, color: WATCHING_COLOR },
  ];
  const codingPct = total ? Math.round((codingMinutes / total) * 100) : 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-40 w-40 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#141923",
                border: "1px solid #1b2230",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => formatMinutes(value)}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl text-ink-50">{codingPct}%</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-500">active</span>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CODING_COLOR }} />
            <span className="text-sm text-ink-300">Coding</span>
          </div>
          <span className="font-mono text-sm text-ink-50">{formatMinutes(codingMinutes)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: WATCHING_COLOR }} />
            <span className="text-sm text-ink-300">Watching</span>
          </div>
          <span className="font-mono text-sm text-ink-50">{formatMinutes(watchingMinutes)}</span>
        </div>
        <div className="border-t border-base-700 pt-3 flex items-center justify-between">
          <span className="text-sm text-ink-500">Total active time</span>
          <span className="font-mono text-sm text-ink-50">{formatMinutes(total)}</span>
        </div>
      </div>
    </div>
  );
}
