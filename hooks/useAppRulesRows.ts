"use client";

/**
 * useAppRulesRows — composes DetectedApp[] (real, tracker-observed apps —
 * see types/detected-app.ts) + DistractionContext (real per-app minutes,
 * where they exist) + AppRulesContext + a live window snapshot into
 * exactly what the App Rules panel renders: three sections — Coding /
 * Learning / Other — plus the "currently focused" row.
 *
 * NO seeded/guessed placeholder apps appear here anymore. Every row is
 * either:
 *  - verified: true  — the tracker itself classified this app at least
 *    once (a DetectedApp entry exists). Gets the checkmark in the UI,
 *    matching Discord's "Registered Games" checkmark semantics: it means
 *    "genuinely observed", not "known to exist".
 *  - verified: false — a person manually added a rule for an app the
 *    tracker hasn't observed yet (a minor, secondary path — see
 *    components/settings/app-rules-panel.tsx's add-app form). No
 *    checkmark. If the tracker later actually observes that same app, a
 *    matching DetectedApp entry appears and the SAME row becomes verified
 *    — rows are joined by app name, not duplicated.
 *
 * Section mapping is presentation-only (decided here, not stored):
 * "coding" → Coding, "learning" → Learning, "entertainment" and "other"
 * → Other. Entertainment doesn't get its own section (the phase brief
 * asked for exactly three) and sits closer to "Other" than "Learning" in
 * spirit; it also has no more real per-app minute data than Learning does
 * (session-builder.ts folds both into a kind-only "watching" Session — see
 * types/app-rule.ts's data-model-gap comment), so nothing is lost by not
 * splitting it out.
 */

import { useMemo } from "react";
import { useDistractions } from "@/hooks/useDistractions";
import { useAppRules } from "@/hooks/useAppRules";
import { useDetectedApps } from "@/hooks/useDetectedApps";
import { useLiveWindowSnapshot } from "@/hooks/useLiveWindowSnapshot";
import { AppRule } from "@/types/app-rule";
import { normalizeAppKey } from "@/lib/app-rules";

export type AppRulesSection = "coding" | "learning" | "other";

function sectionForCategory(category: string): AppRulesSection {
  if (category === "coding") return "coding";
  if (category === "learning") return "learning";
  return "other"; // "entertainment" | "other" | "auto" (manual, unclassified)
}

export interface AppRulesRow {
  appName: string;
  section: AppRulesSection;
  /** True only when a DetectedApp entry exists — the tracker has itself
   * classified this app. See this file's header. */
  verified: boolean;
  lastDetectedAt: string | null;
  /** Real accumulated minutes from DistractionRecord — only ever non-null
   * for genuine "other"-category detections, the one category with true
   * per-app duration data. Never fabricated. */
  minutes: number | null;
  rule: AppRule | undefined;
}

export interface CurrentlyFocusedRow {
  appName: string;
  windowTitle: string;
  rule: AppRule | undefined;
}

export interface AddAppSuggestion {
  appName: string;
  section: AppRulesSection;
  /** True when this came from the live "currently focused" snapshot —
   * useful for the UI to label it distinctly from an already-detected
   * app. Always true-real either way; this is not about reliability. */
  fromLiveFocus: boolean;
}

export interface UseAppRulesRowsResult {
  currentlyFocused: CurrentlyFocusedRow | null;
  currentlyFocusedChecked: boolean;
  sections: Record<AppRulesSection, AppRulesRow[]>;
  /**
   * Real, tracker-produced app-name strings that don't have a rule yet —
   * for the manual "Add an app" combobox's suggestion list. Deliberately
   * NEVER includes anything typed/guessed: every entry here is copied
   * verbatim from a value the pipeline has actually produced (a live
   * snapshot's appName/siteLabel, or an existing DetectedApp), so picking
   * one guarantees the created rule matches that exact string byte-for-
   * byte. See lib/tracker/classifier.ts's KNOWN_SITE_LABELS /
   * extractBrowserSiteLabel for why a FREE-TYPED name can't carry the same
   * guarantee for browser-based apps in particular.
   */
  addSuggestions: AddAppSuggestion[];
}

