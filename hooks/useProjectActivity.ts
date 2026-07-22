"use client";
/**
 * useProjectActivity — thin reader over ProjectsContext. See
 * useProjects.ts for why this is no longer its own useState-backed store.
 */
import { useContext } from "react";
import { ProjectsContext } from "@/lib/projects-context";

export function useProjectActivity() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjectActivity must be used inside <ProjectsProvider>");
  return {
    entries: ctx.activity,
    isLoading: ctx.isLoading,
    addEntry: ctx.addActivityEntry,
    deleteEntry: ctx.deleteActivityEntry,
    forProject: ctx.activityForProject,
    repliesFor: ctx.activityRepliesFor,
    countForProject: ctx.activityCountForProject,
    lastActivityAt: ctx.lastActivityAt,
  };
}
