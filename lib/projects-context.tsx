"use client";
/**
 * ProjectsContext — single source of truth for the whole Projects domain
 * (Project / ProjectTask / ProjectNote / ProjectResource /
 * ProjectActivityEntry).
 *
 * Checkpoint A shipped each of these as its own useState-backed hook
 * (hooks/useProject*.ts), same shape as useStudyLibrary. That works fine
 * when only one page ever reads a store — it breaks the moment two
 * mounted components need the same data, because each call created an
 * independent copy: creating a project on the Projects page updated THAT
 * component's state and storage, but NavPanel's/CommandPalette's own
 * separate useProjects() call never re-rendered, since it only loads once
 * on mount. Restarting the app "fixed" it only because a fresh mount
 * re-reads storage from scratch.
 *
 * Fix, mirroring lib/session-context.tsx exactly: one provider mounted at
 * the root layout owns all five arrays; every useProject*() hook becomes a
 * thin context reader. Bundled into one provider (not five) because
 * they're small and always consumed together — same reasoning
 * shell-context.tsx gives for combining sidebar/commandPalette/toast.
 */

import { createContext, useCallback, useEffect, useState, ReactNode } from "react";
import {
  Project, ProjectStatus,
  ProjectTask, TaskStatus,
  ProjectNote,
  ProjectResource,
  ProjectActivityEntry, ActivityEntryTag, ActivityStatusTag, ActivityAttachment, SystemEventType,
} from "@/types/project";
import { getProjectStore } from "@/lib/storage/project-store";
import { getProjectTaskStore } from "@/lib/storage/project-task-store";
import { getProjectNoteStore } from "@/lib/storage/project-note-store";
import { getProjectResourceStore } from "@/lib/storage/project-resource-store";
import { getProjectActivityStore } from "@/lib/storage/project-activity-store";
import { useNotifications } from "@/hooks/useNotifications";

// ── Input shapes (unchanged from the original hooks) ────────────────────

export interface NewProjectInput { name: string; description?: string; }
export interface NewTaskInput { projectId: string; title: string; description?: string; status?: TaskStatus; }
export interface NewNoteInput { projectId: string; title: string; content?: string; }
export type NewResourceInput =
  | { projectId: string; kind: "study-item"; studyItemId: string }
  | { projectId: string; kind: "link"; url: string; label: string };
export interface NewActivityInput {
  projectId: string;
  parentId?: string | null;
  tag: Exclude<ActivityEntryTag, "system">;
  statusTag?: ActivityStatusTag;
  content: string;
  attachments?: ActivityAttachment[];
}

export interface ProjectsContextValue {
  isLoading: boolean;

  // Projects
  projects: Project[];
  activeProjects: Project[];
  archivedProjects: Project[];
  createProject: (input: NewProjectInput) => Project;
  updateProject: (id: string, patch: Partial<Pick<Project, "name" | "description">>) => void;
  archiveProject: (id: string) => void;
  unarchiveProject: (id: string) => void;
  deleteProject: (id: string) => void;

  // Tasks
  tasks: ProjectTask[];
  addTask: (input: NewTaskInput) => ProjectTask;
  updateTask: (id: string, patch: Partial<Pick<ProjectTask, "title" | "description" | "status">>) => void;
  deleteTask: (id: string) => void;
  tasksForProject: (projectId: string) => ProjectTask[];
  taskCountForProject: (projectId: string) => number;

  // Notes
  notes: ProjectNote[];
  addNote: (input: NewNoteInput) => ProjectNote;
  updateNote: (id: string, patch: Partial<Pick<ProjectNote, "title" | "content">>) => void;
  deleteNote: (id: string) => void;
  notesForProject: (projectId: string) => ProjectNote[];
  noteCountForProject: (projectId: string) => number;

  // Resources
  resources: ProjectResource[];
  addResource: (input: NewResourceInput) => ProjectResource;
  deleteResource: (id: string) => void;
  resourcesForProject: (projectId: string) => ProjectResource[];
  resourceCountForProject: (projectId: string) => number;

  // Activity
  activity: ProjectActivityEntry[];
  addActivityEntry: (input: NewActivityInput) => ProjectActivityEntry;
  deleteActivityEntry: (id: string) => void;
  activityForProject: (projectId: string) => ProjectActivityEntry[];
  activityRepliesFor: (entryId: string) => ProjectActivityEntry[];
  activityCountForProject: (projectId: string) => number;
  lastActivityAt: (projectId: string) => string | null;
}

