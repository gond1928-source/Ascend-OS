// Curved XP progression — each level costs more than the last.
// Formula: xpForLevel(n) = BASE * n^EXPONENT
// This makes early levels fast (feel rewarding) and later ones meaningful.

export const LEVEL_BASE = 300;
export const LEVEL_EXPONENT = 1.4;

/** Total XP required to START level n (1-indexed). Level 1 starts at 0. */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(LEVEL_BASE * Math.pow(level - 1, LEVEL_EXPONENT));
}

/** Human-readable rank title for a given level. */
export function rankForLevel(level: number): { title: string; tier: string } {
  if (level >= 50) return { title: "Architect", tier: "S" };
  if (level >= 40) return { title: "Grandmaster", tier: "S" };
  if (level >= 30) return { title: "Expert", tier: "A" };
  if (level >= 20) return { title: "Veteran", tier: "A" };
  if (level >= 15) return { title: "Journeyman", tier: "B" };
  if (level >= 10) return { title: "Practitioner", tier: "B" };
  if (level >= 7)  return { title: "Apprentice", tier: "C" };
  if (level >= 4)  return { title: "Initiate", tier: "C" };
  return { title: "Novice", tier: "D" };
}

// Keep backward compat for any lingering imports
export const XP_PER_LEVEL = 500;
