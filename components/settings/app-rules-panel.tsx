"use client";
/**
 * AppRulesPanel — per-app tracking/classification/progress/visibility
 * rules, restructured into three sections (Coding / Learning / Other),
 * modeled directly on Discord's Registered Games UI (Current Game +
 * Added Games, checkmark = genuinely verified/observed):
 *
 *  - A "Currently focused" row — live, at most one entry (see the
 *    deferred-limitation note in hooks/useAppRulesRows.ts: no
 *    process-list Tauri command exists, only the single OS-focused
 *    window). Ascend OS itself is never shown here — see
 *    constants/self-identity.ts.
 *  - Three collapsible sections, each showing ONLY apps the tracker has
 *    genuinely classified at least once (verified: true → checkmark) plus
 *    any manually-added, not-yet-observed rules (verified: false → no
 *    checkmark). There is no static seeded/guessed placeholder list
 *    anymore — an app with zero real signal simply isn't shown until
 *    either the tracker observes it or a person adds it manually.
 *  - A small "Add an app" affordance at the bottom — secondary, minor,
 *    matching Discord's "Not seeing your game? Add it!" fallback role,
 *    not the primary way entries appear.
 *
 * Data composition lives in hooks/useAppRulesRows.ts — this component only
 * renders what that hook hands it and turns control changes into
 * useAppRules().upsertRule() calls.
 */

import { useState } from "react";
import { ChevronRight, BadgeCheck, Plus } from "lucide-react";
import { useAppRulesRows, AppRulesRow, AppRulesSection, AddAppSuggestion } from "@/hooks/useAppRulesRows";
import { useAppRules } from "@/hooks/useAppRules";
import { AppRule, AppRuleDraft, AppRuleClassification, DEFAULT_APP_RULE_DRAFT } from "@/types/app-rule";

const SECTION_LABELS: Record<AppRulesSection, string> = {
  coding: "Coding",
  learning: "Learning",
  other: "Other",
};

const SECTION_TO_CLASSIFICATION: Record<AppRulesSection, AppRuleClassification> = {
  coding: "coding",
  learning: "learning",
  other: "other",
};

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function draftFromRow(appName: string, rule: AppRule | undefined): AppRuleDraft {
  if (rule) {
    return {
      appName: rule.appName,
      tracking: rule.tracking,
      classification: rule.classification,
      progress: rule.progress,
      visibility: rule.visibility,
    };
  }
  return { appName, ...DEFAULT_APP_RULE_DRAFT };
}

function RuleControls({ appName, rule }: { appName: string; rule: AppRule | undefined }) {
  const { upsertRule } = useAppRules();

  function patch(partial: Partial<AppRuleDraft>) {
    upsertRule({ ...draftFromRow(appName, rule), ...partial });
  }

  const current = draftFromRow(appName, rule);

  return (
    <div className="app-rules-row-controls">
      <label className="app-rules-field">
        <span className="app-rules-field-label">Tracking</span>
        <select
          className="app-rules-select"
          aria-label={`Tracking for ${appName}`}
          value={current.tracking}
          onChange={(e) => patch({ tracking: e.target.value as AppRuleDraft["tracking"] })}
        >
          <option value="on">On</option>
          <option value="off">Off</option>
        </select>
      </label>

      <label className="app-rules-field">
        <span className="app-rules-field-label">Classify</span>
        <select
          className="app-rules-select"
          aria-label={`Classification for ${appName}`}
          value={current.classification}
          onChange={(e) => patch({ classification: e.target.value as AppRuleDraft["classification"] })}
        >
          <option value="auto">Auto</option>
          <option value="coding">Coding</option>
          <option value="learning">Learning</option>
          <option value="entertainment">Entertainment</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label className="app-rules-field">
        <span className="app-rules-field-label">Progress</span>
        <select
          className="app-rules-select"
          aria-label={`Progress counting for ${appName}`}
          value={current.progress}
          onChange={(e) => patch({ progress: e.target.value as AppRuleDraft["progress"] })}
        >
          <option value="counts">Counts</option>
          <option value="excluded">Excluded</option>
        </select>
      </label>

      <label className="app-rules-field">
        <span className="app-rules-field-label">Visibility</span>
        <select
          className="app-rules-select"
          aria-label={`Visibility for ${appName}`}
          value={current.visibility}
          onChange={(e) => patch({ visibility: e.target.value as AppRuleDraft["visibility"] })}
        >
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
      </label>
    </div>
  );
}

