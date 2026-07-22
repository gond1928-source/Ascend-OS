"use client";
/**
 * useProjectNotes — thin reader over ProjectsContext. See useProjects.ts
 * for why this is no longer its own useState-backed store.
 */
import { useContext } from "react";
import { ProjectsContext } from "@/lib/projects-context";

export function useProjectNotes() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjectNotes must be used inside <ProjectsProvider>");
  return {
    notes: ctx.notes,
    isLoading: ctx.isLoading,
    addNote: ctx.addNote,
    updateNote: ctx.updateNote,
    deleteNote: ctx.deleteNote,
    forProject: ctx.notesForProject,
    countForProject: ctx.noteCountForProject,
  };
}
