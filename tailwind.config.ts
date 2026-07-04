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
        ink: {
          primary:   "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted:     "var(--text-muted)",
          // Numeric shades — dark-theme values with alpha-value slot
          50:  "rgb(245 246 250 / <alpha-value>)",
          100: "rgb(234 237 245 / <alpha-value>)",
          200: "rgb(208 212 228 / <alpha-value>)",
          300: "rgb(176 184 204 / <alpha-value>)",
          400: "rgb(140 148 170 / <alpha-value>)",
          500: "rgb(113 122 146 / <alpha-value>)",
          600: "rgb(89  96 120 / <alpha-value>)",
        },

        // ── Base surfaces (dark scale with alpha-value slot) ─────────────
        base: {
          700: "rgb(38 47 66   / <alpha-value>)",
          800: "rgb(27 34 48   / <alpha-value>)",
          900: "rgb(20 25 35   / <alpha-value>)",
          950: "rgb(14 18 24   / <alpha-value>)",
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
