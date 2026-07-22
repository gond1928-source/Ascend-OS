/**
 * Projects domain types (Phase 5).
 *
 * Five entities, five parallel stores (lib/storage/project*.ts), mirroring
 * how Reports/Study Library are split: one JSON array per concern rather
 * than one giant nested Project blob, so any one list can grow/be queried
 * without rewriting the others. Every entity carries its own `projectId`
 * for that reason.
 *
 * Deliberately excluded from this phase (see design brief handoff notes):
 * milestones, a status pipeline beyond active/archived, numeric progress,
 * and any link to real tracked sessions/App Rules. A project's "progress"
 * today is just its task counts — nothing computed or persisted beyond that.
 */

export type ProjectStatus = "active" | "archived";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// ── Tasks ────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in-progress" | "done";

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  /** Optional — shown only in the task's expanded/detail view, never in the
   * compact grouped-list row (design brief §11 grouped-list pattern stays
   * single-line). */
  description?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Planning notes ──────────────────────────────────────────────────────
//
// Reuses the same shape DocumentReader already knows how to render (a
// markdown body via StudyItemView's "note" case) rather than inventing a
// new viewer. The type is intentionally close to StudyItem, but kept
// separate — a project's notes are scoped to that project's own space,
// never listed in the flat Documents/Study Library list.

export interface ProjectNote {
  id: string;
  projectId: string;
  title: string;
  content: string; // markdown
  createdAt: string;
  updatedAt: string;
}

// ── Resources ────────────────────────────────────────────────────────────
//
// Either a reference to an existing Study Library item (by id — resolved
// at render time, not duplicated), or a raw external link (docs, GitHub
// repos, designs). Both render through the shared FileAttachmentRow.

export type ProjectResource =
  | { id: string; projectId: string; kind: "study-item"; studyItemId: string; addedAt: string }
  | { id: string; projectId: string; kind: "link"; url: string; label: string; addedAt: string };

// ── Activity ─────────────────────────────────────────────────────────────

export type ActivityEntryTag = "update" | "comment" | "system";
export type ActivityStatusTag = "on-track" | "at-risk" | "blocked" | "done" | null;

/** What kind of automatic event a `tag: "system"` entry represents — drives
 * which icon/label the feed renders. Nothing here is user-authored. */
export type SystemEventType =
  | "task-created" | "task-completed"
  | "resource-added" | "resource-removed"
  | "note-updated"
  | "project-archived" | "project-unarchived";

export interface ActivityAttachment {
  name: string;
  url?: string;
  sizeBytes?: number;
}

export interface ProjectActivityEntry {
  id: string;
  projectId: string;
  /** null = top-level entry; otherwise the id of the entry being replied to. */
  parentId: string | null;
  tag: ActivityEntryTag;
  statusTag: ActivityStatusTag;
  /** Only set when tag === "system" — identifies which automatic event this
   * is, for icon/label rendering. Absent on user-authored entries. */
  systemEventType?: SystemEventType;
  content: string;
  attachments: ActivityAttachment[];
  createdAt: string;
}
