"use client";

/**
 * Monitoring page
 * Hosts the Native Activity Tracker and ActivityWatch controls.
 * All hook calls (useNativeTracker, useActivityWatch) and their logic
 * are 100% unchanged — only the render location changed from /settings.
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSessions } from "@/hooks/useSessions";
import { useActivityWatch } from "@/hooks/useActivityWatch";
import { useNativeTracker } from "@/hooks/useNativeTracker";
import { cn } from "@/lib/utils";
import {
  Trash2, RefreshCw, CheckCircle2, XCircle,
  Loader2, Monitor, Radio, AlertCircle,
} from "lucide-react";

// ── Shared status indicator ───────────────────────────────────────────────────

type DotStatus = "idle" | "running" | "connected" | "error" | "polling";

function StatusDot({ status }: { status: DotStatus }) {
  return (
    <span className={cn("inline-block h-2 w-2 flex-shrink-0 rounded-full", {
      "bg-base-600":                   status === "idle",
      "bg-accent-mint animate-pulse":  status === "running" || status === "connected",
      "bg-accent-amber animate-pulse": status === "polling",
      "bg-accent-rose":                status === "error",
    })} />
  );
}

function StatusRow({
  label, value, sub, status, icon: Icon,
}: {
  label: string; value: string; sub?: string;
  status: DotStatus; icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-base-800/60 px-4 py-3">
      <StatusDot status={status} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-ink-50 truncate">{value}</p>
        {sub && <p className="font-mono text-[10px] text-ink-500">{sub}</p>}
      </div>
      {Icon && (
        <span className={cn("text-ink-500", status === "connected" || status === "running" ? "text-accent-mint" : "")}>
          <Icon className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}

// ── Category badge ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  coding:        "bg-accent-mint/15 text-accent-mint",
  learning:      "bg-accent-sky/15 text-accent-sky",
  entertainment: "bg-accent-rose/15 text-accent-rose",
  idle:          "bg-base-700 text-ink-500",
  other:         "bg-base-700 text-ink-500",
};

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide", CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other)}>
      {category}
    </span>
  );
}

// ── Signal row ────────────────────────────────────────────────────────────────

function SignalRow({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex-shrink-0 font-mono text-[10px] ${ok ? "text-accent-mint" : "text-accent-rose"}`}>
        {ok ? "✓" : "✗"}
      </span>
      <span className="font-mono text-[10px] text-ink-500 w-28 flex-shrink-0">{label}</span>
      <span className="font-mono text-[10px] text-ink-400 truncate">{value}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const { addSession } = useSessions();

  // ── Native tracker ─────────────────────────────────────────────────────────
  const {
    status: nativeStatus,
    error: nativeError,
    currentSnapshot,
    pendingSessionCount,
    lastPollAt: nativeLastPoll,
    isRunning: nativeRunning,
    start: startNative,
    stop: stopNative,
    currentMode,
    currentApp,
    currentLanguage,
    codingIdleCountdownSecs,
  } = useNativeTracker((drafts) => {
    drafts.forEach((d) => addSession(d));
  });

  // ── ActivityWatch ──────────────────────────────────────────────────────────
  const [awEnabled, setAwEnabled] = useState(false);
  const {
    status: awStatus,
    error: awError,
    bucketCount,
    lastPolled: awLastPoll,
    pendingSessions: awPending,
    poll: awPoll,
  } = useActivityWatch(awEnabled, (drafts) => {
    drafts.forEach((d) => addSession(d));
  });

  const nativeDotStatus: DotStatus =
    nativeStatus === "running" ? "running" :
    nativeStatus === "error"   ? "error"   : "idle";

  const awDotStatus: DotStatus =
    awStatus === "connected" ? "connected" :
    awStatus === "polling"   ? "polling"   :
    awStatus === "error"     ? "error"     : "idle";

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-7 pb-10">
      <header className="pt-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent-violet/70">Activity</p>
        <h1 className="mt-0.5 font-display text-[22px] font-semibold text-ink-50">Monitoring</h1>
      </header>

      {/* ── Native Tracker ─────────────────────────────────────────────────── */}
      <Card title="Native tracking" eyebrow="Primary · no dependencies">
        <p className="mb-4 text-[13px] text-ink-500 leading-relaxed">
          Ascend OS's built-in tracker. Polls the active window every 5 seconds using
          OS-native APIs (AppleScript on macOS, xdotool on Linux, PowerShell on Windows).
          No third-party software required.
        </p>

        <StatusRow
          label="Native Tracker"
          status={nativeDotStatus}
          value={
            nativeStatus === "stopped" ? "Not monitoring" :
            nativeStatus === "running" ? "Monitoring active" :
            `Error: ${nativeError}`
          }
          sub={nativeLastPoll ? `Last polled ${nativeLastPoll.toLocaleTimeString()}` : undefined}
          icon={Monitor}
        />

        {nativeRunning && currentSnapshot && (
          <div className="mt-3 rounded-lg border border-white/[0.06] bg-base-800/40 p-3 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">Live tracker</p>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink-50">
                  {currentApp ?? currentSnapshot.appName}
                </p>
                {currentSnapshot.windowTitle && (
                  <p className="truncate font-mono text-[10px] text-ink-500 mt-0.5">
                    {currentSnapshot.windowTitle}
                  </p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {currentLanguage && (
                  <span className="font-mono text-[10px] text-accent-mint">{currentLanguage}</span>
                )}
                <CategoryBadge category={currentSnapshot.category} />
              </div>
            </div>

            {(currentMode === "coding" || currentSnapshot.classificationReason?.includes("IDE")) && (
              <div className="rounded border border-white/[0.05] bg-base-900/50 px-2.5 py-2 space-y-1">
                <p className="font-mono text-[9px] uppercase tracking-wider text-ink-600 mb-1.5">Coding signals</p>
                <SignalRow ok={true}  label="IDE focused"       value={currentSnapshot.appName} />
                <SignalRow ok={!!currentLanguage}                label="Code file in title" value={currentLanguage ?? "none detected"} />
                <SignalRow ok={!!currentSnapshot.keyboardActivityDetected} label="Keyboard active" value={currentSnapshot.keyboardActivityDetected ? "typing detected" : "mouse-only (ignored)"} />
                <SignalRow ok={currentMode === "coding"} label="Valid coding state" value={currentMode === "coding" ? "✓ counting" : "✗ not counting"} />
              </div>
            )}

            {codingIdleCountdownSecs !== null && codingIdleCountdownSecs < 30 && (
              <div className="flex items-center gap-1.5 rounded border border-accent-gold/20 bg-accent-gold/10 px-2 py-1.5">
                <span className="font-mono text-[10px] text-accent-gold">
                  ⚠ Coding pauses in {codingIdleCountdownSecs}s — type to continue
                </span>
              </div>
            )}

            <p className="font-mono text-[10px] text-ink-600 border-t border-white/[0.04] pt-2">
              {currentSnapshot.classificationReason}
            </p>
          </div>
        )}

        {pendingSessionCount > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent-mint/20 bg-accent-mint/10 px-3 py-2">
            <Radio className="h-3.5 w-3.5 text-accent-mint" />
            <p className="font-mono text-[11px] text-accent-mint">
              {pendingSessionCount} session{pendingSessionCount !== 1 ? "s" : ""} ready to commit
            </p>
          </div>
        )}

        {nativeStatus === "error" && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-accent-rose/20 bg-accent-rose/10 px-3 py-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent-rose" />
            <div>
              <p className="font-mono text-[11px] text-accent-rose">{nativeError}</p>
              <p className="mt-0.5 font-mono text-[10px] text-ink-500">
                macOS: check Accessibility permissions in System Settings → Privacy &amp; Security.
                Linux: ensure xdotool is installed.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            variant={nativeRunning ? "outline" : "primary"}
            onClick={nativeRunning ? stopNative : startNative}
            className={nativeRunning ? "border-accent-rose/40 text-accent-rose" : ""}
          >
            {nativeRunning ? "Stop monitoring" : "Start monitoring"}
          </Button>
        </div>

        <p className="mt-3 font-mono text-[10px] text-ink-500">
          Polls every 5s · classifies coding, learning, entertainment, idle
        </p>
      </Card>

      {/* ── ActivityWatch ───────────────────────────────────────────────────── */}
      <Card title="ActivityWatch" eyebrow="Fallback · debug mode">
        <p className="mb-4 text-[13px] text-ink-500 leading-relaxed">
          Import sessions from a running ActivityWatch instance (localhost:5600).
          Useful for retroactively importing history. Native tracking above is preferred.
        </p>

        <StatusRow
          label="ActivityWatch"
          status={awDotStatus}
          value={
            awStatus === "idle"      ? "Disabled" :
            awStatus === "polling"   ? "Connecting…" :
            awStatus === "connected" ? `Connected · ${bucketCount} buckets detected` :
            `Error: ${awError}`
          }
          sub={awLastPoll ? `Last polled ${awLastPoll.toLocaleTimeString()}` : undefined}
          icon={awStatus === "connected" ? CheckCircle2 : awStatus === "error" ? XCircle : undefined}
        />

        {awPending.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent-sky/20 bg-accent-sky/10 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-accent-sky" />
            <p className="font-mono text-[11px] text-accent-sky">
              {awPending.length} sessions imported from ActivityWatch
            </p>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            variant={awEnabled ? "outline" : "primary"}
            onClick={() => setAwEnabled((e) => !e)}
            className={awEnabled ? "border-accent-rose/40 text-accent-rose" : ""}
          >
            {awEnabled ? "Stop" : "Enable"}
          </Button>
          {awEnabled && (
            <Button variant="outline" onClick={awPoll} disabled={awStatus === "polling"}>
              {awStatus === "polling"
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />}
              Poll now
            </Button>
          )}
        </div>

        <p className="mt-3 font-mono text-[10px] text-ink-500">
          Requires ActivityWatch at http://localhost:5600 · polls every 60s
        </p>
      </Card>
    </div>
  );
}