export const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [activity, setActivity] = useState<ProjectActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // NotificationsProvider is mounted above ProjectsProvider in app/layout.tsx
  // specifically so this is available here.
  const { notify } = useNotifications();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getProjectStore().load(),
      getProjectTaskStore().load(),
      getProjectNoteStore().load(),
      getProjectResourceStore().load(),
      getProjectActivityStore().load(),
    ]).then(([p, t, n, r, a]) => {
      if (cancelled) return;
      setProjects(p);
      setTasks(t);
      setNotes(n);
      setResources(r);
      setActivity(a);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Automatic timeline events (design refinement pass): a plain function
  // declaration (not useCallback) so it's hoisted and safely referenceable
  // from any mutation below regardless of declaration order — it only
  // closes over the stable setActivity setter, so it never goes stale.
  // These are the ONLY automatic triggers wired up: task created/
  // completed, resource added/removed, note updated (on explicit Save,
  // never per-keystroke — see study-item-view.tsx), and project archived/
  // unarchived. Milestones and a broader "status changed" event aren't
  // implemented — milestones don't exist yet (deferred out of Phase 5
  // entirely) and a generic per-status-transition log risked exactly the
  // noisy timeline this feature is supposed to avoid.
  function logSystemEvent(projectId: string, systemEventType: SystemEventType, content: string) {
    const entry: ProjectActivityEntry = {
      id: crypto.randomUUID(),
      projectId,
      parentId: null,
      tag: "system",
      statusTag: null,
      systemEventType,
      content,
      attachments: [],
      createdAt: new Date().toISOString(),
    };
    setActivity((prev) => {
      const next = [entry, ...prev];
      void getProjectActivityStore().save(next);
      return next;
    });
  }

  // ── Projects ────────────────────────────────────────────────────────
  const createProject = useCallback((input: NewProjectInput): Project => {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name: input.name.trim() || "Untitled project",
      description: input.description?.trim() || undefined,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => {
      const next = [project, ...prev];
      void getProjectStore().save(next);
      return next;
    });
    return project;
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Pick<Project, "name" | "description">>) => {
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p));
      void getProjectStore().save(next);
      return next;
    });
  }, []);

  const setStatus = useCallback((id: string, status: ProjectStatus) => {
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p));
      void getProjectStore().save(next);
      return next;
    });
  }, []);
  const archiveProject = useCallback((id: string) => {
    setStatus(id, "archived");
    logSystemEvent(id, "project-archived", "Archived this project");
  }, [setStatus]);
  const unarchiveProject = useCallback((id: string) => {
    setStatus(id, "active");
    logSystemEvent(id, "project-unarchived", "Unarchived this project");
  }, [setStatus]);

  /** Genuinely destructive — cascades into the other four in-memory
   * arrays directly (no re-fetch from storage needed, unlike the old
   * per-hook version, since everything already lives in this one
   * provider). */
  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      void getProjectStore().save(next);
      return next;
    });
    setTasks((prev) => {
      const next = prev.filter((t) => t.projectId !== id);
      void getProjectTaskStore().save(next);
      return next;
    });
    setNotes((prev) => {
      const next = prev.filter((n) => n.projectId !== id);
      void getProjectNoteStore().save(next);
      return next;
    });
    setResources((prev) => {
      const next = prev.filter((r) => r.projectId !== id);
      void getProjectResourceStore().save(next);
      return next;
    });
    setActivity((prev) => {
      const next = prev.filter((a) => a.projectId !== id);
      void getProjectActivityStore().save(next);
      return next;
    });
  }, []);

  // ── Tasks ───────────────────────────────────────────────────────────
  const addTask = useCallback((input: NewTaskInput): ProjectTask => {
    const now = new Date().toISOString();
    const task: ProjectTask = {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      title: input.title.trim() || "Untitled task",
      description: input.description?.trim() || undefined,
      status: input.status ?? "todo",
      createdAt: now,
      updatedAt: now,
    };
    setTasks((prev) => {
      const next = [task, ...prev];
      void getProjectTaskStore().save(next);
      return next;
    });
    logSystemEvent(input.projectId, "task-created", `Created task "${task.title}"`);
    return task;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Pick<ProjectTask, "title" | "description" | "status">>) => {
    // Read the pre-update task from current state (not the functional
    // updater's `prev`, which can't safely be read outside its own
    // callback) so the "just completed" log only fires on a genuine
    // todo/in-progress → done transition, not every save.
    const before = tasks.find((t) => t.id === id);
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t));
      void getProjectTaskStore().save(next);
      return next;
    });
    if (before && patch.status === "done" && before.status !== "done") {
      logSystemEvent(before.projectId, "task-completed", `Completed task "${before.title}"`);
    }
  }, [tasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      void getProjectTaskStore().save(next);
      return next;
    });
  }, []);

  // ── Notes ───────────────────────────────────────────────────────────
  const addNote = useCallback((input: NewNoteInput): ProjectNote => {
    const now = new Date().toISOString();
    const note: ProjectNote = {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      title: input.title.trim() || "Untitled note",
      content: input.content ?? "",
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => {
      const next = [note, ...prev];
      void getProjectNoteStore().save(next);
      return next;
    });
    return note;
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Pick<ProjectNote, "title" | "content">>) => {
    const before = notes.find((n) => n.id === id);
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n));
      void getProjectNoteStore().save(next);
      return next;
    });
    if (before) {
      logSystemEvent(before.projectId, "note-updated", `Updated note "${patch.title ?? before.title}"`);
    }
  }, [notes]);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      void getProjectNoteStore().save(next);
      return next;
    });
  }, []);

  // ── Resources ───────────────────────────────────────────────────────
  const addResource = useCallback((input: NewResourceInput): ProjectResource => {
    const resource: ProjectResource =
      input.kind === "study-item"
        ? { id: crypto.randomUUID(), projectId: input.projectId, kind: "study-item", studyItemId: input.studyItemId, addedAt: new Date().toISOString() }
        : { id: crypto.randomUUID(), projectId: input.projectId, kind: "link", url: input.url.trim(), label: input.label.trim() || input.url.trim(), addedAt: new Date().toISOString() };
    setResources((prev) => {
      const next = [resource, ...prev];
      void getProjectResourceStore().save(next);
      return next;
    });
    const label = resource.kind === "link" ? resource.label : "a Study Library item";
    logSystemEvent(input.projectId, "resource-added", `Added ${label} to resources`);
    const projectName = projects.find((p) => p.id === input.projectId)?.name ?? "a project";
    notify({
      kind: "resource-added",
      title: "Resource added",
      subtitle: `${label} · ${projectName}`,
      path: `/projects?open=${input.projectId}&tab=resources`,
    });
    return resource;
  }, [projects, notify]);

  const deleteResource = useCallback((id: string) => {
    const removed = resources.find((r) => r.id === id);
    setResources((prev) => {
      const next = prev.filter((r) => r.id !== id);
      void getProjectResourceStore().save(next);
      return next;
    });
    if (removed) {
      const label = removed.kind === "link" ? removed.label : "a Study Library item";
      logSystemEvent(removed.projectId, "resource-removed", `Removed ${label} from resources`);
    }
  }, [resources]);

  // ── Activity ────────────────────────────────────────────────────────
  const addActivityEntry = useCallback((input: NewActivityInput): ProjectActivityEntry => {
    const entry: ProjectActivityEntry = {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      parentId: input.parentId ?? null,
      tag: input.tag,
      statusTag: input.statusTag ?? null,
      content: input.content,
      attachments: input.attachments ?? [],
      createdAt: new Date().toISOString(),
    };
    setActivity((prev) => {
      const next = [entry, ...prev];
      void getProjectActivityStore().save(next);
      return next;
    });
    return entry;
  }, []);

  const deleteActivityEntry = useCallback((id: string) => {
    setActivity((prev) => {
      const next = prev.filter((e) => e.id !== id && e.parentId !== id);
      void getProjectActivityStore().save(next);
      return next;
    });
  }, []);

  // ── Derived selectors (recomputed from the shared arrays — no caller
  // ever holds a stale copy since these read straight from state above) ──
  const activeProjects = projects.filter((p) => p.status === "active");
  const archivedProjects = projects.filter((p) => p.status === "archived");

  const tasksForProject = useCallback((projectId: string) => tasks.filter((t) => t.projectId === projectId), [tasks]);
  const taskCountForProject = useCallback((projectId: string) => tasks.filter((t) => t.projectId === projectId).length, [tasks]);

  const notesForProject = useCallback((projectId: string) => notes.filter((n) => n.projectId === projectId), [notes]);
  const noteCountForProject = useCallback((projectId: string) => notes.filter((n) => n.projectId === projectId).length, [notes]);

  const resourcesForProject = useCallback((projectId: string) => resources.filter((r) => r.projectId === projectId), [resources]);
  const resourceCountForProject = useCallback((projectId: string) => resources.filter((r) => r.projectId === projectId).length, [resources]);

  const activityForProject = useCallback(
    (projectId: string) =>
      activity
        .filter((e) => e.projectId === projectId && e.parentId === null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [activity],
  );
  const activityRepliesFor = useCallback(
    (entryId: string) =>
      activity.filter((e) => e.parentId === entryId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [activity],
  );
  const activityCountForProject = useCallback((projectId: string) => activity.filter((e) => e.projectId === projectId).length, [activity]);
  const lastActivityAt = useCallback((projectId: string): string | null => {
    const scoped = activity.filter((e) => e.projectId === projectId);
    if (scoped.length === 0) return null;
    return scoped.reduce((latest, e) => (e.createdAt > latest ? e.createdAt : latest), scoped[0].createdAt);
  }, [activity]);

  const value: ProjectsContextValue = {
    isLoading,
    projects, activeProjects, archivedProjects,
    createProject, updateProject, archiveProject, unarchiveProject, deleteProject,
    tasks, addTask, updateTask, deleteTask, tasksForProject, taskCountForProject,
    notes, addNote, updateNote, deleteNote, notesForProject, noteCountForProject,
    resources, addResource, deleteResource, resourcesForProject, resourceCountForProject,
    activity, addActivityEntry, deleteActivityEntry, activityForProject, activityRepliesFor, activityCountForProject, lastActivityAt,
  };

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}
