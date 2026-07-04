import { xpRequiredForLevel, rankForLevel } from "@/constants/levels";

export function levelForXP(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
  rank: string;
  tier: string;
} {
  // Binary search for current level
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= xp) {
    level++;
    if (level > 100) break;
  }

  const xpStart = xpRequiredForLevel(level);
  const xpEnd = xpRequiredForLevel(level + 1);
  const xpIntoLevel = xp - xpStart;
  const xpToNextLevel = xpEnd - xp;

  const { title: rank, tier } = rankForLevel(level);
  return { level, xpIntoLevel, xpToNextLevel, rank, tier };
}
