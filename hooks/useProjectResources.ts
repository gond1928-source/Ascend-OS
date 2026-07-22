"use client";
/**
 * useProjectResources — thin reader over ProjectsContext. See
 * useProjects.ts for why this is no longer its own useState-backed store.
 */
import { useContext } from "react";
import { ProjectsContext } from "@/lib/projects-context";

export function useProjectResources() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjectResources must be used inside <ProjectsProvider>");
  return {
    resources: ctx.resources,
    isLoading: ctx.isLoading,
    addResource: ctx.addResource,
    deleteResource: ctx.deleteResource,
    forProject: ctx.resourcesForProject,
    countForProject: ctx.resourceCountForProject,
  };
}
