"use client";

/**
 * Projects — lightweight Linear-inside-Ascend-OS project space (Phase 5).
 *
 * Same query-param view-swap architecture as app/documents/page.tsx and
 * for the same reason: static export (next.config's `output: "export"`)
 * can't pre-render arbitrary runtime project ids as real routes. `?open=`
 * picks which project's detail view renders in place of the list; `?tab=`
 * picks the detail tab (Overview/Tasks/Notes/Resources/Activity, all now
 * present as of Checkpoint C). `?note=` additionally picks an open
 * planning note within the Notes tab.
 *
 * Create/rename/delete are modal flows with local component state (not
 * query-params) — unlike opening a document, these aren't states worth
 * deep-linking to.
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/useProjects";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { useProjectNotes } from "@/hooks/useProjectNotes";
import { useProjectResources } from "@/hooks/useProjectResources";
import { useProjectActivity } from "@/hooks/useProjectActivity";
import { useStudyLibrary } from "@/hooks/useStudyLibrary";
import { useRecents } from "@/hooks/useRecents";
import { Project, ProjectTask, ProjectNote } from "@/types/project";
import { StudyItem } from "@/types/document";
import { ProjectRow } from "@/components/projects/project-row";
import { ProjectFormModal } from "@/components/projects/project-form-modal";
import { DeleteProjectModal } from "@/components/projects/delete-project-modal";
import { ProjectOverview } from "@/components/projects/project-overview";
import { TaskGroupList } from "@/components/projects/task-group-list";
import { TaskFormModal } from "@/components/projects/task-form-modal";
import { NoteList } from "@/components/projects/note-list";
import { NoteFormModal } from "@/components/projects/note-form-modal";
import { ResourceList } from "@/components/projects/resource-list";
import { AddResourceModal } from "@/components/projects/add-resource-modal";
import { ActivityFeed } from "@/components/projects/activity-feed";
import { DocumentReader } from "@/components/documents/document-reader";
import { tauriOpenUrl } from "@/lib/tauri/bridge";
import {
  ChevronRight, ArrowLeft, FolderKanban, Plus, Pencil, Archive, ArchiveRestore, Trash2,
  ListTodo, StickyNote, Paperclip, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DetailTab = "overview" | "tasks" | "notes" | "resources" | "activity";
const TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "notes", label: "Notes" },
  { id: "resources", label: "Resources" },
  { id: "activity", label: "Activity" },
];

// Design brief §1 revision note: with the redundant contextual sidebar
// list gone, Projects' own search + sort need to be genuinely functional
// on their own rather than leaning on a second list elsewhere.
type SortKey = "updated" | "name" | "tasks";
const SORTS: { id: SortKey; label: string }[] = [
  { id: "updated", label: "Last updated" },
  { id: "name", label: "Name" },
  { id: "tasks", label: "Task count" },
];

/**
 * A project's planning notes are ProjectNote records, not StudyItems —
 * they live in their own store, scoped to the project, never in the flat
 * Study Library. But DocumentReader/StudyItemView only know how to render
 * a StudyItem. Rather than teach either of those two components a second
 * shape (touching code this phase is explicitly scoped to leave alone),
 * this builds a StudyItem-shaped view of the note on the fly: `kind:
 * "note"` gets the exact same editable-markdown treatment a Study Library
 * note gets, and `topic` shows the project's name in the reader's header
 * breadcrumb for context. Nothing here is persisted — updateNote (via
 * onSaveStudyItem) is still the only write path.
 */
function buildNoteStudyItem(note: ProjectNote, project: Project): StudyItem {
  return {
    id: note.id,
    topic: project.name,
    kind: "note",
    title: note.title,
    content: note.content,
    createdAt: note.createdAt,
  };
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageInner />
    </Suspense>
  );
}

function ProjectsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    projects, activeProjects, archivedProjects, isLoading,
    createProject, updateProject, archiveProject, unarchiveProject, deleteProject,
  } = useProjects();
  const {
    countForProject: taskCountFor, forProject: tasksForProject,
    addTask, updateTask, deleteTask,
  } = useProjectTasks();
  const doneCountFor = (id: string) => tasksForProject(id).filter((t) => t.status === "done").length;
  const {
    countForProject: noteCountFor, forProject: notesForProject,
    addNote, updateNote, deleteNote,
  } = useProjectNotes();
  const {
    countForProject: resourceCountFor, forProject: resourcesForProject,
    addResource, deleteResource,
  } = useProjectResources();
  const {
    countForProject: activityCountFor, lastActivityAt,
    forProject: activityForProject, repliesFor: activityRepliesFor,
    addEntry: addActivityEntry, deleteEntry: deleteActivityEntry,
  } = useProjectActivity();
  const { items: studyItems } = useStudyLibrary();
  const { recordOpen } = useRecents();

  const openId = searchParams.get("open");
  const tab = (searchParams.get("tab") as DetailTab) ?? "overview";
  const createOpen = searchParams.get("new") === "1";
  const noteId = searchParams.get("note");

  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [activeGroupOpen, setActiveGroupOpen] = useState(true);
  const [archivedGroupOpen, setArchivedGroupOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");

  const openProject = useMemo(() => projects.find((p) => p.id === openId) ?? null, [projects, openId]);
  const projectTasks = openProject ? tasksForProject(openProject.id) : [];
  const projectNotes = openProject ? notesForProject(openProject.id) : [];
  const projectResources = openProject ? resourcesForProject(openProject.id) : [];
  const projectActivity = openProject ? activityForProject(openProject.id) : [];
  const openNoteRecord = useMemo(
    () => (noteId ? projectNotes.find((n) => n.id === noteId) ?? null : null),
    [noteId, projectNotes],
  );

  // Search + sort — genuinely functional now that there's no sidebar list
  // duplicating this one. Searching flattens Active/Archived into one
  // sorted list (avoids a collapsed group silently hiding a match);
  // clearing the search restores the normal grouped view, sorted within
  // each group.
  //
  // These three useMemo calls must live here, unconditionally, before
  // either early return below — they used to sit after both returns
  // (only reachable on the list-view render path), so opening a project
  // skipped them entirely and React saw a different hook count between
  // "a project is open" renders and "viewing the list" renders of the
  // same mounted component instance ("Rendered fewer hooks than
  // expected"). Hooks can never depend on a condition that changes
  // within one component's lifetime — moving them above any conditional
  // return is the actual fix, not a workaround.
  const isSearching = query.trim().length > 0;
  function sortProjects(list: Project[]): Project[] {
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "tasks") sorted.sort((a, b) => taskCountFor(b.id) - taskCountFor(a.id));
    else sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return sorted;
  }
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = query.trim().toLowerCase();
    return sortProjects(projects.filter((p) => p.name.toLowerCase().includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching, query, projects, sort]);
  const sortedActive = useMemo(() => sortProjects(activeProjects), [activeProjects, sort]);
  const sortedArchived = useMemo(() => sortProjects(archivedProjects), [archivedProjects, sort]);

  // Sidebar Recents — records a project the moment it's opened, regardless
  // of entry point (nav link, command palette, search result). Only fires
  // on the project itself opening/changing, not on tab/note navigation
  // within an already-open project.
  useEffect(() => {
    if (!openProject) return;
    recordOpen({
      id: openProject.id,
      kind: "project",
      label: openProject.name,
      href: `/projects?open=${openProject.id}&tab=overview`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openProject?.id]);

  function openDetail(id: string) {
    router.push(`/projects?open=${id}&tab=overview`);
  }
  function closeDetail() {
    router.push("/projects");
  }
  function setDetailTab(next: DetailTab) {
    if (!openId) return;
    router.push(`/projects?open=${openId}&tab=${next}`);
  }
  function openCreateModal() {
    router.push(openId ? `/projects?open=${openId}&tab=${tab}&new=1` : "/projects?new=1");
  }
  function closeCreateModal() {
    router.push(openId ? `/projects?open=${openId}&tab=${tab}` : "/projects");
  }

  // Opening a note navigates into the full DocumentReader — no separate
  // right-panel selection step anymore (design brief §1's revision note).
  // Delete is now reachable two ways: a hover action on the row in
  // NoteList, and a Delete action in DocumentReader's own header once
  // the note is open (via the onDelete prop passed below).
  function openNote(note: ProjectNote) {
    router.push(`/projects?open=${openId}&tab=notes&note=${note.id}`);
  }
  function closeNote() {
    router.push(`/projects?open=${openId}&tab=notes`);
  }

  // ── Resources ────────────────────────────────────────────────────────
  // A linked Study Library item still lives in the flat library — the
  // project only holds a reference (studyItemId) — so opening one leaves
  // /projects entirely and deep-links into Documents' own reader via its
  // existing ?tab=library&open= query params, rather than duplicating any
  // Document Reader logic here.
  function openStudyItemResource(item: StudyItem) {
    router.push(`/documents?tab=library&open=${item.id}`);
  }
  function openLinkResource(url: string) {
    void tauriOpenUrl(url);
  }

  const deleteCounts = deleteTarget
    ? {
        tasks: taskCountFor(deleteTarget.id),
        notes: noteCountFor(deleteTarget.id),
        resources: resourceCountFor(deleteTarget.id),
        activity: activityCountFor(deleteTarget.id),
      }
    : { tasks: 0, notes: 0, resources: 0, activity: 0 };

  // ── Note reader takeover ───────────────────────────────────────────
  // A note is a real Document Reader document (shimmed into StudyItem
  // shape — see the comment above buildNoteStudyItem below), so opening
  // one fully replaces this pane, exactly like Documents' own openDocument
  // branch — same header/back-button chrome, no divergent treatment.
  // "Back" returns to this project's own Notes tab, never to /documents.
  if (openProject && openNoteRecord) {
    return (
      <DocumentReader
        document={{ kind: "study-item", item: buildNoteStudyItem(openNoteRecord, openProject) }}
        onBack={closeNote}
        onSaveStudyItem={(id, patch) => updateNote(id, { content: patch.content })}
        onDelete={() => {
          deleteNote(openNoteRecord.id);
          closeNote();
        }}
      />
    );
  }

  // ── Detail view ──────────────────────────────────────────────────────
  if (openProject) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b px-6 py-4" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex min-w-0 items-start gap-3">
            <button
              onClick={closeDetail}
              className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
              style={{ color: "var(--text-muted)" }}
              title="Back to Projects"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                <FolderKanban className="h-3 w-3" />
                Project{openProject.status === "archived" ? " · Archived" : ""}
              </p>
              <h1 className="mt-0.5 truncate text-[20px] font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                {openProject.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <IconAction onClick={() => setRenameTarget(openProject)} label="Edit"><Pencil className="h-3.5 w-3.5" /></IconAction>
            {openProject.status === "active" ? (
              <IconAction onClick={() => archiveProject(openProject.id)} label="Archive"><Archive className="h-3.5 w-3.5" /></IconAction>
            ) : (
              <IconAction onClick={() => unarchiveProject(openProject.id)} label="Unarchive"><ArchiveRestore className="h-3.5 w-3.5" /></IconAction>
            )}
            <IconAction onClick={() => setDeleteTarget(openProject)} label="Delete" danger><Trash2 className="h-3.5 w-3.5" /></IconAction>
          </div>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5 md:px-10">
          <div className="mx-auto w-full max-w-[720px]">
            {/* Tab bar — all five Phase 5 tabs now live in TABS. */}
            <div className="mb-5 flex gap-1.5 rounded-lg border p-1" style={{ borderColor: "var(--border-subtle)" }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDetailTab(t.id)}
                  className="flex-1 rounded-md py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors"
                  style={tab === t.id ? { color: "var(--accent-primary)" } : { color: "var(--text-muted)" }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <ProjectOverview
                project={openProject}
                counts={{
                  tasks: taskCountFor(openProject.id),
                  tasksDone: doneCountFor(openProject.id),
                  notes: noteCountFor(openProject.id),
                  resources: resourceCountFor(openProject.id),
                  activity: activityCountFor(openProject.id),
                }}
                lastActivityAt={lastActivityAt(openProject.id)}
              />
            )}

            {tab === "tasks" && (
              <div>
                <div className="mb-3 flex items-center justify-end">
                  <Button variant="outline" onClick={() => setTaskFormOpen(true)} className="!px-2.5 !py-1.5 !text-[10px]">
                    <Plus className="h-3 w-3" /> New Task
                  </Button>
                </div>
                {projectTasks.length === 0 ? (
                  <div className="quiet-empty">
                    <ListTodo className="mb-1 h-6 w-6" style={{ color: "var(--text-muted)" }} />
                    <p className="quiet-empty-title">No tasks yet</p>
                    <p className="quiet-empty-sub">Create your first task to start planning this project.</p>
                    <Button variant="outline" onClick={() => setTaskFormOpen(true)} className="mt-3 !px-2.5 !py-1.5 !text-[10px]">
                      <Plus className="h-3 w-3" /> New Task
                    </Button>
                  </div>
                ) : (
                  <TaskGroupList
                    tasks={projectTasks}
                    onSelectTask={setEditingTask}
                    onToggleDone={(task) => updateTask(task.id, { status: task.status === "done" ? "todo" : "done" })}
                    onDelete={(task) => deleteTask(task.id)}
                  />
                )}
              </div>
            )}

            {tab === "notes" && (
              <div>
                <div className="mb-3 flex items-center justify-end">
                  <Button variant="outline" onClick={() => setNoteFormOpen(true)} className="!px-2.5 !py-1.5 !text-[10px]">
                    <Plus className="h-3 w-3" /> Create Planning Note
                  </Button>
                </div>
                {projectNotes.length === 0 ? (
                  <div className="quiet-empty">
                    <StickyNote className="mb-1 h-6 w-6" style={{ color: "var(--text-muted)" }} />
                    <p className="quiet-empty-title">Capture ideas, architecture, roadmaps, and decisions.</p>
                    <Button variant="outline" onClick={() => setNoteFormOpen(true)} className="mt-3 !px-2.5 !py-1.5 !text-[10px]">
                      <Plus className="h-3 w-3" /> Create Planning Note
                    </Button>
                  </div>
                ) : (
                  <NoteList notes={projectNotes} onOpenNote={openNote} onDelete={(note) => deleteNote(note.id)} />
                )}
              </div>
            )}

            {tab === "resources" && (
              <div>
                <div className="mb-3 flex items-center justify-end">
                  <Button variant="outline" onClick={() => setAddResourceOpen(true)} className="!px-2.5 !py-1.5 !text-[10px]">
                    <Plus className="h-3 w-3" /> Add Resource
                  </Button>
                </div>
                {projectResources.length === 0 ? (
                  <div className="quiet-empty">
                    <Paperclip className="mb-1 h-6 w-6" style={{ color: "var(--text-muted)" }} />
                    <p className="quiet-empty-title">Attach documentation, GitHub repositories, designs, or research.</p>
                    <Button variant="outline" onClick={() => setAddResourceOpen(true)} className="mt-3 !px-2.5 !py-1.5 !text-[10px]">
                      <Plus className="h-3 w-3" /> Add Resource
                    </Button>
                  </div>
                ) : (
                  <ResourceList
                    resources={projectResources}
                    studyItems={studyItems}
                    onOpenStudyItem={openStudyItemResource}
                    onOpenLink={openLinkResource}
                    onDelete={deleteResource}
                  />
                )}
              </div>
            )}

            {tab === "activity" && (
              <ActivityFeed
                entries={projectActivity}
                repliesFor={activityRepliesFor}
                onAddEntry={(input) => addActivityEntry({ projectId: openProject.id, ...input })}
                onDeleteEntry={deleteActivityEntry}
              />
            )}
          </div>
        </div>

        <ProjectFormModal
          open={!!renameTarget}
          project={renameTarget}
          onClose={() => setRenameTarget(null)}
          onSubmit={(input) => renameTarget && updateProject(renameTarget.id, input)}
        />
        <DeleteProjectModal
          open={!!deleteTarget}
          project={deleteTarget}
          counts={deleteCounts}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (!deleteTarget) return;
            const wasOpen = deleteTarget.id === openProject.id;
            void deleteProject(deleteTarget.id);
            if (wasOpen) closeDetail();
          }}
        />
        <TaskFormModal
          open={taskFormOpen}
          onClose={() => setTaskFormOpen(false)}
          onSubmit={(input) => addTask({ projectId: openProject.id, ...input })}
        />
        <TaskFormModal
          open={!!editingTask}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={(input) => editingTask && updateTask(editingTask.id, input)}
        />
        <NoteFormModal
          open={noteFormOpen}
          onClose={() => setNoteFormOpen(false)}
          onSubmit={(input) => {
            const note = addNote({ projectId: openProject.id, title: input.title });
            router.push(`/projects?open=${openProject.id}&tab=notes&note=${note.id}`);
          }}
        />
        <AddResourceModal
          open={addResourceOpen}
          onClose={() => setAddResourceOpen(false)}
          studyItems={studyItems}
          alreadyLinkedIds={projectResources
            .filter((r): r is Extract<typeof projectResources[number], { kind: "study-item" }> => r.kind === "study-item")
            .map((r) => r.studyItemId)}
          onSubmit={(input) => addResource({ projectId: openProject.id, ...input })}
        />
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1000px] space-y-5 p-7 pb-10">
      <header className="flex items-end justify-between pt-1">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em]" style={{ color: "var(--accent-primary)" }}>
            Project Space
          </p>
          <h1 className="mt-0.5 text-[22px] font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Projects</h1>
        </div>
        <Button variant="outline" onClick={openCreateModal} className="!px-2.5 !py-1.5 !text-[10px]">
          <Plus className="h-3 w-3" /> New Project
        </Button>
      </header>

      {!isLoading && projects.length > 0 && (
        <div className="list-toolbar">
          <div className="app-card list-toolbar-search flex items-center gap-3 !p-3">
            <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="w-full bg-transparent text-[13px] focus:outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <div className="sort-field">
            <span className="sort-field-label">Sort</span>
            <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <Card>
        {!isLoading && projects.length === 0 ? (
          <div className="quiet-empty">
            <FolderKanban className="mb-1 h-6 w-6" style={{ color: "var(--text-muted)" }} />
            <p className="quiet-empty-title">No projects yet</p>
            <p className="quiet-empty-sub">Create a project to start tracking its tasks, notes, and resources.</p>
            <Button variant="outline" onClick={openCreateModal} className="mt-3 !px-2.5 !py-1.5 !text-[10px]">
              <Plus className="h-3 w-3" /> New Project
            </Button>
          </div>
        ) : isSearching ? (
          searchResults.length === 0 ? (
            <p className="quiet-empty-sub py-4 text-center">Nothing matches &ldquo;{query}&rdquo;.</p>
          ) : (
            <div>
              {searchResults.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  taskCount={taskCountFor(p.id)}
                  doneCount={doneCountFor(p.id)}
                  lastActivityAt={lastActivityAt(p.id)}
                  onOpen={() => openDetail(p.id)}
                  onArchive={() => archiveProject(p.id)}
                  onUnarchive={() => unarchiveProject(p.id)}
                  onDelete={() => setDeleteTarget(p)}
                />
              ))}
            </div>
          )
        ) : (
          <>
            <ProjectGroup
              label="Active"
              projectsList={sortedActive}
              open={activeGroupOpen}
              onToggle={() => setActiveGroupOpen((o) => !o)}
              taskCountFor={taskCountFor}
              doneCountFor={doneCountFor}
              lastActivityAt={lastActivityAt}
              onOpen={openDetail}
              onArchive={archiveProject}
              onUnarchive={unarchiveProject}
              onDelete={setDeleteTarget}
            />
            {sortedArchived.length > 0 && (
              <ProjectGroup
                label="Archived"
                projectsList={sortedArchived}
                open={archivedGroupOpen}
                onToggle={() => setArchivedGroupOpen((o) => !o)}
                taskCountFor={taskCountFor}
                doneCountFor={doneCountFor}
                lastActivityAt={lastActivityAt}
                onOpen={openDetail}
                onArchive={archiveProject}
                onUnarchive={unarchiveProject}
                onDelete={setDeleteTarget}
              />
            )}
          </>
        )}
      </Card>

      <ProjectFormModal
        open={createOpen}
        onClose={closeCreateModal}
        onSubmit={(input) => {
          const p = createProject(input);
          openDetail(p.id);
        }}
      />
      <DeleteProjectModal
        open={!!deleteTarget}
        project={deleteTarget}
        counts={deleteCounts}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteProject(deleteTarget.id)}
      />
    </div>
  );
}

