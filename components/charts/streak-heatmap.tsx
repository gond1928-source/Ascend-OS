"use client";

import { HeatmapCell } from "@/types/analytics";
import { formatMinutes } from "@/lib/utils";
import { useState } from "react";

const INTENSITY_COLOR: Record<HeatmapCell["intensity"], string> = {
  0: "#141923",
  1: "rgba(61, 220, 151, 0.25)",
  2: "rgba(61, 220, 151, 0.5)",
  3: "rgba(61, 220, 151, 0.75)",
  4: "rgba(61, 220, 151, 1)",
};

interface StreakHeatmapProps {
  cells: HeatmapCell[];
}

export function StreakHeatmap({ cells }: StreakHeatmapProps) {
  const [hovered, setHovered] = useState<HeatmapCell | null>(null);

  // Lay cells into week columns (7 rows), oldest first, like a terminal commit grid.
  const weeks: HeatmapCell[][] = [];
  let currentWeek: HeatmapCell[] = [];
  const leadingPad = (7 - (cells.length % 7)) % 7;
  const padded: (HeatmapCell | null)[] = [...Array(leadingPad).fill(null), ...cells];

  padded.forEach((cell, i) => {
    currentWeek.push(cell as HeatmapCell);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between font-mono text-[11px] text-ink-500">
        <span>$ ascend --heatmap --last 119d</span>
        {hovered ? (
          <span className="text-ink-300">
            {hovered.date} → {formatMinutes(hovered.totalMinutes)}
          </span>
        ) : (
          <span className="text-ink-500">hover a cell</span>
        )}
      </div>

      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell, di) =>
              cell ? (
                <div
                  key={cell.date}
                  onMouseEnter={() => setHovered(cell)}
                  onMouseLeave={() => setHovered(null)}
                  className="h-3 w-3 cursor-pointer rounded-[3px] transition-transform hover:scale-125"
                  style={{ backgroundColor: INTENSITY_COLOR[cell.intensity] }}
                />
              ) : (
                <div key={`pad-${wi}-${di}`} className="h-3 w-3 rounded-[3px] bg-transparent" />
              )
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-ink-500">
        <span>less</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ backgroundColor: INTENSITY_COLOR[i as HeatmapCell["intensity"]] }}
          />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}
