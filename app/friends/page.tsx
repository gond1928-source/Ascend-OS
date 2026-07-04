"use client";

/**
 * Friends — placeholder.
 * Referenced from the icon rail; not built out yet.
 */

import { Users } from "lucide-react";

export default function FriendsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5 p-8 pb-12">
      <header className="flex items-end justify-between pt-1">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent-violet/70">Social</p>
          <h1 className="mt-0.5 font-display text-[22px] font-semibold text-ink-50">Friends</h1>
        </div>
        <span className="rounded-full border border-accent-violet/30 bg-accent-violet/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-accent-violet/80">
          Coming soon
        </span>
      </header>

      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <Users className="mb-3 h-8 w-8 text-ink-600" />
        <p className="text-[13px] text-ink-500">No friends connected yet</p>
        <p className="mt-1 max-w-sm font-mono text-[11px] text-ink-600">
          This will let you add friends, compare streaks, and see each other's progress.
        </p>
      </div>
    </div>
  );
}
