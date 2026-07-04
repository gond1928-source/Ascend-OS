import { Card } from "@/components/ui/card";
import { Session } from "@/types/session";
import { SessionTimeline } from "@/components/charts/session-timeline";

export function RecentSessions({ sessions }: { sessions: Session[] }) {
  return (
    <Card title="Recent sessions" eyebrow="Latest activity">
      <SessionTimeline sessions={sessions} limit={5} />
    </Card>
  );
}
