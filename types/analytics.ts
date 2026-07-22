export interface LanguageBreakdown {
  language: string;
  codingMinutes: number;
  watchingMinutes: number;
  totalMinutes: number;
  color: string;
}

export interface DailyActivity {
  date: string;
  codingMinutes: number;
  watchingMinutes: number;
}

export interface WeeklyTrendPoint {
  weekLabel: string;
  codingMinutes: number;
  watchingMinutes: number;
}

export interface HeatmapCell {
  date: string;
  totalMinutes: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export interface TrendPoint {
  current: number;
  previous: number;
  pctChange: number | null; // null when previous === 0 (no baseline to compare against)
  direction: "up" | "down" | "flat";
}

export interface WeekOverWeekTrend {
  codingMinutes: TrendPoint;
  watchingMinutes: TrendPoint;
  sessionCount: TrendPoint;
}

export interface AnalyticsSummary {
  totalCodingMinutes: number;
  totalWatchingMinutes: number;
  totalActiveMinutes: number;
  mostUsedLanguage: string | null;
  codingShare: number;
  watchingShare: number;
  languageBreakdown: LanguageBreakdown[];
  dailyActivity: DailyActivity[];
  weeklyTrend: WeeklyTrendPoint[];
  heatmap: HeatmapCell[];
  streak: StreakInfo;
  sessionCount: number;
  trend: WeekOverWeekTrend;
}

// ── Distraction analytics ─────────────────────────────────────────────────────

export interface DistractionBreakdownEntry {
  label: string;
  minutes: number;
}

export interface DistractionTrendPoint {
  date: string;
  distractionMinutes: number;
  productiveMinutes: number;
}

export interface DistractionSummary {
  totalDistractionMinutes: number;
  totalProductiveMinutes: number;
  /** 0–1: productive / (productive + distraction). 1 when there's no
   * distraction time recorded at all (nothing to divide against). */
  focusRatio: number;
  /** productive minutes per distraction minute. null when there is no
   * distraction time to divide by (avoids a divide-by-zero Infinity). */
  productiveToDistractedRatio: number | null;
  topDistractions: DistractionBreakdownEntry[];
  /** Last 30 days, oldest first. */
  trend: DistractionTrendPoint[];
  /** Count of qualifying merged distraction sessions — i.e. distinct times
   * the user context-switched into an "Others" activity for long enough
   * for it to register (see distraction-builder.ts's 1-minute floor). */
  contextSwitchCount: number;
}

export interface PeakHour {
  /** 0–23, local-ish (derived from the ISO timestamp's UTC hour — sessions
   * are stored in UTC, same convention as the rest of this engine). */
  hour: number;
  minutes: number;
}

