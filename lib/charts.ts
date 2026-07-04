// Shared chart formatting helpers, kept separate from analytics-engine.ts
// (which owns *data* aggregation) so chart components only import display logic here.
export function minutesToHourLabel(minutes: number): string {
  return `${Math.round(minutes / 60)}h`;
}

export function truncateLabel(label: string, max = 10): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}
