"use client";

import { useState } from "react";
import { useSessions } from "@/hooks/useSessions";
import { useXP } from "@/hooks/useXP";
import { Card } from "@/components/ui/card";
import { SessionHistory } from "@/components/sessions/session-history";
import { SessionForm } from "@/components/sessions/session-form";
import { SessionDraft } from "@/types/session";

export default function SessionsPage() {
  const { sessions, isLoading, addSession, deleteSession } = useSessions();
  const xp = useXP(sessions);
  const [lastXP, setLastXP] = useState<number | null>(null);

  function handleSubmit(draft: SessionDraft) {
    const { xpEarned } = addSession(draft);
    setLastXP(xpEarned);
    setTimeout(() => setLastXP(null), 3000);
  }

  // SessionHistory groups same-language, same-run coding+watching sessions
  // into a single visual block; deleting a group must delete every
  // underlying session id it represents, not just one of them.
  function handleDeleteGroup(ids: string[]) {
    ids.forEach((id) => deleteSession(id));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-accent-violet">Sessions</p>
        <h1 className="mt-1 font-display text-2xl text-ink-50">Session history</h1>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card title="Log a session" eyebrow="Manual entry">
            <SessionForm onSubmit={handleSubmit} />
            {lastXP !== null && (
              <div className="mt-3 rounded-lg border border-accent-mint/20 bg-accent-mint/10 px-3 py-2">
                <p className="font-mono text-[11px] text-accent-mint">+{lastXP} XP earned</p>
              </div>
            )}
          </Card>
          <Card eyebrow="Total XP" title={`${xp.xp.toLocaleString()} XP`}>
            <p className="text-sm text-ink-500">Level {xp.level} · {xp.xpToNextLevel} to next</p>
          </Card>
        </div>

        <Card
          title="All sessions"
          eyebrow={isLoading ? "loading…" : `${sessions.length} total`}
          className="lg:col-span-2"
        >
          {isLoading ? (
            <p className="font-mono text-sm text-ink-500">$ loading…</p>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="font-mono text-sm text-ink-500">No sessions yet.</p>
              <p className="mt-1 text-xs text-ink-500">Log your first session to get started.</p>
            </div>
          ) : (
            <SessionHistory sessions={sessions} onDelete={handleDeleteGroup} />
          )}
        </Card>
      </div>
    </div>
  );
}
