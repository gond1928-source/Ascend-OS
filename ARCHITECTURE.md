# Ascend OS — Architecture Reference

Phase 5 foundation. Read this before adding new features.

---

## Folder Structure

```
ascend-os/
│
├── app/                        # Next.js App Router pages + layouts
│   └── layout.tsx              # Root layout: fonts, ThemeProvider, globals
│
├── components/
│   └── ui/
│       └── ThemeToggle.tsx     # Drop-in theme switcher button
│
├── lib/
│   ├── tauri/
│   │   ├── bridge.ts           # ONLY file that imports @tauri-apps/api
│   │   └── useTauri.ts         # React hook: isDesktop, loading
│   │
│   ├── theme/
│   │   └── ThemeProvider.tsx   # Theme context + useTheme() hook
│   │
│   └── tracker/                # Existing session tracking system (unchanged)
│
├── styles/
│   ├── globals.css             # Imports tokens + themes, base resets
│   ├── tokens.css              # Semantic CSS variable definitions (:root)
│   └── themes/
│       ├── dark.css            # [data-theme="dark"] overrides
│       └── glass.css           # [data-theme="glass"] overrides (Phase 6)
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # Tauri app entry, builder, setup
│   │   └── commands.rs         # Native Rust command modules (stubbed)
│   ├── Cargo.toml              # Rust deps, native feature flags commented
│   └── tauri.conf.json         # Tauri window config, build paths
│
├── next.config.js              # Static export + unoptimized images for Tauri
├── package.json                # Added tauri:dev / tauri:build scripts
└── tailwind.config.ts          # Tailwind colors/shadows mapped to CSS vars
```

---

## Part 1 — Tauri Desktop Foundation

### What was fixed

| Problem | Fix |
|---|---|
| `tauri.conf.json` had wrong `productName` casing | Changed to `"Ascend OS"` |
| Window started too small (800×600) | Set to 1280×800, min 900×600 |
| `visible: false` missing | Added — prevents white flash on cold start |
| `@tauri-apps/api` not in dependencies | Added to `package.json` |
| No `tauri:dev` / `tauri:build` npm scripts | Added |
| `next.config.js` missing `images: { unoptimized: true }` | Added — required for static export |

### How to run

```bash
npm run tauri:dev    # Starts Next.js dev server + Tauri window
npm run tauri:build  # Builds static export + packages desktop app
```

### How future native features plug in

Every native feature follows this pattern — no exceptions:

1. **Rust side** (`src-tauri/src/commands.rs`): add a `#[tauri::command]` function, register it in `main.rs` inside `generate_handler![]`.
2. **Bridge** (`lib/tauri/bridge.ts`): add a typed wrapper function (see existing stubs at the bottom of that file).
3. **React** (`hooks/` or a component): consume via the bridge wrapper, never import `@tauri-apps/api` directly.

This pattern ensures the app degrades gracefully in a browser (dev mode, web deployment) and that Tauri coupling never leaks into UI components.

**Planned features and where they slot in:**

| Feature | Rust plugin | Bridge function | 
|---|---|---|
| OS notifications | `tauri-plugin-notification` | `showNotification()` |
| Launch at login | `tauri-plugin-autostart` | `setAutostart()` |
| Native filesystem | `tauri-plugin-fs` | `readTextFile()` etc. |
| System tray | Tauri built-in | `tray` module in `commands.rs` |
| Background daemon | Custom Rust thread | Event-based via `tauriListen()` |
| Window overlays | Second Tauri window | `overlay` module in `commands.rs` |

---

## Part 2 — Theme Architecture

### How it works

1. `styles/tokens.css` defines every semantic slot as a CSS variable on `:root`. These are the defaults (dark theme values).
2. `styles/themes/dark.css` re-declares the same variables under `[data-theme="dark"]`.
3. `styles/themes/glass.css` re-declares them under `[data-theme="glass"]` with different values.
4. `ThemeProvider` sets `data-theme` on `<html>`. The correct CSS file's variables win via CSS specificity. No JS color injection, no flicker.
5. Tailwind's config maps its color/shadow/radius tokens to these same CSS variables, so Tailwind classes automatically theme-switch too.

### Token naming convention

```
--surface-*        Background layers
--text-*           Typography / foreground
--accent-*         Interactive, highlight colors
--border-*         Outlines and dividers
--shadow-*         Elevation
--blur-*           backdrop-filter values
--radius-*         Border radius
--space-*          Layout spacing
--transition-*     Animation timing
--font-*           Typefaces
```

### Adding a new theme

1. Create `styles/themes/your-theme.css`:
```css
[data-theme="your-theme"] {
  --surface-app: /* ... */;
  --text-primary: /* ... */;
  /* override every token */
}
```
2. Import it in `styles/globals.css`:
```css
@import "./themes/your-theme.css";
```
3. Add it to the `Theme` union in `lib/theme/ThemeProvider.tsx`:
```ts
export type Theme = "dark" | "glass" | "your-theme";
```
4. Done. `ThemeProvider`, `ThemeToggle`, and all components work automatically.

### Rules for components

- **Never use raw hex values** in component styles or Tailwind classes.
- Always reference a token: `var(--surface-panel)`, `bg-surface-panel`, `text-ink-secondary`.
- If you need a color that doesn't have a token yet, **add the token first** in `tokens.css` and both theme files, then use it.

---

## Part 3 — Glass Theme

The glass theme (`styles/themes/glass.css`) is fully defined and ready. It uses:

- **Translucent surfaces**: `rgba(255,255,255,0.45–0.80)` — alpha so the background gradient bleeds through.
- **Soft gradient app background**: `linear-gradient(135deg, #e8eaf0, #d6d9e4)` applied to `body`.
- **`backdrop-filter: blur()`**: the defining glass effect. `.glass-panel` and `.glass-sidebar` utility classes apply this.
- **Softer radius**: `--radius-md` is 12px vs 10px in dark theme — rounder, more macOS-like.
- **Multi-layer shadows**: thin, cool-tinted shadows that give glass panels depth without harsh drop shadows.
- **Muted accents**: same hue family but slightly darker/richer for contrast on light backgrounds.

To activate in Phase 6: call `setTheme("glass")` or click `ThemeToggle`. Then rebuild components using `var(--surface-panel)` and add `.glass-panel` classname to panels — the blur will activate automatically.

---

## Technical Debt & Future Risks

| Risk | Severity | Notes |
|---|---|---|
| `backdrop-filter` GPU cost | Medium | On low-end Windows machines, heavy blur on many panels can drop FPS. Mitigate by limiting `.glass-panel` to 2–3 surfaces, not every card. |
| `output: "export"` + dynamic routes | Medium | Next.js static export doesn't support server-side dynamic routes. All pages must be statically generated or client-only. |
| Prisma in a static export | High | `@prisma/client` requires a Node.js runtime. In a Tauri app this means the DB layer must move to a Rust SQLite plugin (Phase 6+) or a local API server sidecar. Right now it works in dev (`next dev`), not in the built Tauri binary. |
| localStorage in Tauri | Low | Works in current Tauri 2, but sandboxed environments may restrict it. The bridge falls back gracefully — theme preference is lost but nothing breaks. |
| `@tauri-apps/api` version drift | Low | Pin to `^2.0.0`. Tauri 2 API surface is stable but check release notes before upgrading. |
| No Rust tests | Low | `commands.rs` has no unit tests. Add `#[cfg(test)]` modules as commands grow. |
