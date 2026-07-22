/**
 * types/app-rule.ts — a per-app override rule, editable from the App Rules
 * panel (Settings → Capabilities). Applied as a thin post-classification
 * pass in lib/app-rules.ts — see that file's header for exactly how and
 * where it plugs into the tracker pipeline. Nothing in this file or in
 * lib/app-rules.ts touches lib/tracker/classifier.ts's own logic.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * KNOWN DATA-MODEL GAP (intentional — do not "fix" without a real
 * discussion, this is a deferred/future-phase item, not a bug):
 *
 * types/session.ts's Session/SessionDraft store `language` (e.g. "Python",
 * "React") but never the app/window name that produced them. Only
 * types/distraction.ts's DistractionRecord stores a real app/site `label`
 * alongside real minutes.
 *
 * Consequence for AppRule: a rule can be looked up and applied LIVE during
 * tracking (native-tracker.ts reads WindowSnapshot.appName/siteLabel
 * directly, every poll — this works today, for every category). A
 * *historical* view of "how much of my past CODING/WATCHING time came from
 * app X" still can't be reconstructed after the fact — only past
 * distraction history has real per-app minutes. What CAN be shown without
 * that: which apps the tracker has genuinely observed at all, per
 * category — see types/detected-app.ts, a small append-only "seen this
 * app doing this category" registry that sidesteps the gap without
 * closing it. The App Rules panel uses that (plus real distraction
 * minutes where available) instead of ever showing a guessed/seeded app
 * list. Fully real per-app durations for coding/learning still requires
 * Session to start storing an app name — a separate, future phase.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { ActivityCategory } from "@/lib/tracker/types";

/** "on" tracks the app normally. "off" forces every snapshot for this app
 * to classify as "idle" (native-tracker.ts applies this immediately after
 * classifySnapshot() — existing segment/session builders already drop
 * "idle" segments, so no separate special-case is needed downstream). */
export type AppRuleTracking = "on" | "off";

/**
 * "auto" leaves the classifier's own category decision alone. Any other
 * value force-overrides ClassifiedSnapshot.category for this app, applied
 * only when tracking is "on" (an "off" rule always wins — there is no
 * "off" + forced-category combination).
 */
export type AppRuleClassification = "auto" | ActivityCategory;

/**
 * Whether time tracked for this app counts toward XP/streaks/quests once
 * it becomes a Session ("counts") or is tracked but deliberately excluded
 * from progress systems ("excluded") — e.g. a "coding" app you want logged
 * for awareness but not rewarded. NOT wired into the XP/streak engines by
 * this pass; the control and its stored value exist so a future phase can
 * read it without another schema change.
 */
export type AppRuleProgress = "counts" | "excluded";

/**
 * Whether this app's activity should surface in user-facing lists (Today
 * timeline, distraction breakdowns) or be tracked/counted silently.
 * NOT wired into any UI list-filtering by this pass — stored for a future
 * phase, same as `progress` above.
 */
export type AppRuleVisibility = "visible" | "hidden";

export interface AppRule {
  id: string;
  /**
   * Matched case-insensitively against WindowSnapshot.appName, or
   * ClassifiedSnapshot.siteLabel for browser windows (same "site label
   * over raw process name for browsers" preference the rest of the
   * tracker pipeline already uses — see classifier.ts/segmenter.ts). See
   * lib/app-rules.ts's findRuleForApp().
   */
  appName: string;
  tracking: AppRuleTracking;
  classification: AppRuleClassification;
  progress: AppRuleProgress;
  visibility: AppRuleVisibility;
  createdAt: string;
  updatedAt: string;
}

/** Shape for creating/updating a rule from the UI — everything but the
 * identity/timestamps, which the store fills in. */
export interface AppRuleDraft {
  appName: string;
  tracking: AppRuleTracking;
  classification: AppRuleClassification;
  progress: AppRuleProgress;
  visibility: AppRuleVisibility;
}

export const DEFAULT_APP_RULE_DRAFT: Omit<AppRuleDraft, "appName"> = {
  tracking: "on",
  classification: "auto",
  progress: "counts",
  visibility: "visible",
};
