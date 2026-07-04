"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSessions } from "@/hooks/useSessions";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export default function SettingsPage() {
  const { sessions, clearAll } = useSessions();
  const [confirmClear, setConfirmClear] = useState(false);

  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearAll();
    setConfirmClear(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-7 pb-10">
      <header className="pt-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent-violet/70">Config</p>
        <h1 className="mt-0.5 font-display text-[22px] font-semibold text-ink-50">Settings</h1>
      </header>

      {/* Activity tracking — now lives at /monitoring */}
      <Card eyebrow="Activity tracking" title="Native Tracker & ActivityWatch">
        <p className="mb-4 text-[13px] text-ink-500 leading-relaxed">
          Start, stop, and inspect the native activity tracker and ActivityWatch import from the Monitoring section.
        </p>
        <a
          href="/monitoring"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-base-800/60 px-4 py-2 font-mono text-[11px] text-ink-300 transition-colors hover:text-ink-50"
        >
          Go to Monitoring →
        </a>
      </Card>

      {/* ── Session data ────────────────────────────────────────────────────── */}
      <Card title="Session data" eyebrow="Storage">
        <p className="mb-4 text-[13px] text-ink-500">
          {sessions.length} sessions in localStorage (ascend_sessions_v1).
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleClear}
            className={cn("gap-2", confirmClear ? "border-accent-rose/60 text-accent-rose" : "text-ink-500")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmClear ? "Click again — irreversible" : "Clear all sessions"}
          </Button>
          {confirmClear && (
            <button
              onClick={() => setConfirmClear(false)}
              className="font-mono text-[11px] text-ink-500 hover:text-ink-300"
            >
              cancel
            </button>
          )}
        </div>
      </Card>

      {/* ── About ───────────────────────────────────────────────────────────── */}
      <Card title="About" eyebrow="Ascend OS">
        <div className="space-y-1 font-mono text-[11px] text-ink-500">
          <p>Version: 0.3.0</p>
          <p>Native tracker: OS window polling (5s interval)</p>
          <p>ActivityWatch: fallback import (60s interval)</p>
          <p>XP: curved progression + streak multiplier</p>
          <p>Achievements: 24 milestones tracked</p>
          <p>Storage: localStorage · SQLite planned</p>
        </div>
      </Card>
    </div>
  );
}
