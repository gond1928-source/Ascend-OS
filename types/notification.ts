/**
 * types/notification.ts — in-app notification history (Phase 6).
 *
 * One flat record shape for every event kind. `path` is deliberately just
 * a route+query string — the exact same "how do I open this thing" idiom
 * lib/search-engine.ts's SearchResult and command-palette.tsx's PaletteItem
 * already use (e.g. "/documents?tab=reports&open=<id>"), so clicking a
 * notification behaves identically to clicking a search result rather than
 * inventing a second navigation mechanism.
 */

export type NotificationKind =
  | "report-generated"
  | "study-item-added"
  | "resource-added"
  | "streak-milestone"
  | "export-completed";

export interface NotificationRecord {
  id: string;
  kind: NotificationKind;
  title: string;
  subtitle: string;
  createdAt: string; // ISO
  read: boolean;
  /** Route to navigate to on click, e.g. "/documents?tab=reports&open=abc123".
   * Always present — every event this phase generates has somewhere real
   * to go (see design brief §11 grouped-list + existing search-result
   * navigation pattern). */
  path: string;
}
