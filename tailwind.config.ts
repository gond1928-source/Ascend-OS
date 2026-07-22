import type { Config } from "tailwindcss";

/**
 * tailwind.config.ts
 *
 * All semantic tokens (surface-*, ink.primary/secondary/muted, accent-*)
 * point to CSS variables so they auto-switch between themes.
 *
 * Static numeric shades (ink-50…ink-500, base-700…base-950) are hardcoded
 * to the dark-theme values with proper RGB notation so Tailwind's opacity
 * modifier (e.g. bg-base-900/70) works correctly.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Surfaces (CSS-var, auto theme-switch) ────────────────────────
        surface: {
          app:      "var(--surface-app)",
          sidebar:  "var(--surface-sidebar)",
          panel:    "var(--surface-panel)",
          elevated: "var(--surface-elevated)",
          overlay:  "var(--surface-overlay)",
        },

        // ── Ink / text (semantic + numeric shades) ───────────────────────
        // Numeric shades carry the same confirmed pure-neutral (R=G=B)
        // values as tokens.css's --text-primary/secondary/muted (anchored
        // at 300/500 and 50 below), interpolated for the in-between steps.
        // This is a config-only fix: every existing `ink-300`,
        // `bg-base-900/70`, etc. across Settings/Timer/Sessions/
        // Achievements/Share/Friends and elsewhere is corrected
        // automatically without touching those component files.
        ink: {
          primary:   "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted:     "var(--text-muted)",
          // Numeric shades — pure neutral, dark-theme values, alpha-value slot
          50:  "rgb(247 247 245 / <alpha-value>)",  // = --text-primary
          100: "rgb(225 225 223 / <alpha-value>)",
          200: "rgb(200 200 198 / <alpha-value>)",
          300: "rgb(181 180 176 / <alpha-value>)",  // = --text-secondary
          400: "rgb(155 155 153 / <alpha-value>)",
          500: "rgb(131 131 131 / <alpha-value>)",  // = --text-muted
          600: "rgb(105 105 105 / <alpha-value>)",
        },

        // ── Base surfaces (pure neutral dark scale, alpha-value slot) ────
        // Mapped onto the same confirmed elevation scale as tokens.css's
        // --surface-* (700≈overlay, 800≈elevated, 900≈panel, 950≈sidebar).
        base: {
          700: "rgb(54 54 54 / <alpha-value>)",   // = --surface-overlay
          800: "rgb(40 40 40 / <alpha-value>)",   // = --surface-elevated
          900: "rgb(28 28 28 / <alpha-value>)",   // = --surface-panel
          950: "rgb(19 19 19 / <alpha-value>)",   // = --surface-sidebar
        },

        // ── Accents (CSS-var semantic + static aliases) ──────────────────
        accent: {
          primary: "var(--accent-primary)",
          success: "var(--accent-success)",
          warning: "var(--accent-warning)",
          danger:  "var(--accent-danger)",
          info:    "var(--accent-info)",
          // Static aliases used in existing components
          violet: "#7c6cf6",
          sky:    "#4dc8f5",
          green:  "#3ddc97",
          amber:  "#f5b94d",
          rose:   "#f25f7a",
        },

        // ── Status (semantic activity/monitoring colors) ─────────────────
        // Pinned via --status-* vars, which are declared once in tokens.css
        // and never overridden by any theme file — these must look the
        // same in Dark, Glass, and any future theme.
        status: {
          coding:      "var(--status-coding)",
          learning:    "var(--status-learning)",
          distraction: "var(--status-distraction)",
          warning:     "var(--status-warning)",
          error:       "var(--status-error)",
          success:     "var(--status-success)",
          idle:        "var(--status-idle)",
        },

        // ── Borders ──────────────────────────────────────────────────────
        border: {
          subtle:  "var(--border-subtle)",
          default: "var(--border-default)",
          strong:  "var(--border-strong)",
          accent:  "var(--border-accent)",
        },
      },

      borderRadius: {
        sm:   "var(--radius-sm)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        xl:   "var(--radius-xl)",
        full: "var(--radius-full)",
      },

      boxShadow: {
        sm:   "var(--shadow-sm)",
        md:   "var(--shadow-md)",
        lg:   "var(--shadow-lg)",
        glow: "var(--shadow-glow)",
      },

      transitionDuration: {
        fast:  "100ms",
        base:  "180ms",
        slow:  "320ms",
      },

      fontFamily: {
        display: ["var(--font-display)"],
        body:    ["var(--font-body)"],
        mono:    ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
