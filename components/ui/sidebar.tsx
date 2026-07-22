"use client";

/**
 * Sidebar — the single persistent, always-labeled shell nav (design brief
 * §1, single-sidebar shell). Replaces the old two-piece icon-rail +
 * contextual-sidebar setup.
 *
 * The old setup had a real, confirmed redundancy: navigating into Projects
 * opened a contextual sidebar showing the exact same project list (name +
 * task count) that the /projects workspace itself already rendered, at the
 * same time. Collapsing to one sidebar removes that duplication rather
 * than papering over it — Projects is now a plain nav link like Home/
 * Focus/Analytics, and owns 100% of the main pane once you're there (see
 * app/projects/page.tsx's own search/sort for how it stands on its own
 * without a sidebar list backing it up).
 *
 * Fixed width, no collapse — this app has exactly one persistent nav
 * surface now, so there's no icon-only state to collapse *into*.
 *
 * Layout, top to bottom: brand (icon + wordmark) → primary nav (icon +
 * label rows) → Recents (recently opened projects/documents) → spacer →
 * hairline divider → identity block. Clicking the identity block opens a
 * small dropdown: Settings, Notifications, Customize — the dropdown is the
 * only entry point for all three, folding in what used to be a separate
 * top-right floating Bell + Customize cluster (top-bar-actions.tsx,
 * removed). Notifications/Customize open as nested flyouts reusing the
 * exact same panel content that cluster had (NotificationsPanelBody /
 * ThemeToggle) — only the trigger and anchor position changed.
 *
 * Unread notifications still get a passive glance-cue even though the
 * bell is no longer persistently visible: a small dot on the identity
 * avatar, driven by the same useNotifications().unreadCount every other
 * notification UI already reads.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSessions } from "@/hooks/useSessions";
import { useXP } from "@/hooks/useXP";
import { useRecents } from "@/hooks/useRecents";
import { useNotifications } from "@/hooks/useNotifications";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationRecord, NotificationKind } from "@/types/notification";
import { RecentKind } from "@/types/recent";
import {
  Zap, Home, Target, BarChart3, FolderKanban, FileText, BookOpen, Settings,
  Bell, Settings2, ChevronRight, ChevronsUpDown,
} from "lucide-react";

const RECENT_ICON: Record<RecentKind, typeof FolderKanban> = {
  project: FolderKanban,
  report: FileText,
  "study-item": BookOpen,
};

const KIND_ICON: Record<NotificationKind, React.ElementType> = {
  "report-generated": FileText,
  "study-item-added": BookOpen,
  "resource-added": FolderKanban,
  "streak-milestone": Zap,
  "export-completed": FileText,
};

function toDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Design brief §11 grouped-list pattern: "Today / Earlier" section
 * headers with counts, flush hairline-divided rows underneath. */
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

