/**
 * types/settings.ts — shape of the persisted, user-editable app settings.
 *
 * Mirrors the Session/Distraction type split already used elsewhere: a
 * plain data shape here, a localStorage-backed store in
 * lib/storage/settings-store.ts, and a React context
 * (lib/settings-context.tsx) that's the single shared source of truth for
 * every consumer — same pattern as Session/SessionContext.
 *
 * Sectioned to match the Settings page's category rail (design brief §11
 * "full-page breakout pattern" + "settings row pattern"): General,
 * Appearance, Capabilities, Privacy/Data, Notifications, About. "About" has
 * no editable state (it's static build info), so it has no section here.
 */

// ── Appearance ─────────────────────────────────────────────────────────────

/**
 * Mirrors lib/theme/ThemeProvider.tsx's `Theme` union. Kept as its own
 * string union here (not imported from ThemeProvider) to avoid a
 * settings-types → theme-provider → (eventually) settings import cycle.
 *
 * IMPORTANT — NOT the source of truth for the active theme: ThemeProvider
 * already owns theme persistence (its own "ascend-os:theme" localStorage
 * key, set via applyTheme()/[data-theme] on <html>). This field exists so
 * the settings *schema* has a complete, self-describing shape (this file's
 * job), but the Settings UI's Appearance section reads/writes the theme
 * through useTheme() directly, not through AscendSettings.appearance.theme.
 * Nothing else in the app reads this field. Two independent persisted
 * copies of "which theme is active" would be a real bug (they could drift),
 * so this is deliberately inert rather than half-wired.
 */
export type SettingsThemeName = "dark" | "glass";

export interface AccentSwatch {
  id: string;
  label: string;
  /** Hex value, written straight into --accent-primary. */
  value: string;
}

/**
 * Curated accent swatches — intentionally a small fixed set (not a free
 * color picker), matching design brief §2's "one accent color, used
 * sparingly" framing. The first entry is today's shipped violet, so
 * choosing it is a no-op for existing users.
 */
export const CURATED_ACCENT_SWATCHES: AccentSwatch[] = [
  { id: "violet", label: "Violet", value: "#7c6cf6" },
  { id: "sky", label: "Sky", value: "#4dc8f5" },
  { id: "green", label: "Green", value: "#3ddc97" },
  { id: "amber", label: "Amber", value: "#f5b94d" },
  { id: "rose", label: "Rose", value: "#f25f7a" },
];

export interface AppearanceSettings {
  /** See SettingsThemeName's doc comment — schema completeness only. */
  theme: SettingsThemeName;
  /**
   * Hex color written to --accent-primary on <html> (see
   * lib/settings-context.tsx's applyAccentColor(), which mirrors
   * ThemeProvider's applyTheme() pattern). Should be one of
   * CURATED_ACCENT_SWATCHES's values, but stored as a plain string so an
   * old/foreign value never hard-crashes the settings load.
   *
   * KNOWN BUG (flagged, not fixed here — see handoff notes): several
   * shared components (Button's "primary" variant, Card accents, and
   * anything else using Tailwind's `accent-violet`/`bg-accent-violet`
   * utility) read a hardcoded "#7c6cf6" static alias declared in
   * tailwind.config.ts's `accent.violet`, instead of this CSS variable.
   * Changing accentColor here will NOT re-color those components. This
   * settings UI sidesteps the bug by never using the `accent-violet`
   * Tailwind class itself — see styles/settings.css, which reads
   * var(--accent-primary) directly.
   */
  accentColor: string;
}

// ── General ──────────────────────────────────────────────────────────────

export interface GeneralSettings {
  /** Stub — not yet surfaced anywhere else in the app (e.g. a future
   * greeting/identity display). Safe to leave blank. */
  displayName: string;
}

// ── Capabilities ─────────────────────────────────────────────────────────

export interface CapabilitiesSettings {
  /**
   * Gates the Cmd/Ctrl+K command palette entirely — both the global
   * keydown listener and the (currently topbar-less, palette-only) toggle
   * respect this. See components/ui/command-palette.tsx.
   */
  commandPaletteEnabled: boolean;
  /**
   * Default state of the ActivityWatch toggle on /monitoring. Previously a
   * page-local `useState(false)` that reset every visit — now settings-
   * backed so the choice persists. The monitoring page still owns the
   * *live* on/off state for the current session; this is only the default
   * it initializes from (and writes back to, so the next visit remembers).
   */
  activityWatchEnabled: boolean;
  /**
   * Minimum combined duration, in minutes, an "other"-category app/site
   * must reach before it's counted as a real distraction. Read live by
   * NativeTracker on every poll (lib/tracker/native-tracker.ts), so
   * changing this mid-session takes effect on the very next poll without
   * restarting monitoring.
   *
   * Deliberately scoped to DISTRACTION commits only. The coding/watching
   * session floor stays pinned to session-builder.ts's
   * MIN_GROUP_DURATION_MS (60s) — that constant is untouched by this
   * setting. See native-tracker.ts's commitOtherSegments for where this
   * value is actually read and applied.
   */
  distractionFloorMinutes: number;
}

// ── Privacy / Data ───────────────────────────────────────────────────────

export interface PrivacySettings {
  /** Stub — no analytics pipeline exists yet. Kept false and unused until
   * one does; present so the Privacy/Data category isn't empty. */
  shareUsageAnalytics: boolean;
}

// ── Notifications (Phase 6) ──────────────────────────────────────────────
//
// One toggle per real event this app generates a notification for (see
// lib/notifications-context.tsx). The earlier stub shape here
// ("focusSessionAlerts" / "dailySummary") described events nothing in the
// app actually produces yet — a session-end alert and a scheduled daily
// digest are both real features, but neither is part of what this phase
// wires up, so replacing them with the events that actually fire keeps
// every toggle here truthful rather than aspirational.

export interface NotificationsSettings {
  /** Master switch — gates every OS-level notification below. The in-app
   * bell/history panel is unaffected by this; it's just a log and stays
   * useful even with OS notifications off. */
  enabled: boolean;
  reportGenerated: boolean;
  studyOrResourceAdded: boolean;
  streakMilestones: boolean;
  exportCompleted: boolean;
}

// ── Root shape ───────────────────────────────────────────────────────────

export interface AscendSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  capabilities: CapabilitiesSettings;
  privacy: PrivacySettings;
  notifications: NotificationsSettings;
}

/**
 * First-launch defaults. distractionFloorMinutes: 1 matches the existing
 * hardcoded MIN_GROUP_DURATION_MS (60_000ms) in session-builder.ts, so
 * shipping this feature changes no existing behavior until a person
 * actually opens Settings and changes it.
 */
export const DEFAULT_SETTINGS: AscendSettings = {
  general: {
    displayName: "",
  },
  appearance: {
    theme: "dark",
    accentColor: CURATED_ACCENT_SWATCHES[0].value,
  },
  capabilities: {
    commandPaletteEnabled: true,
    activityWatchEnabled: false,
    distractionFloorMinutes: 1,
  },
  privacy: {
    shareUsageAnalytics: false,
  },
  notifications: {
    enabled: false,
    reportGenerated: true,
    studyOrResourceAdded: true,
    streakMilestones: true,
    exportCompleted: true,
  },
};
