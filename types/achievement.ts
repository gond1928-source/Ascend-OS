export type AchievementCategory = "milestone" | "streak" | "coding" | "languages" | "xp" | "quality";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;   // 0–1, for showing partial progress
  progressLabel?: string;
}
