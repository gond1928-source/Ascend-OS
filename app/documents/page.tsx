"use client";

/**
 * Documents — Productivity Memory + Knowledge Archive.
 *
 * Hosts generated Weekly/Monthly reports and the Study Library (notes/
 * PDFs/links/references grouped by topic). Search queries across both,
 * plus Projects/Tasks/Notes/Activity, via lib/search-engine.ts —
 * deliberately scoped to reports/notes/study/project materials, not raw
 * session/distraction records (see that file's header).
 *
 * Reading architecture: opening a report or study item swaps the workspace
 * pane over to <DocumentReader> in-place (see that file's header for why
 * this is a query-param view-swap rather than a modal or a per-id route —
 * short version: static export can't pre-render arbitrary runtime IDs, and
 * a modal reads as too transient for real reading). `?open=<id>` drives
 * which view renders; `?tab=` picks Reports vs Library; `?add=1` opens the
 * add-study-item form. All three are driven by both this page's own UI and
 * the command palette, so the two stay in sync automatically.
 *
 * There is no separate "select a row for quick metadata" step anymore —
 * that was the right panel's job, removed along with it (design brief §1's
 * revision note). Everything it used to show (focus score/sessions,
 * topic/type, generated/added date, share) is already visible on the row
 * itself (ReportCard/StudyTopicGroup) or once the document is open
 * (DocumentReader's header). The one thing that had no other home —
 * deleting while reading — now lives directly in DocumentReader's header
 * via its onDelete prop.
 */

import { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSessions } from "@/hooks/useSessions";
import { useDistractions } from "@/hooks/useDistractions";
import { useReports } from "@/hooks/useReports";
import { useStudyLibrary } from "@/hooks/useStudyLibrary";
import { useProjects } from "@/hooks/useProjects";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { useProjectNotes } from "@/hooks/useProjectNotes";
import { useProjectActivity } from "@/hooks/useProjectActivity";
import { useRecents } from "@/hooks/useRecents";
import { searchDocuments, SearchResult } from "@/lib/search-engine";
import { groupReportsByRecency } from "@/lib/report-engine";
import { ReportCard } from "@/components/documents/report-card";
import { DocumentReader } from "@/components/documents/document-reader";
import { AddStudyItemModal } from "@/components/documents/add-study-item-modal";
import { StudyTopicGroup } from "@/components/documents/study-topic-group";
import { ViewableDocument, ReportRecord } from "@/types/document";
import { FileText, BookOpen, Plus, Search, ChevronRight, FolderKanban, ListTodo, StickyNote, Activity as ActivityIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "reports" | "library";

const RESULT_ICON: Record<SearchResult["kind"], typeof FileText> = {
  report: FileText,
  study: BookOpen,
  project: FolderKanban,
  "project-task": ListTodo,
  "project-note": StickyNote,
  "project-activity": ActivityIcon,
};

const RESULT_LABEL: Record<SearchResult["kind"], string> = {
  report: "Report",
  study: "Study",
  project: "Project",
  "project-task": "Task",
  "project-note": "Note",
  "project-activity": "Activity",
};

// A recency bucket ("This week", "This month", "Earlier") rendered with the
// shared grouped-list-with-counts primitive (design brief §11) — same
// treatment as App Rules and Study Library, so Reports doesn't reintroduce
// its own header style.
function ReportRecencyGroup({
  label,
  reports,
  onView,
  onDelete,
}: {
  label: string;
  reports: ReportRecord[];
  onView: (r: ReportRecord) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="grouped-list">
      <button className="grouped-list-header" onClick={() => setOpen((o) => !o)}>
        <span className="grouped-list-title">{label}</span>
        <span className="grouped-list-count">{reports.length}</span>
        <ChevronRight className={cn("grouped-list-chevron", open && "grouped-list-chevron--open")} />
      </button>
      {open && (
        <div>
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} onView={() => onView(r)} onDelete={() => onDelete(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsPageInner />
    </Suspense>
  );
}

function DocumentsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { sessions } = useSessions();
  const { distractions } = useDistractions();
  const { reports, generateReport, deleteReport } = useReports(sessions, distractions);
  const { items: studyItems, addItem, updateItem, deleteItem, groupedByTopic } = useStudyLibrary();
  const { projects } = useProjects();
  const { tasks: projectTasks } = useProjectTasks();
  const { notes: projectNotes } = useProjectNotes();
  const { entries: projectActivity } = useProjectActivity();

  const tab = (searchParams.get("tab") as Tab) ?? "reports";
  const openId = searchParams.get("open");
  const addOpen = searchParams.get("add") === "1";
  const [query, setQuery] = useState("");

  function setTab(next: Tab) {
    router.push(`/documents?tab=${next}`);
  }

  function openDoc(doc: ViewableDocument) {
    const id = doc.kind === "report" ? doc.record.id : doc.item.id;
    router.push(`/documents?tab=${tab}&open=${id}`);
  }

  function closeDoc() {
    router.push(`/documents?tab=${tab}`);
  }

  function closeAddModal() {
    router.push(`/documents?tab=${tab}`);
  }

  // Resolve the open doc from the id in the URL (survives refresh/back-forward).
  const openDocument: ViewableDocument | null = useMemo(() => {
    if (!openId) return null;
    const report = reports.find((r) => r.id === openId);
    if (report) return { kind: "report", record: report };
    const item = studyItems.find((i) => i.id === openId);
    if (item) return { kind: "study-item", item };
    return null;
  }, [openId, reports, studyItems]);

  const { recordOpen } = useRecents();

  // Sidebar Recents — same pattern as app/projects/page.tsx's project
  // recording: fires once per distinct opened document, regardless of
  // entry point (rail nav, command palette, in-page search).
  useEffect(() => {
    if (!openDocument) return;
    if (openDocument.kind === "report") {
      recordOpen({
        id: openDocument.record.id,
        kind: "report",
        label: openDocument.record.data.periodLabel,
        href: `/documents?tab=reports&open=${openDocument.record.id}`,
      });
    } else {
      recordOpen({
        id: openDocument.item.id,
        kind: "study-item",
        label: openDocument.item.title,
        href: `/documents?tab=library&open=${openDocument.item.id}`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDocument?.kind === "report" ? openDocument.record.id : openDocument?.item.id]);

  const searchResults = useMemo(
    () => searchDocuments(query, { reports, studyItems, projects, projectTasks, projectNotes, projectActivity }),
    [query, reports, studyItems, projects, projectTasks, projectNotes, projectActivity],
  );

  const reportGroups = groupReportsByRecency(reports);
  const topics = Array.from(groupedByTopic().entries());

  const isSearching = query.trim().length > 0;

  // ── Open document takes over the workspace pane entirely ─────────────────
  if (openDocument) {
    return (
      <DocumentReader
        document={openDocument}
        onBack={closeDoc}
        onSaveStudyItem={(id, patch) => updateItem(id, patch)}
        onDelete={() => {
          if (openDocument.kind === "report") deleteReport(openDocument.record.id);
          else deleteItem(openDocument.item.id);
          closeDoc();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-5 p-7 pb-10">
      <header className="flex items-end justify-between pt-1">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em]" style={{ color: "var(--accent-primary)" }}>
            Productivity Memory
          </p>
          <h1 className="mt-0.5 text-[22px] font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Documents</h1>
        </div>
      </header>

      {/* Search bar — real, wired to lib/search-engine.ts */}
      <div className="app-card flex items-center gap-3 !p-3">
        <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reports, notes, references, projects…"
          className="w-full bg-transparent text-[13px] focus:outline-none"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      {isSearching ? (
        <Card title="Search results" eyebrow={`${searchResults.length} match${searchResults.length !== 1 ? "es" : ""}`}>
          {searchResults.length === 0 ? (
            <p className="py-6 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>Nothing matches &ldquo;{query}&rdquo; yet.</p>
          ) : (
            <div className="flow-list">
              {searchResults.map((r) => {
                const Icon = RESULT_ICON[r.kind];
                return (
                  <button
                    key={`${r.kind}-${r.id}`}
                    className="flow-row flow-row--interactive w-full text-left"
                    onClick={() => {
                      if (r.kind === "report") {
                        const report = reports.find((rec) => rec.id === r.id);
                        if (report) openDoc({ kind: "report", record: report });
                      } else if (r.kind === "study") {
                        const item = studyItems.find((i) => i.id === r.id);
                        if (item) openDoc({ kind: "study-item", item });
                      } else if (r.kind === "project") {
                        router.push(`/projects?open=${r.id}&tab=overview`);
                      } else if (r.kind === "project-task") {
                        router.push(`/projects?open=${r.projectId}&tab=tasks`);
                      } else if (r.kind === "project-note") {
                        router.push(`/projects?open=${r.projectId}&tab=notes&note=${r.id}`);
                      } else if (r.kind === "project-activity") {
                        router.push(`/projects?open=${r.projectId}&tab=activity`);
                      }
                    }}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>{r.title}</p>
                      <p className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>{r.subtitle}</p>
                    </div>
                    <span className="font-mono text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>{RESULT_LABEL[r.kind]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1.5 rounded-lg border p-1" style={{ borderColor: "var(--border-subtle)" }}>
            {([
              { id: "reports" as Tab, label: "Reports", icon: FileText },
              { id: "library" as Tab, label: "Study Library", icon: BookOpen },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 font-mono text-[11px] uppercase tracking-wide transition-colors"
                style={tab === t.id ? { color: "var(--accent-primary)" } : { color: "var(--text-muted)" }}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {tab === "reports" && (
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>Reports</p>
                  <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>Weekly · Monthly, grouped by when they were generated</p>
                </div>
                <div className="flex flex-shrink-0 gap-1.5">
                  <Button variant="outline" onClick={() => generateReport("weekly")} className="!px-2.5 !py-1.5 !text-[10px]">
                    <Plus className="h-3 w-3" /> Weekly
                  </Button>
                  <Button variant="outline" onClick={() => generateReport("monthly")} className="!px-2.5 !py-1.5 !text-[10px]">
                    <Plus className="h-3 w-3" /> Monthly
                  </Button>
                </div>
              </div>

              {reportGroups.length === 0 ? (
                <div className="quiet-empty">
                  <FileText className="mb-1 h-6 w-6" style={{ color: "var(--text-muted)" }} />
                  <p className="quiet-empty-title">No reports yet</p>
                  <p className="quiet-empty-sub">Generate a weekly or monthly report from your tracked sessions.</p>
                </div>
              ) : (
                <div>
                  {reportGroups.map((g) => (
                    <ReportRecencyGroup
                      key={g.label}
                      label={g.label}
                      reports={g.reports}
                      onView={(r) => openDoc({ kind: "report", record: r })}
                      onDelete={deleteReport}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab === "library" && (
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>Study Library</p>
                  <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>Notes · PDFs · Links · References</p>
                </div>
                <Button variant="outline" onClick={() => router.push("/documents?tab=library&add=1")} className="!px-2.5 !py-1.5 !text-[10px]">
                  <Plus className="h-3 w-3" /> Add material
                </Button>
              </div>

              {topics.length === 0 ? (
                <div className="quiet-empty">
                  <BookOpen className="mb-1 h-6 w-6" style={{ color: "var(--text-muted)" }} />
                  <p className="quiet-empty-title">No study materials yet</p>
                  <p className="quiet-empty-sub">Add notes, PDFs, links and references, grouped by topic.</p>
                </div>
              ) : (
                <div>
                  {topics.map(([topic, items]) => (
                    <StudyTopicGroup
                      key={topic}
                      topic={topic}
                      items={items}
                      onOpen={(item) => openDoc({ kind: "study-item", item })}
                      onDelete={deleteItem}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      <AddStudyItemModal open={addOpen} onClose={closeAddModal} onSubmit={addItem} />
    </div>
  );
}
