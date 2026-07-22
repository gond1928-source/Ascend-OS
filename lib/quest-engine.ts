import { Session } from "@/types/session";
import { QUEST_XP } from "@/constants/xp-values";

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number; // 0–1
  completed: boolean;
  icon: string;
}

function todaySessions(sessions: Session[]): Session[] {
  const today = new Date().toISOString().slice(0, 10);
  return sessions.filter((s) => s.startedAt.slice(0, 10) === today);
}

export function getDailyQuests(sessions: Session[]): Quest[] {
  const today = todaySessions(sessions);
  const todayCodingMinutes = today.filter((s) => s.kind === "coding").reduce((s, x) => s + x.durationMinutes, 0);
  const todaySessions3 = today.length;

  return [
    {
      id: "code_30",
      title: "Code for 30 min",
      description: "Log at least 30 minutes of coding today.",
      xpReward: QUEST_XP.code_30,
      progress: Math.min(1, todayCodingMinutes / 30),
      completed: todayCodingMinutes >= 30,
      icon: "code2",
    },
    {
      id: "code_60",
      title: "Hour of Code",
      description: "Log 60 minutes of coding today.",
      xpReward: QUEST_XP.code_60,
      progress: Math.min(1, todayCodingMinutes / 60),
      completed: todayCodingMinutes >= 60,
      icon: "code2",
    },
    {
      id: "sessions_3",
      title: "Three Sessions",
      description: "Complete 3 sessions today.",
      xpReward: QUEST_XP.sessions_3,
      progress: Math.min(1, todaySessions3 / 3),
      completed: todaySessions3 >= 3,
      icon: "layers",
    },
  ];
}

export function completedQuestXP(quests: Quest[]): number {
  return quests.filter((q) => q.completed).reduce((s, q) => s + q.xpReward, 0);
}