function AppRow({ row }: { row: AppRulesRow }) {
  const secondary = row.minutes !== null
    ? `${Math.round(row.minutes)}m`
    : row.lastDetectedAt
      ? `Last detected ${formatRelativeTime(row.lastDetectedAt)}`
      : "Not yet detected";

  return (
    <div className="app-rules-row">
      <div className="app-rules-row-identity">
        {row.verified ? (
          <BadgeCheck className="app-rules-row-badge" aria-label="Verified by tracker" />
        ) : (
          <span className="app-rules-row-dot" />
        )}
        <span className="app-rules-row-name" title={row.appName}>{row.appName}</span>
        <span className="app-rules-row-minutes">{secondary}</span>
      </div>
      <RuleControls appName={row.appName} rule={row.rule} />
    </div>
  );
}

function Section({ id, rows }: { id: AppRulesSection; rows: AppRulesRow[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="grouped-list">
      <button type="button" className="grouped-list-header" onClick={() => setOpen((v) => !v)}>
        <span className="grouped-list-title">{SECTION_LABELS[id]}</span>
        <span className="grouped-list-count">{rows.length}</span>
        <ChevronRight className={open ? "grouped-list-chevron grouped-list-chevron--open" : "grouped-list-chevron"} />
      </button>

      {open && (
        rows.length === 0 ? (
          <div className="grouped-list-empty">
            No {SECTION_LABELS[id].toLowerCase()} apps detected yet — this fills in automatically as monitoring runs.
          </div>
        ) : (
          <div>
            {rows.map((row) => <AppRow key={row.appName} row={row} />)}
          </div>
        )
      )}
    </div>
  );
}

/**
 * AddAppForm — the minor, secondary "not detected yet" path (Discord's
 * "Not seeing your game? Add it!" role). Two things distinguish this from
 * a plain text field:
 *
 * 1. A combobox: the name field shows a dropdown of real suggestions —
 *    the live currently-focused app (if it has no rule yet) plus any
 *    already-detected app that has no rule yet. Every suggestion is
 *    copied verbatim from a value the tracker has actually produced, so
 *    picking one guarantees the rule matches that exact string. Free
 *    typing still works, but isn't guaranteed to match a future
 *    detection — flagged inline (see the two different hint lines below)
 *    because for browser-based apps in particular, the match key can be a
 *    live, non-fixed window title rather than a stable name (see
 *    lib/tracker/classifier.ts's KNOWN_SITE_LABELS /
 *    extractBrowserSiteLabel — only a fixed, curated set of sites resolve
 *    to a guaranteed-stable label; everything else depends on what the
 *    OS/browser exposes at that moment).
 * 2. Nothing commits until "Add" — Tracking/Classify/Progress/Visibility
 *    are held as local draft state (not written per keystroke, unlike
 *    RuleControls on an existing row) so "Cancel" truly discards it.
 */
function AddAppForm({ suggestions }: { suggestions: AddAppSuggestion[] }) {
  const { upsertRule, getRuleForApp } = useAppRules();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [draft, setDraft] = useState<Omit<AppRuleDraft, "appName">>(DEFAULT_APP_RULE_DRAFT);

  const trimmedName = name.trim();
  const matchedSuggestion = suggestions.find(
    (s) => s.appName.trim().toLowerCase() === trimmedName.toLowerCase(),
  );
  const filteredSuggestions = trimmedName
    ? suggestions.filter((s) => s.appName.toLowerCase().includes(trimmedName.toLowerCase()))
    : suggestions;
  const alreadyHasRule = trimmedName ? !!getRuleForApp(trimmedName) : false;

  function pickSuggestion(s: AddAppSuggestion) {
    setName(s.appName);
    setDraft((d) => ({ ...d, classification: SECTION_TO_CLASSIFICATION[s.section] }));
    setShowSuggestions(false);
  }

  function reset() {
    setOpen(false);
    setName("");
    setDraft(DEFAULT_APP_RULE_DRAFT);
    setShowSuggestions(false);
  }

  function submit() {
    if (!trimmedName || alreadyHasRule) return;
    upsertRule({ appName: trimmedName, ...draft });
    reset();
  }

  if (!open) {
    return (
      <button type="button" className="app-rules-add-toggle" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3" />
        Add an app not yet detected
      </button>
    );
  }

  return (
    <div className="app-rules-add-form">
      <div className="app-rules-combobox">
        <input
          type="text"
          className="settings-input"
          placeholder="App name"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="app-rules-combobox-list">
            {filteredSuggestions.map((s) => (
              <button
                key={s.appName}
                type="button"
                className="app-rules-combobox-item"
                // onMouseDown (not onClick) so this fires before the input's onBlur closes the list
                onMouseDown={() => pickSuggestion(s)}
              >
                <BadgeCheck className="app-rules-row-badge" />
                <span>{s.appName}</span>
                <span className="app-rules-combobox-item-tag">
                  {s.fromLiveFocus ? "focused now" : SECTION_LABELS[s.section].toLowerCase()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {trimmedName && (
        matchedSuggestion ? (
          <p className="app-rules-add-hint app-rules-add-hint--verified">
            Matches a real detection — this rule will apply to future detections of {matchedSuggestion.appName}.
          </p>
        ) : (
          <p className="app-rules-add-hint">
            Custom name — must exactly match (case-insensitive) what the tracker reports to apply automatically.
          </p>
        )
      )}
      {alreadyHasRule && <p className="app-rules-add-hint app-rules-add-hint--warn">Already has a rule below.</p>}

      <div className="app-rules-row-controls">
        <label className="app-rules-field">
          <span className="app-rules-field-label">Tracking</span>
          <select
            className="app-rules-select"
            value={draft.tracking}
            onChange={(e) => setDraft((d) => ({ ...d, tracking: e.target.value as AppRuleDraft["tracking"] }))}
          >
            <option value="on">On</option>
            <option value="off">Off</option>
          </select>
        </label>
        <label className="app-rules-field">
          <span className="app-rules-field-label">Classify</span>
          <select
            className="app-rules-select"
            value={draft.classification}
            onChange={(e) => setDraft((d) => ({ ...d, classification: e.target.value as AppRuleDraft["classification"] }))}
          >
            <option value="auto">Auto</option>
            <option value="coding">Coding</option>
            <option value="learning">Learning</option>
            <option value="entertainment">Entertainment</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="app-rules-field">
          <span className="app-rules-field-label">Progress</span>
          <select
            className="app-rules-select"
            value={draft.progress}
            onChange={(e) => setDraft((d) => ({ ...d, progress: e.target.value as AppRuleDraft["progress"] }))}
          >
            <option value="counts">Counts</option>
            <option value="excluded">Excluded</option>
          </select>
        </label>
        <label className="app-rules-field">
          <span className="app-rules-field-label">Visibility</span>
          <select
            className="app-rules-select"
            value={draft.visibility}
            onChange={(e) => setDraft((d) => ({ ...d, visibility: e.target.value as AppRuleDraft["visibility"] }))}
          >
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
      </div>

      <div className="app-rules-add-actions">
        <button
          type="button"
          className="app-rules-add-submit"
          onClick={submit}
          disabled={!trimmedName || alreadyHasRule}
        >
          Add
        </button>
        <button type="button" className="app-rules-add-cancel" onClick={reset}>Cancel</button>
      </div>
    </div>
  );
}

export function AppRulesPanel() {
  const { currentlyFocused, currentlyFocusedChecked, sections, addSuggestions } = useAppRulesRows(true);

  return (
    <div>
      <div className="grouped-list">
        <div className="grouped-list-header" style={{ cursor: "default" }}>
          <span className="grouped-list-title">Currently focused</span>
        </div>

        {currentlyFocused ? (
          <div className="app-rules-live-row">
            <span className="app-rules-live-dot" />
            <div className="app-rules-live-text">
              <div className="app-rules-live-title">{currentlyFocused.appName}</div>
              <div className="app-rules-live-sub">{currentlyFocused.windowTitle}</div>
            </div>
            <RuleControls appName={currentlyFocused.appName} rule={currentlyFocused.rule} />
          </div>
        ) : (
          <div className="grouped-list-empty">
            {currentlyFocusedChecked
              ? "Nothing focused right now, or not running inside the Ascend OS desktop app."
              : "Checking…"}
          </div>
        )}
      </div>

      <Section id="coding" rows={sections.coding} />
      <Section id="learning" rows={sections.learning} />
      <Section id="other" rows={sections.other} />

      <AddAppForm suggestions={addSuggestions} />
    </div>
  );
}