function NotificationsFlyoutBody({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { notifications, isLoading, markRead, markAllRead } = useNotifications();

  if (isLoading) return null;

  if (notifications.length === 0) {
    return (
      <div className="flyout-panel-empty">
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
        <p className="flyout-panel-title" style={{ marginBottom: 0 }}>Notifications</p>
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessions } = useSessions();
  const xp = useXP(sessions);
  const { recents } = useRecents();
  const { unreadCount } = useNotifications();
  const { theme } = useTheme();
  const { settings } = useSettings();

  // Identity block text — General settings' displayName (set once someone
  // fills it in) becomes the primary line, same slot that used to always
  // show the rank title. Rank moves to the subtitle alongside Level so it
  // stays visible either way, just no longer doubling as the "name".
  const displayName = settings.general.displayName.trim();
  const identityName = displayName || "You";

  // Identity dropdown (Settings / Notifications / Customize) and its two
  // nested flyouts — the only entry point for all three now.
  const [identityMenuOpen, setIdentityMenuOpen] = useState(false);
  const [flyout, setFlyout] = useState<"notifications" | "customize" | null>(null);
  const identityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (identityRef.current && !identityRef.current.contains(e.target as Node)) {
        setIdentityMenuOpen(false);
        setFlyout(null);
      }
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  function closeIdentityMenu() {
    setIdentityMenuOpen(false);
    setFlyout(null);
  }

  const docsTab = searchParams?.get("tab") ?? "reports";
  const onDocuments = pathname?.startsWith("/documents");

  const xpPct = Math.min(
    100,
    Math.round((xp.xpIntoLevel / Math.max(1, xp.xpIntoLevel + xp.xpToNextLevel)) * 100),
  );

  const NAV = [
    { key: "home",     href: "/dashboard",              icon: Home,        label: "Home",
      active: pathname?.startsWith("/dashboard") },
    { key: "focus",    href: "/monitoring",              icon: Target,      label: "Focus",
      active: pathname?.startsWith("/monitoring") || pathname?.startsWith("/timer") },
    { key: "analytics",href: "/analytics",               icon: BarChart3,   label: "Analytics",
      active: pathname?.startsWith("/analytics") },
    { key: "reports",  href: "/documents?tab=reports",   icon: FileText,    label: "Reports",
      active: onDocuments && docsTab === "reports" },
    { key: "library",  href: "/documents?tab=library",   icon: BookOpen,    label: "Library",
      active: onDocuments && docsTab === "library" },
    { key: "projects", href: "/projects",                icon: FolderKanban,label: "Projects",
      active: pathname?.startsWith("/projects") },
  ] as const;

  return (
    <div className="app-sidebar">
      {/* Brand */}
      <Link href="/dashboard" className="app-sidebar-brand">
        <span className="app-sidebar-brand-icon">
          <Zap className="h-[15px] w-[15px]" />
        </span>
        <span className="app-sidebar-brand-name">Ascend OS</span>
      </Link>

      {/* Primary nav */}
      <nav className="app-sidebar-nav">
        {NAV.map(({ key, href, icon: Icon, label, active }) => (
          <Link
            key={key}
            href={href}
            className={cn("app-sidebar-nav-item", active && "app-sidebar-nav-item--active")}
          >
            {active && <span className="app-sidebar-nav-indicator" />}
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Recents — recently opened projects/documents. Project planning
          notes don't get their own entries (they're opened from inside a
          project, not a top-level surface); the parent project's entry
          already covers that. */}
      {recents.length > 0 && (
        <div className="app-sidebar-section">
          <p className="app-sidebar-section-label">Recents</p>
          {recents.slice(0, 5).map((r) => {
            const Icon = RECENT_ICON[r.kind];
            return (
              <button
                key={`${r.kind}-${r.id}`}
                className="app-sidebar-recent-row"
                title={r.label}
                onClick={() => router.push(r.href)}
              >
                <Icon />
                <span className="app-sidebar-recent-label">{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="app-sidebar-spacer" />

      {/* Identity block — quiet, persistent XP/rank display, and the only
          entry point to Settings/Notifications/Customize. */}
      <div ref={identityRef} className="app-sidebar-identity-wrap">
        <button
          type="button"
          className="app-sidebar-identity"
          onClick={() => setIdentityMenuOpen((v) => !v)}
        >
          <span className="app-sidebar-identity-ring" style={{ "--xp-pct": xpPct } as React.CSSProperties}>
            <span className="app-sidebar-identity-avatar">{xp.level}</span>
            {unreadCount > 0 && <span className="app-sidebar-identity-unread" aria-hidden />}
          </span>
          <span className="app-sidebar-identity-text">
            <span className="app-sidebar-identity-name">{identityName}</span>
            <span className="app-sidebar-identity-sub">{xp.rank} · Level {xp.level}</span>
          </span>
          <ChevronsUpDown className="app-sidebar-identity-chevron" />
        </button>

        {identityMenuOpen && (
          <div className="app-sidebar-identity-menu">
            <button
              type="button"
              className="app-sidebar-identity-menu-item"
              onClick={() => {
                closeIdentityMenu();
                router.push("/settings");
              }}
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </button>

            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="app-sidebar-identity-menu-item"
                onClick={() => setFlyout((f) => (f === "notifications" ? null : "notifications"))}
              >
                <Bell className="h-3.5 w-3.5" />
                Notifications
                {unreadCount > 0 && <span className="notification-unread-dot" style={{ marginLeft: "auto" }} />}
              </button>
              {flyout === "notifications" && (
                <div className="flyout-panel flyout-panel--notifications">
                  <NotificationsFlyoutBody onNavigate={closeIdentityMenu} />
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="app-sidebar-identity-menu-item"
                onClick={() => setFlyout((f) => (f === "customize" ? null : "customize"))}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Customize
              </button>
              {flyout === "customize" && (
                <div className="flyout-panel flyout-panel--wide">
                  <p className="flyout-panel-title">Appearance</p>
                  <ThemeToggle />
                  <p className="flyout-panel-hint">
                    Currently using <strong>{theme === "dark" ? "Dark" : "Glass"}</strong>. Your choice is
                    saved automatically and becomes the default the next time you open Ascend OS.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
