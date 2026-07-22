"use client";

import { useState } from "react";
import { ProjectTask, TaskStatus } from "@/types/project";
import { ChevronRight, Circle, CircleDot, CheckCircle2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_GROUPS: { status: TaskStatus; label: string; icon: typeof Circle }[] = [
  { status: "todo", label: "Todo", icon: Circle },
  { status: "in-progress", label: "In Progress", icon: CircleDot },
  { status: "done", label: "Done", icon: CheckCircle2 },
];

/**
 * TaskGroupList — grouped-list-with-counts (design brief §11), reused
 * as-is from the CSS primitive established in earlier phases. Rows stay
 * single-line by design — full description and the 3-way status switcher
 * live in TaskFormModal (Edit), not inline here.
 *
 * This used to open a right-panel detail view on title click; the panel
 * is gone now (design brief §1's revision note). Since TaskFormModal
 * already covers title + description + full status switching, the
 * cleanest fold-in was to point the title click straight at Edit rather
 * than rebuild a read-only detail view with no other home. Delete moved
 * to a hover action on the row, matching the established
 * ReportCard/StudyTopicGroup convention elsewhere in the app.
 *
 * Three independent controls per row (not nested buttons):
 *  - the checkbox icon toggles done/todo directly, no need to open Edit
 *    just to tick something off.
 *  - the title opens TaskFormModal for editing (title, description,
 *    full 3-way status).
 *  - a hover-revealed Delete icon, visible on row hover only.
 */
export function TaskGroupList({
  tasks,
  onSelectTask,
  onToggleDone,
  onDelete,
}: {
  tasks: ProjectTask[];
  onSelectTask: (task: ProjectTask) => void;
  onToggleDone: (task: ProjectTask) => void;
  onDelete: (task: ProjectTask) => void;
}) {
  return (
    <div className="space-y-3">
      {STATUS_GROUPS.map((group) => (
        <TaskStatusGroup
          key={group.status}
          group={group}
          tasks={tasks.filter((t) => t.status === group.status)}
          onSelectTask={onSelectTask}
          onToggleDone={onToggleDone}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function TaskStatusGroup({
  group,
  tasks,
  onSelectTask,
  onToggleDone,
  onDelete,
}: {
  group: { status: TaskStatus; label: string; icon: typeof Circle };
  tasks: ProjectTask[];
  onSelectTask: (task: ProjectTask) => void;
  onToggleDone: (task: ProjectTask) => void;
  onDelete: (task: ProjectTask) => void;
}) {
  // Done starts collapsed — same reasoning as the project list's Archived
  // group: it's real data worth keeping, just not what you want filling
  // the screen by default.
  const [open, setOpen] = useState(group.status !== "done");
  const Icon = group.icon;

  return (
    <div className="grouped-list">
      <button className="grouped-list-header" onClick={() => setOpen((o) => !o)}>
        <span className="grouped-list-title">{group.label}</span>
        <span className="grouped-list-count">{tasks.length}</span>
        <ChevronRight className={cn("grouped-list-chevron", open && "grouped-list-chevron--open")} />
      </button>
      {open && (
        tasks.length === 0 ? (
          <p className="grouped-list-empty">Nothing here.</p>
        ) : (
          <div>
            {tasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-2.5 border-b px-1 py-2 transition-colors last:border-b-0 hover:bg-[var(--surface-elevated)]"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <button
                  onClick={() => onToggleDone(task)}
                  title={task.status === "done" ? "Mark as todo" : "Mark as done"}
                  className="flex-shrink-0 rounded p-0.5"
                >
                  <Icon
                    className="h-3.5 w-3.5"
                    style={{ color: task.status === "done" ? "var(--accent-primary)" : "var(--text-muted)" }}
                  />
                </button>
                <button
                  onClick={() => onSelectTask(task)}
                  className="min-w-0 flex-1 truncate text-left text-[13px]"
                  style={{
                    color: task.status === "done" ? "var(--text-muted)" : "var(--text-secondary)",
                    textDecoration: task.status === "done" ? "line-through" : "none",
                  }}
                >
                  {task.title}
                </button>
                <div className="flex flex-shrink-0 items-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    title="Delete"
                    onClick={(e) => { e.stopPropagation(); onDelete(task); }}
                    className="rounded p-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
