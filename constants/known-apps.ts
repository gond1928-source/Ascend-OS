/**
 * constants/known-apps.ts — a static, hand-maintained list of recognizable
 * apps/sites per category, used ONLY to seed the App Rules panel's
 * "previously seen" list for the Coding/Learning/Entertainment categories.
 *
 * See types/app-rule.ts's "KNOWN DATA-MODEL GAP" comment for why this
 * exists: Session records don't store an app name, so there is no real
 * per-app minute history for coding/watching activity to rank by — only
 * DistractionRecord has that. These entries always seed in at 0 minutes,
 * clearly distinguishing them from real, ranked distraction history.
 *
 * Deliberately NOT imported from lib/tracker/classifier.ts's internal
 * CODING_APPS/ENTERTAINMENT_APPS arrays (those aren't exported, and
 * shouldn't be — this list is UI seeding data, not classification logic,
 * and the two must stay decoupled so editing one never silently changes
 * the other).
 */

import { ActivityCategory } from "@/lib/tracker/types";

export interface KnownApp {
  name: string;
  category: Extract<ActivityCategory, "coding" | "learning" | "entertainment">;
}

export const KNOWN_APPS: KnownApp[] = [
  // Coding
  { name: "Visual Studio Code", category: "coding" },
  { name: "Cursor", category: "coding" },
  { name: "PyCharm", category: "coding" },
  { name: "IntelliJ IDEA", category: "coding" },
  { name: "Zed", category: "coding" },
  { name: "WebStorm", category: "coding" },
  { name: "Neovim", category: "coding" },
  { name: "Sublime Text", category: "coding" },

  // Learning
  { name: "YouTube", category: "learning" },
  { name: "Udemy", category: "learning" },
  { name: "Coursera", category: "learning" },

  // Entertainment
  { name: "Spotify", category: "entertainment" },
  { name: "Netflix", category: "entertainment" },
  { name: "Twitch", category: "entertainment" },
  { name: "Steam", category: "entertainment" },
  { name: "Discord", category: "entertainment" },
];
