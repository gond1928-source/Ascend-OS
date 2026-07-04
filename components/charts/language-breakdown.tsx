"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { LanguageBreakdown } from "@/types/analytics";
import { CHART_AXIS_COLOR, CHART_GRID_COLOR, CODING_COLOR, WATCHING_COLOR } from "@/constants/themes";
import { formatDurationCompact, formatMinutes } from "@/lib/utils";

interface LanguageBreakdownChartProps {
  data: LanguageBreakdown[];
}

export function LanguageBreakdownChart({ data }: LanguageBreakdownChartProps) {
  const chartData = data.map((d) => ({
    language: d.language,
    Coding: d.codingMinutes,
    Watching: d.watchingMinutes,
  }));

  return (
    <div className="space-y-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid horizontal={false} stroke={CHART_GRID_COLOR} />
            <XAxis
              type="number"
              tickFormatter={(v) => `${Math.round(v / 60)}h`}
              tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
              axisLine={{ stroke: CHART_GRID_COLOR }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="language"
              tick={{ fill: "#f5f6fa", fontSize: 12 }}
              axisLine={{ stroke: CHART_GRID_COLOR }}
              tickLine={false}
              width={88}
            />
            <Tooltip
              contentStyle={{ background: "#141923", border: "1px solid #1b2230", borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => formatMinutes(value)}
            />
            <Bar dataKey="Coding" stackId="a" fill={CODING_COLOR} radius={[4, 4, 4, 4]} barSize={14} />
            <Bar dataKey="Watching" stackId="a" fill={WATCHING_COLOR} radius={[4, 4, 4, 4]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Explicit per-language numeric readout, matching the brief's worked example */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.map((d) => (
          <div
            key={d.language}
            className="flex items-center justify-between rounded-lg border border-base-700 bg-base-800/50 px-3 py-2"
          >
            <span className="text-sm text-ink-50">{d.language}</span>
            <span className="font-mono text-xs text-ink-300">
              <span style={{ color: CODING_COLOR }}>{formatDurationCompact(d.codingMinutes)}</span>
              {" · "}
              <span style={{ color: WATCHING_COLOR }}>{formatDurationCompact(d.watchingMinutes)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
