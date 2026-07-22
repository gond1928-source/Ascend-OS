"use client";

/**
 * CommandPalette — Cmd/Ctrl+K global navigation + actions (design brief §1).
 *
 * First-class navigation method: every destination reachable via a rail/
 * sidebar click is reachable here too, plus a few real actions (generate a
 * report, start/stop monitoring, add a study item) and jump-to-item entries
 * for recent reports and study materials. Actions reuse the exact same
 * hooks/engines the real pages use (useReports, useStudyLibrary,
 * useNativeTracker) — nothing about session/report/tracker logic is
 * reimplemented here, only invoked.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home, Target, BarChart3, FileText, BookOpen, Settings,
  History, Timer, Trophy, Share2, Users, Play, Square, Plus, Search, FolderKanban,
} from "lucide-react";
import { useShell } from "@/hooks/useShell";
import { useSessions } from "@/hooks/useSessions";
import { useDistractions } from "@/hooks/useDistractions";
import { useReports } from "@/hooks/useReports";
import { useStudyLibrary } from "@/hooks/useStudyLibrary";
import { useNativeTracker } from "@/hooks/useNativeTracker";
import { useSettings } from "@/hooks/useSettings";
import { useProjects } from "@/hooks/useProjects";

interface PaletteItem {
  id: string;
  label: string;
  sub?: string;
  icon: React.ElementType;
  section: "Navigate" | "Actions" | "Reports" | "Study library" | "Projects";
  run: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPalette } = useShell();
  const { isOpen, close } = commandPalette;
  const { settings } = useSettings();
  // Capabilities → "Command palette" (Settings → Capabilities). Gates BOTH
  // the global Cmd/Ctrl+K listener below AND rendering of the overlay
  // itself — so any current or future trigger (a toggle button, a menu
  // item, ...) that calls commandPalette.open()/toggle() is automatically
  // covered too, since this component is the only thing that ever renders
  // the palette regardless of how isOpen became true.
  const paletteEnabled = settings.capabilities.commandPaletteEnabled;

  const { sessions, addSession } = useSessions();
  const { distractions, addDistraction } = useDistractions();
  const { reports, generateReport } = useReports(sessions, distractions);
  const { items: studyItems } = useStudyLibrary();
  const { activeProjects } = useProjects();

  const { isRunning, start, stop } = useNativeTracker(
    (drafts) => drafts.forEach((d) => addSession(d)),
    (drafts) => drafts.forEach((d) => addDistraction(d)),
  );

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd/Ctrl+K listener — no-op entirely when the capability is off.
  useEffect(() => {
    if (!paletteEnabled) return;

    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        commandPalette.toggle();
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandPalette, isOpen, close, paletteEnabled]);

  // If the capability is turned off while the palette happens to be open,
  // close it immediately rather than leaving a now-disabled feature
  // stranded on screen.
  useEffect(() => {
    if (!paletteEnabled && isOpen) close();
  }, [paletteEnabled, isOpen, close]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const items = useMemo<PaletteItem[]>(() => {
    const nav: PaletteItem[] = [
      { id: "nav-home",     label: "Home",           icon: Home,        section: "Navigate", run: () => router.push("/dashboard") },
      { id: "nav-focus",    label: "Focus",          sub: "Monitoring", icon: Target,      section: "Navigate", run: () => router.push("/monitoring") },
      { id: "nav-analytics",label: "Analytics",      icon: BarChart3,   section: "Navigate", run: () => router.push("/analytics") },
      { id: "nav-reports",  label: "Reports",        sub: "Documents",  icon: FileText,    section: "Navigate", run: () => router.push("/documents?tab=reports") },
      { id: "nav-library",  label: "Library",        sub: "Documents",  icon: BookOpen,    section: "Navigate", run: () => router.push("/documents?tab=library") },
      { id: "nav-projects", label: "Projects",       icon: FolderKanban,section: "Navigate", run: () => router.push("/projects") },
      { id: "nav-sessions", label: "Sessions",       icon: History,     section: "Navigate", run: () => router.push("/sessions") },
      { id: "nav-timer",    label: "Timer",          icon: Timer,       section: "Navigate", run: () => router.push("/timer") },
      { id: "nav-achieve",  label: "Achievements",   icon: Trophy,      section: "Navigate", run: () => router.push("/achievements") },
      { id: "nav-share",    label: "Share",          icon: Share2,      section: "Navigate", run: () => router.push("/share") },
      { id: "nav-friends",  label: "Friends",        icon: Users,       section: "Navigate", run: () => router.push("/friends") },
      { id: "nav-settings", label: "Settings",       icon: Settings,    section: "Navigate", run: () => router.push("/settings") },
    ];

    const actions: PaletteItem[] = [
      isRunning
        ? { id: "action-stop-monitor",  label: "Stop monitoring",  icon: Square, section: "Actions", run: () => stop() }
        : { id: "action-start-monitor", label: "Start monitoring", icon: Play,   section: "Actions", run: () => start() },
      { id: "action-gen-weekly",  label: "Generate weekly report",  icon: Plus, section: "Actions", run: () => { generateReport("weekly"); router.push("/documents?tab=reports"); } },
      { id: "action-gen-monthly", label: "Generate monthly report", icon: Plus, section: "Actions", run: () => { generateReport("monthly"); router.push("/documents?tab=reports"); } },
      { id: "action-add-study",  label: "Add study item",          icon: Plus, section: "Actions", run: () => router.push("/documents?tab=library&add=1") },
      { id: "action-new-project", label: "New project",            icon: Plus, section: "Actions", run: () => router.push("/projects?new=1") },
    ];

    const projectItems: PaletteItem[] = [...activeProjects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6)
      .map((p) => ({
        id: `project-${p.id}`,
        label: p.name,
        sub: "Project",
        icon: FolderKanban,
        section: "Projects" as const,
        run: () => router.push(`/projects?open=${p.id}&tab=overview`),
      }));

    const reportItems: PaletteItem[] = [...reports]
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, 6)
      .map((r) => ({
        id: `report-${r.id}`,
        label: `${r.period === "weekly" ? "Weekly" : "Monthly"} report`,
        sub: new Date(r.generatedAt).toLocaleDateString(),
        icon: FileText,
        section: "Reports" as const,
        run: () => router.push(`/documents?tab=reports&open=${r.id}`),
      }));

    const studyItemEntries: PaletteItem[] = [...studyItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
      .map((it) => ({
        id: `study-${it.id}`,
        label: it.title,
        sub: it.topic,
        icon: BookOpen,
        section: "Study library" as const,
        run: () => router.push(`/documents?tab=library&open=${it.id}`),
      }));

    return [...nav, ...actions, ...reportItems, ...studyItemEntries, ...projectItems];
  }, [router, isRunning, start, stop, generateReport, reports, studyItems, activeProjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      i.label.toLowerCase().includes(q) || i.sub?.toLowerCase().includes(q),
    );
  }, [items, query]);

  const sections = useMemo(() => {
    const order: PaletteItem["section"][] = ["Navigate", "Actions", "Projects", "Reports", "Study library"];
    return order
      .map((section) => ({ section, entries: filtered.filter((i) => i.section === section) }))
      .filter((g) => g.entries.length > 0);
  }, [filtered]);

  useEffect(() => setActiveIndex(0), [query]);

  if (!paletteEnabled || !isOpen) return null;

  function runItem(item: PaletteItem) {
    item.run();
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) runItem(filtered[activeIndex]);
    }
  }

  let runningIndex = -1;

  return (
    <div className="cmdk-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="cmdk-panel" onKeyDown={onKeyDown}>
        <div className="cmdk-input-row">
          <Search className="h-4 w-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Navigate or run a command…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="cmdk-kbd">Esc</span>
        </div>
        <div className="cmdk-list">
          {sections.length === 0 && <div className="cmdk-empty">No matches for &ldquo;{query}&rdquo;</div>}
          {sections.map(({ section, entries }) => (
            <div key={section}>
              <div className="cmdk-section-label">{section}</div>
              {entries.map((item) => {
                runningIndex += 1;
                const idx = runningIndex;
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className={`cmdk-item${idx === activeIndex ? " cmdk-item--active" : ""}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => runItem(item)}
                  >
                    <Icon className="cmdk-item-icon" />
                    <span>{item.label}</span>
                    {item.sub && <span className="cmdk-item-sub">{item.sub}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
