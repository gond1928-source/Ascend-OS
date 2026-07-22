"use client";

/**
 * TopBarActions — floating "Customize" + "Notifications" controls,
 * pinned to the top-right of the main content area on every page.
 *
 * Theme switching used to live in the sidebar footer; it now lives here,
 * inside the Customize panel, matching where the reference dashboard
 * puts its "Customize" button. Selecting a theme still saves it via
 * ThemeProvider's existing localStorage persistence, so whatever you
 * pick here is automatically what loads next time — no separate
 * "set as default" action needed.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2, Bell, FileText, BookOpen, FolderKanban, Trophy, Download, ChevronRight } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationRecord, NotificationKind } from "@/types/notification";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<NotificationKind, React.ElementType> = {
  "report-generated": FileText,
  "study-item-added": BookOpen,
  "resource-added": FolderKanban,
  "streak-milestone": Trophy,
  "export-completed": Download,
};

function toDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Design brief §11 grouped-list pattern: "Today / Earlier" section headers
 * with counts, flush hairline-divided rows underneath — same primitive
 * (.grouped-list*) Documents/App Rules already use, not a bespoke look. */
function groupByRecency(items: NotificationRecord[]): { label: string; entries: NotificationRecord[] }[] {
  const todayKey = toDateKey(new Date().toISOString());
  const today = items.filter((n) => toDateKey(n.createdAt) === todayKey);
  const earlier = items.filter((n) => toDateKey(n.createdAt) !== todayKey);
  return [
    { label: "Today", entries: today },
    { label: "Earlier", entries: earlier },
  ].filter((g) => g.entries.length > 0);
}

function NotificationRow({ entry, onOpen }: { entry: NotificationRecord; onOpen: (entry: NotificationRecord) => void }) {
  const Icon = KIND_ICON[entry.kind];
  return (
    <button
      className="flow-row flow-row--interactive notification-row"
      style={{ width: "100%", textAlign: "left", background: "none", border: "none" }}
      onClick={() => onOpen(entry)}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          className="font-mono text-[11px]"
          style={{ color: entry.read ? "var(--text-secondary)" : "var(--text-primary)", fontWeight: entry.read ? 400 : 600 }}
        >
          {entry.title}
        </p>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{entry.subtitle}</p>
      </div>
      {!entry.read && <span className="notification-unread-dot" aria-hidden />}
    </button>
  );
}

function NotificationsPanelBody({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { notifications, isLoading, markRead, markAllRead } = useNotifications();

  if (isLoading) return null;

  if (notifications.length === 0) {
    return (
      <div className="topbar-panel-empty">
        <Bell className="h-5 w-5 opacity-40" />
        <p>No new notifications yet</p>
      </div>
    );
  }

  const groups = groupByRecency(notifications);

  function open(entry: NotificationRecord) {
    markRead(entry.id);
    router.push(entry.path);
    onNavigate();
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <p className="topbar-panel-title" style={{ marginBottom: 0 }}>Notifications</p>
        <button
          className="font-mono text-[10px]"
          style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
          onClick={() => markAllRead()}
        >
          Mark all read
        </button>
      </div>
      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {groups.map((g) => (
          <GroupedSection key={g.label} label={g.label} entries={g.entries} onOpen={open} />
        ))}
      </div>
    </div>
  );
}

function GroupedSection({ label, entries, onOpen }: { label: string; entries: NotificationRecord[]; onOpen: (e: NotificationRecord) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="grouped-list">
      <button className="grouped-list-header" onClick={() => setOpen((o) => !o)}>
        <span className="grouped-list-title">{label}</span>
        <span className="grouped-list-count">{entries.length}</span>
        <ChevronRight className={cn("grouped-list-chevron", open && "grouped-list-chevron--open")} />
      </button>
      {open && entries.map((entry) => <NotificationRow key={entry.id} entry={entry} onOpen={onOpen} />)}
    </div>
  );
}

export function TopBarActions() {
  const [open, setOpen] = useState<"customize" | "notifications" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { unreadCount } = useNotifications();

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  return (
    <div ref={rootRef} className="topbar-actions">
      {/* Notifications */}
      <div className="topbar-item">
        <button
          className="topbar-btn topbar-icon-btn"
          style={{ position: "relative" }}
          onClick={() => setOpen((o) => (o === "notifications" ? null : "notifications"))}
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && <span className="notification-unread-dot notification-unread-dot--badge" aria-hidden />}
        </button>
        {open === "notifications" && (
          <div className="topbar-panel topbar-panel--right topbar-panel--notifications">
            <NotificationsPanelBody onNavigate={() => setOpen(null)} />
          </div>
        )}
      </div>

      {/* Customize */}
      <div className="topbar-item">
        <button
          className={cn("topbar-btn", open === "customize" && "topbar-btn--active")}
          onClick={() => setOpen((o) => (o === "customize" ? null : "customize"))}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Customize
        </button>
        {open === "customize" && (
          <div className="topbar-panel topbar-panel--right topbar-panel--wide">
            <p className="topbar-panel-title">Appearance</p>
            <ThemeToggle />
            <p className="topbar-panel-hint">
              Currently using <strong>{theme === "dark" ? "Dark" : "Glass"}</strong>. Your choice is
              saved automatically and becomes the default the next time you open Ascend OS.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
