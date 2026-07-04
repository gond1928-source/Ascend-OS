import { Session } from "@/types/session";
import { groupSessionsForDisplay } from "@/lib/session-grouping";
import { SessionCard } from "./session-card";

export function SessionHistory({ sessions, onDelete }: { sessions: Session[]; onDelete?: (ids: string[]) => void }) {
  const groups = groupSessionsForDisplay(sessions);
  return (
    <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
      {groups.map((g) => (
        <SessionCard key={g.id} group={g} onDelete={onDelete} />
      ))}
    </div>
  );
}
