"use client";

/**
 * QuickActionsBar — Dashboard, near the top (Phase 2 brief). Small,
 * equal-weight action buttons: Start/Stop Monitoring, Generate Report, Add
 * Study Item, Open Command Palette.
 *
 * Built with plain CSS reading design tokens directly (var(--accent-primary)
 * etc.) rather than the shared Button component — Button's "primary"
 * variant reads the hardcoded `accent-violet` Tailwind alias (the flagged
 * bug — see handoff notes) and its "outline"/"ghost" variants still use
 * the legacy cool-tinted `ink-*`/`base-*` palette (design brief §2's
 * flagged technical debt). Same sidestep this codebase already used for
 * Settings — avoids depending on either issue rather than fixing them,
 * which is out of scope for this phase.
 *
 * Monitoring start/stop is passed in as props rather than this component
 * calling useNativeTracker() itself — see current-state.tsx's header for
 * why a second independent tracker subscription on the same page would be
 * a real double-commit bug. Dashboard owns the one subscription.
 */

import { useRouter } from "next/navigation";
import { Play, Square, FileText, BookOpen, Command } from "lucide-react";
import { useShell } from "@/hooks/useShell";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

export interface QuickActionsBarProps {
  isMonitoringRunning: boolean;
  onStartMonitoring: () => void;
  onStopMonitoring: () => void;
  onGenerateReport: () => void;
}

export function QuickActionsBar({
  isMonitoringRunning, onStartMonitoring, onStopMonitoring, onGenerateReport,
}: QuickActionsBarProps) {
  const router = useRouter();
  const { commandPalette } = useShell();
  const { settings } = useSettings();

  return (
    <div className="quick-actions-bar">
      <button
        type="button"
        className={cn("quick-action-btn", "quick-action-btn--primary", isMonitoringRunning && "quick-action-btn--primary-active")}
        onClick={isMonitoringRunning ? onStopMonitoring : onStartMonitoring}
      >
        {isMonitoringRunning ? <Square className="quick-action-icon" /> : <Play className="quick-action-icon" />}
        {isMonitoringRunning ? "Stop monitoring" : "Start monitoring"}
      </button>

      <button type="button" className="quick-action-btn quick-action-btn--secondary" onClick={onGenerateReport}>
        <FileText className="quick-action-icon" />
        Generate report
      </button>

      <button
        type="button"
        className="quick-action-btn quick-action-btn--secondary"
        onClick={() => router.push("/documents?tab=library&add=1")}
      >
        <BookOpen className="quick-action-icon" />
        Add study item
      </button>

      {/* Omitted entirely (not just disabled) when the capability is off —
          Settings → Capabilities (Phase 1). CommandPalette itself renders
          null while disabled, so a visible-but-inert button here would be
          confusing rather than just absent. */}
      {settings.capabilities.commandPaletteEnabled && (
        <button type="button" className="quick-action-btn quick-action-btn--secondary" onClick={commandPalette.open}>
          <Command className="quick-action-icon" />
          Command palette
        </button>
      )}
    </div>
  );
}
