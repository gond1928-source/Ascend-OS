"use client";

/**
 * RecentWorkspaces — Today View "recent workspaces" region (design brief
 * §7), now tabbed (Phase 2): Reports / Study Items / All, in the same
 * space a single merged list used to occupy. Plain text tabs (no boxed
 * pill group) to match the rest of the Dashboard's hairline-only styling
 * — the active tab reads via accent color + underline, nothing else.
 */

import { useState } from "react";
import Link from "next/link";
import { FileText, BookOpen, Inbox } from "lucide-react";
import { ReportRecord, StudyItem } from "@/types/document";
import { formatRelativeTime } from "@/lib/utils";

type WorkspaceEntry =
  | { kind: "report"; data: ReportRecord }
  | { kind: "study"; data: StudyItem };

type WorkspaceTab = "all" | "reports" | "study";

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "reports", label: "Reports" },
  { id: "study", label: "Study Items" },
];

export function RecentWorkspaces({ reports, studyItems }: { reports: ReportRecord[]; studyItems: StudyItem[] }) {
  const [tab, setTab] = useState<WorkspaceTab>("all");

  const allEntries: WorkspaceEntry[] = [
    ...reports.map((r) => ({ kind: "report", data: r } as WorkspaceEntry)),
    ...studyItems.map((i) => ({ kind: "study", data: i } as WorkspaceEntry)),
  ].sort((a, b) => {
    const aDate = a.kind === "report" ? a.data.generatedAt : a.data.createdAt;
    const bDate = b.kind === "report" ? b.data.generatedAt : b.data.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  const entries = (
    tab === "all" ? allEntries
    : tab === "reports" ? allEntries.filter((e) => e.kind === "report")
    : allEntries.filter((e) => e.kind === "study")
  ).slice(0, 6);

  return (
    <div>
      <div className="workspace-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "workspace-tab workspace-tab--active" : "workspace-tab"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="quiet-empty">
          <Inbox className="quiet-empty-icon" />
          <p className="quiet-empty-title">
            {tab === "reports" ? "No reports yet" : tab === "study" ? "No study items yet" : "No reports or study materials yet"}
          </p>
          <p className="quiet-empty-sub">Generate a report or add a study item from Documents.</p>
        </div>
      ) : (
        <div>
          {entries.map((entry) => {
            const isReport = entry.kind === "report";
            const href = isReport
              ? `/documents?tab=reports&open=${entry.data.id}`
              : `/documents?tab=library&open=${entry.data.id}`;
            const period = isReport ? (entry.data as ReportRecord).period : null;
            const title = isReport
              ? (entry.data as ReportRecord).data.periodLabel
              : (entry.data as StudyItem).title;
            const date = isReport ? (entry.data as ReportRecord).generatedAt : (entry.data as StudyItem).createdAt;
            const Icon = isReport ? FileText : BookOpen;

            return (
              <Link key={`${entry.kind}-${entry.data.id}`} href={href} className="workspace-row">
                <Icon className="workspace-row-icon" />
                <span className="workspace-row-title">{title}</span>
                {period && (
                  <span className="workspace-row-tag">{period === "weekly" ? "Weekly" : "Monthly"}</span>
                )}
                <span className="workspace-row-meta">{formatRelativeTime(date)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
