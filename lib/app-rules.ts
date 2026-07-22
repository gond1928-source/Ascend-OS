/**
 * lib/app-rules.ts — matching/lookup logic for AppRule[], plus the
 * classification-override pass NativeTracker applies AFTER
 * classifySnapshot() runs.
 *
 * This is a THIN layer on purpose: it never touches
 * lib/tracker/classifier.ts's classification logic itself. classifySnapshot()
 * runs exactly as it always has, on the full CODING_APPS/keyword/etc. rule
 * set; applyAppRules() below only ever takes its ClassifiedSnapshot output
 * and, for apps a person has configured a rule for, rewrites the result —
 * the same way a CSS override rewrites a computed style without touching
 * the base stylesheet.
 *
 * Precedence within one rule: tracking "off" always wins over any
 * classification override — an app that's off is idle, full stop, never
 * "idle, but if it were on it'd be classified as coding".
 */

import { ActivitySegment, ClassifiedSnapshot } from "./tracker/types";
import { AppRule } from "@/types/app-rule";

/**
 * The normalized form every app/site matching key gets reduced to before
 * comparison — trim + lowercase. Shared (not just duplicated) so
 * lib/detected-apps.ts, hooks/useAppRulesRows.ts, and this file's own
 * findRuleForApp/appRuleMatchKey can never drift into comparing
 * differently-normalized strings against each other.
 */
export function normalizeAppKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * The label an AppRule matches against for a given snapshot: the
 * browser-site label when present (so a rule for "Reddit" or "ChatGPT"
 * matches regardless of which browser process reports it), else the raw
 * OS-reported app name. Mirrors segmenter.ts's primaryKeyOf() — kept as a
 * separate copy rather than a shared import so this file has zero
 * dependency on segmenter's internals; the two are conceptually the same
 * key by design, not by accident.
 */
export function appRuleMatchKey(snapshot: Pick<ClassifiedSnapshot, "appName" | "siteLabel">): string {
  return normalizeAppKey(snapshot.siteLabel ?? snapshot.appName);
}

/**
 * Finds the rule (if any) configured for a given app/site label.
 * Case-insensitive, exact match on the label — deliberately NOT a fuzzy
 * substring match (unlike classifier.ts's isCodingApp/isBrowserApp), since
 * a person is picking a specific real app off a list in the UI, not typing
 * a free-text pattern.
 */
export function findRuleForApp(rules: AppRule[], matchKey: string): AppRule | undefined {
  const key = normalizeAppKey(matchKey);
  return rules.find((r) => normalizeAppKey(r.appName) === key);
}

/**
 * The post-classification override pass. Called once per poll, right
 * after classifySnapshot(snapshot) — see native-tracker.ts's poll().
 *
 * - No matching rule, or rule.tracking === "on" with classification
 *   "auto": returns the classified snapshot completely unchanged.
 * - rule.tracking === "off": forces category to "idle" (existing
 *   segment/session builders already drop "idle" segments — see
 *   session-builder.ts's toKind() and distraction-builder.ts's
 *   groupOtherSegments — so no new special-case is needed downstream of
 *   this function).
 * - rule.tracking === "on" and rule.classification is a specific category
 *   (not "auto"): overrides just `category`, keeping every other field
 *   (language, siteLabel, keyboardActivityDetected, ...) from the
 *   classifier's own output untouched.
 */
export function applyAppRules(
  classified: ClassifiedSnapshot,
  rules: AppRule[],
): ClassifiedSnapshot {
  if (rules.length === 0) return classified;

  const rule = findRuleForApp(rules, appRuleMatchKey(classified));
  if (!rule) return classified;

  if (rule.tracking === "off") {
    return {
      ...classified,
      category: "idle",
      classificationReason: `App rule: tracking off for "${rule.appName}"`,
      isActivelyCoding: false,
    };
  }

  if (rule.classification !== "auto" && rule.classification !== classified.category) {
    return {
      ...classified,
      category: rule.classification,
      classificationReason: `App rule: classification forced to "${rule.classification}" for "${rule.appName}" (classifier said "${classified.category}")`,
    };
  }

  return classified;
}

/**
 * Same override, applied to an already-built ActivitySegment's primaryApp
 * instead of a live ClassifiedSnapshot. Not currently called anywhere —
 * segments are built from snapshots that already went through
 * applyAppRules() in native-tracker.ts's poll loop, so segment-level
 * category is already correct by construction. Exported only so a future
 * batch-import path (e.g. an ActivityWatch backfill, which builds segments
 * from snapshots that never passed through NativeTracker's live poll loop)
 * can apply the same rule set without duplicating this matching logic.
 */
export function findRuleForSegment(rules: AppRule[], segment: Pick<ActivitySegment, "primaryApp">): AppRule | undefined {
  return findRuleForApp(rules, segment.primaryApp);
}