export function useAppRulesRows(panelOpen: boolean): UseAppRulesRowsResult {
  const detectedApps = useDetectedApps();
  const { distractions } = useDistractions();
  const { rules, getRuleForApp } = useAppRules();
  // useLiveWindowSnapshot already excludes Ascend OS's own window (see
  // constants/self-identity.ts) — nothing self-specific needed here.
  const { snapshot, hasPolled } = useLiveWindowSnapshot(panelOpen);

  const currentlyFocused = useMemo<CurrentlyFocusedRow | null>(() => {
    if (!snapshot) return null;
    return {
      appName: snapshot.appName,
      windowTitle: snapshot.windowTitle,
      rule: getRuleForApp(snapshot.appName),
    };
  }, [snapshot, getRuleForApp]);

  const minutesByKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of distractions) {
      const key = normalizeAppKey(d.label);
      m.set(key, (m.get(key) ?? 0) + d.durationMinutes);
    }
    return m;
  }, [distractions]);

  const sections = useMemo(() => {
    const result: Record<AppRulesSection, AppRulesRow[]> = { coding: [], learning: [], other: [] };
    const seen = new Set<string>();

    // Real, tracker-observed apps first — always verified.
    for (const detected of detectedApps) {
      const key = normalizeAppKey(detected.appName);
      seen.add(key);
      result[sectionForCategory(detected.category)].push({
        appName: detected.appName,
        section: sectionForCategory(detected.category),
        verified: true,
        lastDetectedAt: detected.lastDetectedAt,
        minutes: minutesByKey.get(key) ?? null,
        rule: getRuleForApp(detected.appName),
      });
    }

    // Manually-added rules with no matching detection yet — secondary/
    // minor: unverified, no checkmark. Section comes from whatever
    // category the person picked while adding it (see the add-app form);
    // "auto" (shouldn't normally happen for a manual add, but handled
    // safely) falls back to Other since there's no real signal yet.
    for (const rule of rules) {
      const key = normalizeAppKey(rule.appName);
      if (seen.has(key)) continue;
      seen.add(key);
      const section = sectionForCategory(rule.classification);
      result[section].push({
        appName: rule.appName,
        section,
        verified: false,
        lastDetectedAt: null,
        minutes: minutesByKey.get(key) ?? null,
        rule,
      });
    }

    const sortRows = (rows: AppRulesRow[]) =>
      rows.sort((a, b) => {
        if (a.verified !== b.verified) return a.verified ? -1 : 1;
        if (a.lastDetectedAt && b.lastDetectedAt) {
          return new Date(b.lastDetectedAt).getTime() - new Date(a.lastDetectedAt).getTime();
        }
        if (a.lastDetectedAt) return -1;
        if (b.lastDetectedAt) return 1;
        return a.appName.localeCompare(b.appName);
      });

    return {
      coding: sortRows(result.coding),
      learning: sortRows(result.learning),
      other: sortRows(result.other),
    };
  }, [detectedApps, rules, getRuleForApp, minutesByKey]);

  const addSuggestions = useMemo<AddAppSuggestion[]>(() => {
    const result: AddAppSuggestion[] = [];
    const seen = new Set<string>();

    // Live currently-focused app first, if it doesn't already have a rule
    // — the most immediately useful suggestion, since it's what's on
    // screen right now.
    if (currentlyFocused && !currentlyFocused.rule) {
      const key = normalizeAppKey(currentlyFocused.appName);
      seen.add(key);
      result.push({ appName: currentlyFocused.appName, section: "other", fromLiveFocus: true });
    }

    // Every already-detected app that STILL has no rule — real, tracker-
    // produced strings, most-recently-seen first.
    const ruleless = detectedApps
      .filter((d) => !seen.has(normalizeAppKey(d.appName)) && !getRuleForApp(d.appName))
      .sort((a, b) => new Date(b.lastDetectedAt).getTime() - new Date(a.lastDetectedAt).getTime());

    for (const d of ruleless) {
      const key = normalizeAppKey(d.appName);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ appName: d.appName, section: sectionForCategory(d.category), fromLiveFocus: false });
    }

    return result.slice(0, 8);
  }, [currentlyFocused, detectedApps, getRuleForApp]);

  return {
    currentlyFocused,
    currentlyFocusedChecked: hasPolled,
    sections,
    addSuggestions,
  };
}
