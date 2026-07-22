"use client";
import { useCallback, useEffect, useState } from "react";
import { StudyItem, StudyItemKind } from "@/types/document";
import { getStudyLibraryStore } from "@/lib/storage/study-library-store";
import { useNotifications } from "@/hooks/useNotifications";

export interface NewStudyItemInput {
  topic: string;
  kind: StudyItemKind;
  title: string;
  content: string;
}

export function useStudyLibrary() {
  const [items, setItems] = useState<StudyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { notify } = useNotifications();

  useEffect(() => {
    let cancelled = false;
    getStudyLibraryStore().load().then((loaded) => {
      if (cancelled) return;
      setItems(loaded);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const addItem = useCallback((input: NewStudyItemInput): StudyItem => {
    const item: StudyItem = {
      id: crypto.randomUUID(),
      topic: input.topic.trim() || "General",
      kind: input.kind,
      title: input.title.trim() || "Untitled",
      content: input.content,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => {
      const next = [item, ...prev];
      void getStudyLibraryStore().save(next);
      return next;
    });
    notify({
      kind: "study-item-added",
      title: "Study item added",
      subtitle: `${item.title} · ${item.topic}`,
      path: `/documents?tab=library&open=${item.id}`,
    });
    return item;
  }, [notify]);

  /**
   * Patch an existing item (currently used by the Document Viewer's note
   * editor to save edited markdown content, but left general — title/topic
   * could be edited the same way later).
   */
  const updateItem = useCallback((id: string, patch: Partial<Pick<StudyItem, "title" | "content" | "topic">>) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, ...patch } : i));
      void getStudyLibraryStore().save(next);
      return next;
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      void getStudyLibraryStore().save(next);
      return next;
    });
  }, []);

  // ── Derived: grouped by topic, then by kind ──────────────────────────────────
  const groupedByTopic = useCallback((): Map<string, StudyItem[]> => {
    const map = new Map<string, StudyItem[]>();
    for (const item of items) {
      const list = map.get(item.topic) ?? [];
      list.push(item);
      map.set(item.topic, list);
    }
    return map;
  }, [items]);

  return { items, isLoading, addItem, updateItem, deleteItem, groupedByTopic };
}
