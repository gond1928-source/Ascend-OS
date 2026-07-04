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
