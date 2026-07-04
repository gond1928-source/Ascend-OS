"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BarChart3,
  History,
  Trophy,
  Settings,
  Zap,
  Timer,
} from "lucide-react";
import { useSessions } from "@/hooks/useSessions";
import { useXP } from "@/hooks/useXP";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/analytics",    label: "Analytics",    icon: BarChart3 },
  { href: "/sessions",     label: "Sessions",     icon: History },
  { href: "/timer",        label: "Timer",        icon: Timer },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/settings",     label: "Settings",     icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sessions } = useSessions();
  const xp = useXP(sessions);
  const pct = Math.min(
    100,
    (xp.xpIntoLevel / Math.max(1, xp.xpIntoLevel + xp.xpToNextLevel)) * 100
  );

  return (
    <aside className="app-sidebar">
      {/* Top accent line */}
      <div className="sidebar-accent-line" />

      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap className="sidebar-logo-zap" />
        </div>
        <span className="sidebar-logo-name">ascend</span>
        <span className="sidebar-logo-tag">os</span>
      </div>

      {/* Divider */}
      <div className="sidebar-divider" />

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn("sidebar-nav-item", active && "sidebar-nav-item--active")}
            >
              {active && <span className="sidebar-nav-indicator" />}
              <Icon className={cn("sidebar-nav-icon", active && "sidebar-nav-icon--active")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <div className="sidebar-theme">
        <p className="sidebar-section-label">Theme</p>
        <ThemeToggle />
      </div>

      {/* XP / level */}
      <div className="sidebar-xp">
        <div className="sidebar-xp-header">
          <span className="sidebar-xp-label">Level {xp.level}</span>
          <span className="sidebar-xp-value">{xp.xp.toLocaleString()} XP</span>
        </div>
        <div className="sidebar-xp-track">
          <div className="sidebar-xp-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="sidebar-status">
          <span className="sidebar-status-dot" />
          <p className="sidebar-status-text">ActivityWatch: offline</p>
        </div>
      </div>
    </aside>
  );
}
