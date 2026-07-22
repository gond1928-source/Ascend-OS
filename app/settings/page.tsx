"use client";
/**
 * app/settings/page.tsx — Settings full-page breakout (design brief §11 /
 * §12). Leaves the persistent multi-pane shell entirely rather than being
 * squeezed into the normal workspace pane: a fixed, full-viewport overlay
 * (see .settings-page in styles/settings.css) with its own left category
 * rail and its own "Back to app" exit, replacing the old card-based
 * in-shell settings page.
 *
 * IMPLEMENTATION NOTE on "leaves the shell entirely": AppShell (the
 * persistent icon rail / nav panel / topbar / right panel) still mounts
 * underneath this page — the app's root layout wraps every route in it,
 * and restructuring that into per-route layout groups just for this one
 * page would be a much larger, riskier change to global routing than this
 * feature calls for. Instead this page renders as a fixed, full-viewport
 * overlay (position: fixed; inset: 0) that visually covers the shell
 * completely, with its own rail/header/exit. The person never sees the
 * persistent shell while Settings is open, which is what the brief is
 * actually asking for; only the DOM still contains it, invisibly, behind
 * this page.
 *
 * Every row here follows the settings-row pattern (SettingsRow component):
 * bold label + one-line muted description + right-aligned control,
 * hairline divider, no cards.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, User, Palette, AppWindow, SlidersHorizontal, ShieldCheck, Bell, Info,
} from "lucide-react";
import "@/styles/settings.css";
import { SettingsRow, SettingsToggle } from "@/components/settings/settings-row";
import { AccentSwatches } from "@/components/settings/accent-swatches";
import { AppRulesPanel } from "@/components/settings/app-rules-panel";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useSettings } from "@/hooks/useSettings";
import { useAppRules } from "@/hooks/useAppRules";

type CategoryId = "general" | "appearance" | "app-rules" | "capabilities" | "privacy" | "notifications" | "about";

const CATEGORIES: { id: CategoryId; label: string; icon: typeof User }[] = [
  { id: "general", label: "General", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "app-rules", label: "App Rules", icon: AppWindow },
  { id: "capabilities", label: "Capabilities", icon: SlidersHorizontal },
  { id: "privacy", label: "Privacy & Data", icon: ShieldCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "about", label: "About", icon: Info },
];

export default function SettingsPage() {
  const router = useRouter();
  const [active, setActive] = useState<CategoryId>("general");

  return (
    <div className="settings-page">
      <aside className="settings-rail">
        <button type="button" className="settings-back" onClick={() => router.back()}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to app
        </button>

        <div className="settings-rail-title">Settings</div>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              type="button"
              className={active === cat.id ? "settings-rail-item settings-rail-item--active" : "settings-rail-item"}
              onClick={() => setActive(cat.id)}
            >
              <Icon className="settings-rail-item-icon" />
              {cat.label}
            </button>
          );
        })}
      </aside>

      <main className="settings-content">
        <div className={active === "app-rules" ? "settings-content-inner settings-content-inner--wide" : "settings-content-inner"}>
          {active === "general" && <GeneralCategory />}
          {active === "appearance" && <AppearanceCategory />}
          {active === "app-rules" && <AppRulesCategory />}
          {active === "capabilities" && <CapabilitiesCategory />}
          {active === "privacy" && <PrivacyCategory />}
          {active === "notifications" && <NotificationsCategory />}
          {active === "about" && <AboutCategory />}
        </div>
      </main>
    </div>
  );
}

function CategoryHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="settings-category-header">
      <h1 className="settings-category-title">{title}</h1>
      <p className="settings-category-desc">{description}</p>
    </div>
  );
}

function GeneralCategory() {
  const { settings, updateSettings } = useSettings();

  return (
    <div>
      <CategoryHeader
        title="General"
        description="Basic identity info. Nothing here changes tracking behavior."
      />
      <div className="settings-section">
        <SettingsRow
          label="Display name"
          description="Shown in future greeting/identity surfaces — not read anywhere yet."
        >
          <input
            className="settings-input"
            type="text"
            placeholder="Your name"
            value={settings.general.displayName}
            onChange={(e) => updateSettings("general", { displayName: e.target.value })}
          />
        </SettingsRow>
      </div>
    </div>
  );
}

function AppearanceCategory() {
  const { settings, updateSettings } = useSettings();

  return (
    <div>
      <CategoryHeader
        title="Appearance"
        description="Theme and accent color. Accent is used sparingly across the app — active nav item, selected state, primary actions."
      />
      <div className="settings-section">
        <SettingsRow label="Theme" description="Switches surface/chrome styling. Dark is the default.">
          <ThemeToggle />
        </SettingsRow>
        <SettingsRow
          label="Accent color"
          description="Applied to active states, focus indicators, and primary actions throughout the app."
        >
          <AccentSwatches
            value={settings.appearance.accentColor}
            onChange={(hex) => updateSettings("appearance", { accentColor: hex })}
          />
        </SettingsRow>
      </div>
    </div>
  );
}

function AppRulesCategory() {
  return (
    <div>
      <CategoryHeader
        title="App Rules"
        description="Per-app overrides for tracking, classification, progress, and visibility. Rules apply live on the very next monitoring poll."
      />
      <div className="settings-section">
        <AppRulesPanel />
      </div>
    </div>
  );
}

function CapabilitiesCategory() {
  const { settings, updateSettings } = useSettings();

  return (
    <div>
      <CategoryHeader
        title="Capabilities"
        description="Turn optional features on or off."
      />
      <div className="settings-section">
        <SettingsRow
          label="Command palette"
          description="Cmd/Ctrl+K quick-switcher for navigating and running actions from anywhere."
        >
          <SettingsToggle
            checked={settings.capabilities.commandPaletteEnabled}
            onChange={(next) => updateSettings("capabilities", { commandPaletteEnabled: next })}
            label="Command palette enabled"
          />
        </SettingsRow>

        <SettingsRow
          label="ActivityWatch"
          description="Default state of the ActivityWatch toggle on the Monitoring page."
        >
          <SettingsToggle
            checked={settings.capabilities.activityWatchEnabled}
            onChange={(next) => updateSettings("capabilities", { activityWatchEnabled: next })}
            label="ActivityWatch enabled by default"
          />
        </SettingsRow>

        <SettingsRow
          label="Distraction threshold"
          description="Minutes an 'other' app must accumulate before it counts as a real distraction."
        >
          <input
            className="settings-input settings-input--narrow"
            type="number"
            min={1}
            step={1}
            value={settings.capabilities.distractionFloorMinutes}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n > 0) {
                updateSettings("capabilities", { distractionFloorMinutes: n });
              }
            }}
          />
        </SettingsRow>
      </div>
    </div>
  );
}

function PrivacyCategory() {
  const { settings, updateSettings } = useSettings();
  const { clearAll } = useAppRules();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div>
      <CategoryHeader
        title="Privacy & Data"
        description="Everything is stored locally on this device. Nothing here is sent anywhere."
      />
      <div className="settings-section">
        <SettingsRow
          label="Share usage analytics"
          description="Stub — no analytics pipeline exists yet."
        >
          <SettingsToggle
            checked={settings.privacy.shareUsageAnalytics}
            onChange={(next) => updateSettings("privacy", { shareUsageAnalytics: next })}
            label="Share usage analytics"
          />
        </SettingsRow>

        <SettingsRow
          label="Clear App Rules"
          description="Removes every per-app tracking/classification override. Sessions and distraction history are untouched."
        >
          <button
            type="button"
            className={confirmClear ? "settings-danger-btn settings-danger-btn--confirm" : "settings-danger-btn"}
            onClick={() => {
              if (confirmClear) {
                clearAll();
                setConfirmClear(false);
              } else {
                setConfirmClear(true);
              }
            }}
            onBlur={() => setConfirmClear(false)}
          >
            {confirmClear ? "Click again to confirm" : "Clear App Rules"}
          </button>
        </SettingsRow>
      </div>
    </div>
  );
}

function NotificationsCategory() {
  const { settings, updateSettings } = useSettings();

  return (
    <div>
      <CategoryHeader
        title="Notifications"
        description="In-app history always keeps a record of these. This section controls which ones also show up as OS-level notifications outside the app."
      />
      <div className="settings-section">
        <SettingsRow label="Enable notifications" description="Master switch for the OS-level notifications below.">
          <SettingsToggle
            checked={settings.notifications.enabled}
            onChange={(next) => updateSettings("notifications", { enabled: next })}
            label="Notifications enabled"
          />
        </SettingsRow>
        <SettingsRow label="Reports" description="Notify when a weekly or monthly report finishes generating.">
          <SettingsToggle
            checked={settings.notifications.reportGenerated}
            onChange={(next) => updateSettings("notifications", { reportGenerated: next })}
            label="Report notifications"
          />
        </SettingsRow>
        <SettingsRow label="Study & project resources" description="Notify when a study item or project resource is added.">
          <SettingsToggle
            checked={settings.notifications.studyOrResourceAdded}
            onChange={(next) => updateSettings("notifications", { studyOrResourceAdded: next })}
            label="Study and resource notifications"
          />
        </SettingsRow>
        <SettingsRow label="Streak milestones" description="Notify when you reach a new focus-consistency milestone.">
          <SettingsToggle
            checked={settings.notifications.streakMilestones}
            onChange={(next) => updateSettings("notifications", { streakMilestones: next })}
            label="Streak milestone notifications"
          />
        </SettingsRow>
        <SettingsRow label="Exports" description="Notify when a report finishes saving or downloading.">
          <SettingsToggle
            checked={settings.notifications.exportCompleted}
            onChange={(next) => updateSettings("notifications", { exportCompleted: next })}
            label="Export notifications"
          />
        </SettingsRow>
      </div>
    </div>
  );
}

function AboutCategory() {
  return (
    <div>
      <CategoryHeader title="About" description="Build info." />
      <div className="settings-section">
        <div className="settings-about-row">
          <span className="settings-about-row-label">Name</span>
          <span className="settings-about-row-value">Ascend OS</span>
        </div>
        <div className="settings-about-row">
          <span className="settings-about-row-label">Interface</span>
          <span className="settings-about-row-value">Identity reset — Settings + App Rules</span>
        </div>
      </div>
    </div>
  );
}
