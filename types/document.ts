/**
 * Documents domain types — reports (generated weekly/monthly productivity
 * intelligence) and the Study Library (notes/PDFs/links/references).
 *
 * Design note: only TWO report kinds ever exist — "weekly" and "monthly".
 * Every metric (coding time, distraction time, focus score, language
 * breakdown, peak hours, streaks, ...) lives INSIDE one ReportData object
 * per report, not as separate mini-report types. See lib/report-engine.ts.
 */

import { LanguageBreakdown } from "./analytics";
import { DistractionBreakdownEntry } from "./analytics";

export type ReportPeriod = "weekly" | "monthly";

export interface ReportPeakHour {
  hour: number;
  minutes: number;
}

export interface ReportStreakConsistency {
  currentStreak: number;
  longestStreak: number;
  activeDaysInPeriod: number;
  totalDaysInPeriod: number;
}

export interface ReportLearningTrendPoint {
  label: string;
  codingMinutes: number;
  watchingMinutes: number;
}

/**
 * The full computed content of one report. Snapshotted at generation time
 * and stored verbatim on the ReportRecord, so a report you generated last
 * month keeps reading the same even as new sessions accumulate afterward.
 */
export interface ReportData {
  period: ReportPeriod;
  periodLabel: string;
  rangeStart: string; // ISO date
  rangeEnd: string; // ISO date

  totalCodingMinutes: number;
  totalWatchingMinutes: number;
  totalActiveMinutes: number;
  totalDistractionMinutes: number;

  /** 0–100. Rounded productive/(productive+distracted) ratio. */
  focusScore: number;
  productiveToDistractedRatio: number | null;
  codingToWatchingRatio: number | null;

  mostProductiveLanguage: string | null;
  languageBreakdown: LanguageBreakdown[];

  peakHours: ReportPeakHour[];

  streak: ReportStreakConsistency;
  learningTrend: ReportLearningTrendPoint[];

  topDistractions: DistractionBreakdownEntry[];
  contextSwitchCount: number;

  sessionCount: number;
  distractionEventCount: number;

  /**
   * Plain-language activity summary, template-generated today. Structured
   * so a future AI-generated summary (see AI_SUMMARY_PREPARATION in the
   * spec) can replace just this string without touching anything else on
   * ReportData — every input that summary would need (focus score,
   * top language, distraction share, peak hours, streak) already lives
   * on this same object.
   */
  activitySummary: string;
}

export interface ReportRecord {
  id: string;
  period: ReportPeriod;
  generatedAt: string; // ISO timestamp
  data: ReportData;
}

// ── Study Library ──────────────────────────────────────────────────────────────

export type StudyItemKind = "note" | "pdf" | "link" | "reference" | "screenshot";

export interface StudyItem {
  id: string;
  /** Top-level grouping — typically a language/topic, e.g. "Python". */
  topic: string;
  kind: StudyItemKind;
  title: string;
  /** Note/markdown body, a URL (for link/pdf-by-url), or a data URL. */
  content: string;
  createdAt: string; // ISO timestamp
}

// ── Document Viewer ─────────────────────────────────────────────────────────
//
// Shared discriminated union consumed by <DocumentViewer/>. Every document
// type Ascend OS can open as a "real document" (reports today; study notes
// and references today; study files once Priority 2 lands) plugs in here as
// one more variant, so the viewer itself never needs to change shape — only
// gain a new `case` in its render switch and a new content component.

export type ViewableDocument =
  | { kind: "report"; record: ReportRecord }
  | { kind: "study-item"; item: StudyItem };
// Future (Priority 2): | { kind: "study-file"; file: StudyFile }
