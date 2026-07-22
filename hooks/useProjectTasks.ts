"use client";
/**
 * useProjectTasks — thin reader over ProjectsContext. See useProjects.ts
 * for why this is no longer its own useState-backed store.
 */
import { useContext } from "react";
import { ProjectsContext } from "@/lib/projects-context";

export function useProjectTasks() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjectTasks must be used inside <ProjectsProvider>");
  return {
    tasks: ctx.tasks,
    isLoading: ctx.isLoading,
    addTask: ctx.addTask,
    updateTask: ctx.updateTask,
    deleteTask: ctx.deleteTask,
    forProject: ctx.tasksForProject,
    countForProject: ctx.taskCountForProject,
  };
}
