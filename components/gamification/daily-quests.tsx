"use client";
import { Session } from "@/types/session";
import { getDailyQuests } from "@/lib/quest-engine";
import { Card } from "@/components/ui/card";
import { Code2, Layers, Globe, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ReactNode> = {
  code2: <Code2 className="h-3.5 w-3.5" />,
  layers: <Layers className="h-3.5 w-3.5" />,
  globe: <Globe className="h-3.5 w-3.5" />,
};

export function DailyQuestsWidget({ sessions }: { sessions: Session[] }) {
  const quests = getDailyQuests(sessions);
  const done = quests.filter((q) => q.completed).length;

  return (
    <Card
      title="Daily quests"
      eyebrow={`${done}/${quests.length} done`}
      action={
        <span className="font-mono text-[10px] text-accent-amber">
          +{quests.filter((q) => q.completed).reduce((s, q) => s + q.xpReward, 0)} XP
        </span>
      }
    >
      <div className="space-y-3">
        {quests.map((q) => (
          <div key={q.id} className={cn("flex items-start gap-3 transition-opacity", q.completed ? "opacity-60" : "")}>
            <span className={cn("mt-0.5 flex-shrink-0", q.completed ? "text-status-success" : "text-ink-500")}>
              {q.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={cn("text-[13px]", q.completed ? "line-through text-ink-500" : "text-ink-50")}>{q.title}</p>
                <span className="flex-shrink-0 font-mono text-[10px] text-accent-amber">+{q.xpReward}</span>
              </div>
              {!q.completed && (
                <div className="mt-1.5 h-[2px] w-full overflow-hidden rounded-full bg-base-700">
                  <div
                    className="h-full rounded-full bg-accent-violet/60 transition-all duration-500"
                    style={{ width: `${q.progress * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
