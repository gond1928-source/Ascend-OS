/**
 * types/recent.ts — a single "recently opened" entry for the sidebar's
 * Recents section (design brief §1, single-sidebar shell).
 *
 * Deliberately narrow: only the two top-level surfaces a person actually
 * navigates into and reads (Projects, Documents/reports/study items).
 * Project planning notes are opened *inside* a project (via
 * app/projects/page.tsx's note-reader takeover), not a separate top-level
 * surface, so they don't get their own recents entries — recording the
 * parent project's open already covers "I was just working on this".
 */

export type RecentKind = "project" | "report" | "study-item";

export interface RecentEntry {
  /** The underlying record's own id (project id / report id / study item id). */
  id: string;
  kind: RecentKind;
  /** Display label — project name, report period label, or study item title. */
  label: string;
  /** Fully-formed path to re-open this exact item (query-params included). */
  href: string;
  openedAt: string; // ISO timestamp
}
