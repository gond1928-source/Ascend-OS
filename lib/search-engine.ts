/**
 * search-engine.ts — searchable productivity memory.
 *
 * One entry point (searchDocuments) fans out across every source
 * Documents + Projects hold: reports, study library items, projects,
 * project tasks, project planning notes, and project activity entries.
 * Each source contributes SearchResult entries through its own small
 * adapter function below — adding a new searchable source later means
 * writing one more adapter and appending it to the `search` call, nothing
 * else changes.
 *
 * Deliberately excluded: raw Session/DistractionRecord entries. Those are
 * granular tracking data, not "documents" or "work items" — surfacing
 * them here would mean a single tracked coding session or a single
 * distraction event showing up as its own search result, which doesn't
 * belong in a search scoped to reports/notes/study materials/project
 * work. Reports and Analytics are where that data already gets surfaced
 * in aggregate.
 *
 * Project-scoped results (task/note/activity) carry a `projectId` the
 * flat report/study results don't need — opening one means navigating to
 * that project first, not just opening the item in place.
 */

import { ReportRecord, StudyItem } from "@/types/document";
import { Project, ProjectTask, ProjectNote, ProjectActivityEntry } from "@/types/project";

export type SearchResultKind = "report" | "study" | "project" | "project-task" | "project-note" | "project-activity";

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string;
  timestamp: string; // ISO
  /** Set only for project-scoped kinds (task/note/activity) — which
   * project to navigate into. Absent for report/study/project itself
   * (a "project" result's own `id` already is the project id). */
  projectId?: string;
}

function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f?.toLowerCase().includes(q));
}

function searchReports(query: string, reports: ReportRecord[]): SearchResult[] {
  return reports
    .filter((r) => matches(query, r.data.periodLabel, r.data.mostProductiveLanguage, r.data.activitySummary))
    .map((r) => ({
      kind: "report" as const,
      id: r.id,
      title: `${r.period === "weekly" ? "Weekly" : "Monthly"} Report — ${r.data.periodLabel}`,
      subtitle: `Focus score ${r.data.focusScore}/100 · ${r.data.sessionCount} sessions`,
      timestamp: r.generatedAt,
    }));
}

function searchStudyItems(query: string, items: StudyItem[]): SearchResult[] {
  return items
    .filter((i) => matches(query, i.title, i.topic, i.content))
    .map((i) => ({
      kind: "study" as const,
      id: i.id,
      title: i.title,
      subtitle: `${i.topic} · ${i.kind}`,
      timestamp: i.createdAt,
    }));
}

function searchProjects(query: string, projects: Project[]): SearchResult[] {
  return projects
    .filter((p) => matches(query, p.name, p.description))
    .map((p) => ({
      kind: "project" as const,
      id: p.id,
      title: p.name,
      subtitle: p.status === "archived" ? "Archived project" : "Active project",
      timestamp: p.updatedAt,
    }));
}

function searchProjectTasks(query: string, tasks: ProjectTask[], projects: Project[]): SearchResult[] {
  const STATUS_LABEL: Record<ProjectTask["status"], string> = {
    todo: "Todo", "in-progress": "In Progress", done: "Done",
  };
  return tasks
    .filter((t) => matches(query, t.title, t.description))
    .map((t) => {
      const project = projects.find((p) => p.id === t.projectId);
      return {
        kind: "project-task" as const,
        id: t.id,
        projectId: t.projectId,
        title: t.title,
        subtitle: `${project?.name ?? "Unknown project"} · ${STATUS_LABEL[t.status]}`,
        timestamp: t.updatedAt,
      };
    });
}

function searchProjectNotes(query: string, notes: ProjectNote[], projects: Project[]): SearchResult[] {
  return notes
    .filter((n) => matches(query, n.title, n.content))
    .map((n) => {
      const project = projects.find((p) => p.id === n.projectId);
      return {
        kind: "project-note" as const,
        id: n.id,
        projectId: n.projectId,
        title: n.title,
        subtitle: `${project?.name ?? "Unknown project"} · Planning note`,
        timestamp: n.updatedAt,
      };
    });
}

function searchProjectActivity(query: string, entries: ProjectActivityEntry[], projects: Project[]): SearchResult[] {
  // System-generated entries (task completed, resource added, ...) are
  // intentionally excluded — they're app-authored breadcrumbs, not
  // content someone would search their own words for, and their content
  // strings already duplicate a title that exists elsewhere (the task,
  // the resource) which would just show as a confusing duplicate result.
  return entries
    .filter((e) => e.tag !== "system")
    .filter((e) => matches(query, e.content))
    .map((e) => {
      const project = projects.find((p) => p.id === e.projectId);
      const kindLabel = e.tag === "update" && e.statusTag ? e.statusTag.replace("-", " ") : "Comment";
      return {
        kind: "project-activity" as const,
        id: e.id,
        projectId: e.projectId,
        title: e.content.length > 80 ? `${e.content.slice(0, 80)}…` : e.content,
        subtitle: `${project?.name ?? "Unknown project"} · ${kindLabel}`,
        timestamp: e.createdAt,
      };
    });
}

export interface SearchSources {
  reports: ReportRecord[];
  studyItems: StudyItem[];
  projects: Project[];
  projectTasks: ProjectTask[];
  projectNotes: ProjectNote[];
  projectActivity: ProjectActivityEntry[];
}

export function searchDocuments(query: string, sources: SearchSources): SearchResult[] {
  if (!query.trim()) return [];
  const results = [
    ...searchReports(query, sources.reports),
    ...searchStudyItems(query, sources.studyItems),
    ...searchProjects(query, sources.projects),
    ...searchProjectTasks(query, sources.projectTasks, sources.projects),
    ...searchProjectNotes(query, sources.projectNotes, sources.projects),
    ...searchProjectActivity(query, sources.projectActivity, sources.projects),
  ];
  return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
