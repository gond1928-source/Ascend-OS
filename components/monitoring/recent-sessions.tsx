"use client";

import Link from "next/link";
import { Session } from "@/types/session";
import { groupSessionsForDisplay } from "@/lib/session-grouping";
import { SessionRow } from "@/components/sessions/session-row";
import { ArrowRight, Clock } from "lucide-react";

const RECENT_LIMIT = 6;

export function RecentSessions({ sessions }: { sessions: Session[] }) {
  const groups = groupSessionsForDisplay(sessions).slice(0, RECENT_LIMIT);

  return (
    <div className="today-section">
      <div className="today-section-header">
        <span className="today-section-title">Recent sessions</span>
        <Link href="/sessions" className="today-link">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="quiet-empty">
          <Clock className="quiet-empty-icon" />
          <p className="quiet-empty-title">No sessions yet</p>
          <p className="quiet-empty-sub">Tracked and manual sessions will show up here as they happen.</p>
        </div>
      ) : (
        <div>
          {groups.map((g) => (
            <SessionRow key={g.id} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