function ProjectGroup({
  label, projectsList, open, onToggle, taskCountFor, doneCountFor, lastActivityAt, onOpen, onArchive, onUnarchive, onDelete,
}: {
  label: string;
  projectsList: Project[];
  open: boolean;
  onToggle: () => void;
  taskCountFor: (id: string) => number;
  doneCountFor: (id: string) => number;
  lastActivityAt: (id: string) => string | null;
  onOpen: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (p: Project) => void;
}) {
  return (
    <div className="grouped-list">
      <button className="grouped-list-header" onClick={onToggle}>
        <span className="grouped-list-title">{label}</span>
        <span className="grouped-list-count">{projectsList.length}</span>
        <ChevronRight className={cn("grouped-list-chevron", open && "grouped-list-chevron--open")} />
      </button>
      {open && (
        projectsList.length === 0 ? (
          <p className="grouped-list-empty">Nothing here.</p>
        ) : (
          <div>
            {projectsList.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                taskCount={taskCountFor(p.id)}
                doneCount={doneCountFor(p.id)}
                lastActivityAt={lastActivityAt(p.id)}
                onOpen={() => onOpen(p.id)}
                onArchive={() => onArchive(p.id)}
                onUnarchive={() => onUnarchive(p.id)}
                onDelete={() => onDelete(p)}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

function IconAction({ onClick, label, children, danger }: { onClick: () => void; label: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px]"
      style={{ borderColor: "var(--border-default)", color: danger ? "var(--status-error)" : "var(--text-secondary)" }}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
