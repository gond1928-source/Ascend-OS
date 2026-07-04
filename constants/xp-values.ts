// XP rates — coding rewards active practice more than passive watching
export const XP_PER_CODING_MINUTE = 3;
export const XP_PER_WATCHING_MINUTE = 1;

// Bonus XP multipliers
export const XP_STREAK_BONUS_PER_DAY = 0.02; // +2% per streak day, max 50%
export const XP_MAX_STREAK_MULTIPLIER = 1.5;

// Quest XP
export const QUEST_XP: Record<string, number> = {
  code_30:       60,
  code_60:       120,
  code_120:      240,
  new_language:  100,
  watch_60:      60,
  sessions_3:    90,
};
