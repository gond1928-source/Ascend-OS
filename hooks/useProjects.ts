"use client";
/**
 * useProjects — thin reader over ProjectsContext (lib/projects-context.tsx).
 * Previously owned its own useState (same bug SessionContext's header
 * describes for sessions) — now every caller shares one array, so
 * creating/archiving/deleting a project updates the Projects page, the
 * NavPanel sidebar, and the command palette in the same render.
 */
import { useContext } from "react";
import { ProjectsContext } from "@/lib/projects-context";

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used inside <ProjectsProvider>");
  return {
    projects: ctx.projects,
    activeProjects: ctx.activeProjects,
    archivedProjects: ctx.archivedProjects,
    isLoading: ctx.isLoading,
    createProject: ctx.createProject,
    updateProject: ctx.updateProject,
    archiveProject: ctx.archiveProject,
    unarchiveProject: ctx.unarchiveProject,
    deleteProject: ctx.deleteProject,
  };
}
