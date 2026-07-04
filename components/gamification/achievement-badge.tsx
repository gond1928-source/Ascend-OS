import { Trophy } from "lucide-react";
import { Achievement } from "@/types/achievement";

export function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-base-700 px-3 py-2 ${achievement.unlocked ? "" : "opacity-40"}`}>
      <Trophy className="h-4 w-4 text-accent-amber" />
      <span className="text-xs text-ink-300">{achievement.title}</span>
    </div>
  );
}
