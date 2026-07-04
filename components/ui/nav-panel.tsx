"use client";

/**
 * NavPanel — secondary sidebar (~220px).
 * Always visible. Contains: XP/level identity block at top,
 * then Dashboard/Analytics shortcuts, Projects, Status, History, and
 * Documents sections (placeholders for now).
 * Theme switching lives in the Customize panel (top-right), not here.
 *
 * Matches the reference's right-of-icon-rail sidebar panel.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSessions } from "@/hooks/useSessions";
import { useXP } from "@/hooks/useXP";
import {
  LayoutDashboard,
  BarChart3,
  FolderOpen,
  FileText,
  Circle,
  Bell,
  Users,
  Clock,
  Archive,
  Search,
  Plus,
  ChevronRight,
} from "lucide-react";

// ── Coming-soon badge ─────────────────────────────────────────────────────────
function SoonBadge() {
  return (
    <span className="ml-auto rounded-full bg-accent-violet/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-accent-violet/70">
      Soon
    </span>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionLabel({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="nav-section-label">
      <span>{label}</span>
      {action}
    </div>
  );
}

// ── Generic nav row ───────────────────────────────────────────────────────────
function NavRow({
  href, icon: Icon, label, count, comingSoon, muted,
}: {
  href?: string;
  icon?: React.ElementType;
  label: string;
  count?: number;
  comingSoon?: boolean;
  muted?: boolean;
}) {
  const pathname = usePathname();
  const active = href ? pathname?.startsWith(href) : false;
  const El = href ? Link : "div";

  return (
    <El
      href={href ?? "#"}
      className={cn(
        "nav-row",
        active && "nav-row--active",
        muted && "opacity-50",
        !href && "cursor-default",
      )}
    >
      {Icon && <Icon className="nav-row-icon" />}
      <span className="flex-1 truncate">{label}</span>
      {comingSoon && <SoonBadge />}
      {count !== undefined && !comingSoon && (
        <span className="nav-row-count">{count}</span>
      )}
    </El>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function NavPanel() {
  const { sessions } = useSessions();
  const xp = useXP(sessions);
  const pct = Math.min(
    100,
    (xp.xpIntoLevel / Math.max(1, xp.xpIntoLevel + xp.xpToNextLevel)) * 100,
  );

  return (
    <div className="nav-panel">

      {/* ── Identity block ─────────────────────────────────────────────────── */}
      <div className="nav-identity">
        <div className="nav-avatar">
          <span className="nav-avatar-initials">A</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="nav-identity-name">Ascend OS</p>
          <p className="nav-identity-sub">{xp.rank} · Lv {xp.level}</p>
        </div>
        <ChevronRight className="h-3 w-3 flex-shrink-0 text-ink-muted opacity-50" />
      </div>

      {/* XP bar */}
      <div className="nav-xp-track">
        <div className="nav-xp-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="nav-xp-label">{xp.xp.toLocaleString()} XP · {xp.xpToNextLevel.toLocaleString()} to next level</p>

      <div className="nav-divider" />

      {/* ── Dashboard shortcut ─────────────────────────────────────────────── */}
      <div className="nav-section">
        <NavRow href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavRow href="/analytics" icon={BarChart3} label="Analytics" />
      </div>

      <div className="nav-divider" />

      {/* ── Projects ───────────────────────────────────────────────────────── */}
      <div className="nav-section">
        <SectionLabel
          label="Projects"
          action={
            <button className="nav-section-action" title="New project" disabled>
              <Plus className="h-3 w-3" />
            </button>
          }
        />
        <NavRow icon={FolderOpen} label="System Management" count={12} comingSoon />
        <NavRow icon={FolderOpen} label="Fundamentals"      count={4}  comingSoon />
        <NavRow icon={FolderOpen} label="Off Grid Servers"  count={5}  comingSoon />
      </div>

      <div className="nav-divider" />

      {/* ── Status ─────────────────────────────────────────────────────────── */}
      <div className="nav-section">
        <SectionLabel label="Status" />
        <NavRow icon={Circle}     label="New"         count={3}  comingSoon />
        <NavRow icon={Bell}       label="Updates"     count={2}  comingSoon />
        <NavRow icon={Users}      label="Team Review"            comingSoon />
      </div>

      <div className="nav-divider" />

      {/* ── History ────────────────────────────────────────────────────────── */}
      <div className="nav-section">
        <SectionLabel label="History" />
        <NavRow icon={Clock}    label="Recently Edited" comingSoon />
        <NavRow icon={Archive}  label="Archive"         comingSoon />
      </div>

      <div className="nav-divider" />

      {/* ── Documents ──────────────────────────────────────────────────────── */}
      <div className="nav-section">
        <SectionLabel
          label="Documents"
          action={
            <button className="nav-section-action" title="New document" disabled>
              <Plus className="h-3 w-3" />
            </button>
          }
        />
        {/* Search */}
        <div className="nav-search">
          <Search className="h-3 w-3 flex-shrink-0 text-ink-muted" />
          <span className="text-ink-muted">Search…</span>
        </div>
        <NavRow href="/documents" icon={FileText} label="Analytics Reports" comingSoon />
        <NavRow href="/documents" icon={FileText} label="Study Library"     comingSoon />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />
    </div>
  );
}
