"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { DailyActivity, WeeklyTrendPoint } from "@/types/analytics";
import { CHART_AXIS_COLOR, CHART_GRID_COLOR, CODING_COLOR, WATCHING_COLOR } from "@/constants/themes";
import { formatMinutes } from "@/lib/utils";

const tooltipStyle = {
  background: "#141923",
  border: "1px solid #1b2230",
  borderRadius: 8,
  fontSize: 12,
};

export function WeeklyTrendChart({ data }: { data: WeeklyTrendPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -16, right: 8 }}>
          <defs>
            <linearGradient id="codingFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CODING_COLOR} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CODING_COLOR} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="watchingFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={WATCHING_COLOR} stopOpacity={0.35} />
              <stop offset="100%" stopColor={WATCHING_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
          <XAxis
            dataKey="weekLabel"
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 10 }}
            axisLine={{ stroke: CHART_GRID_COLOR }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${Math.round(v / 60)}h`}
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatMinutes(value)} />
          <Area type="monotone" dataKey="codingMinutes" name="Coding" stroke={CODING_COLOR} fill="url(#codingFill)" strokeWidth={2} />
          <Area type="monotone" dataKey="watchingMinutes" name="Watching" stroke={WATCHING_COLOR} fill="url(#watchingFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyActivityChart({ data }: { data: DailyActivity[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ left: -16, right: 8 }}>
          <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 9 }}
            axisLine={{ stroke: CHART_GRID_COLOR }}
            tickLine={false}
            interval={2}
          />
          <YAxis
            tickFormatter={(v) => `${Math.round(v / 60)}h`}
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatMinutes(value)} />
          <Bar dataKey="codingMinutes" name="Coding" stackId="day" fill={CODING_COLOR} radius={[3, 3, 0, 0]} />
          <Bar dataKey="watchingMinutes" name="Watching" stackId="day" fill={WATCHING_COLOR} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
