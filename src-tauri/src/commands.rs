// ── Native Commands ───────────────────────────────────────────────────────────
//
// Each command here becomes callable from the frontend via:
//   import { invoke } from "@tauri-apps/api/core";
//   await invoke("command_name", { arg: value });
//
// Organised by feature. Add modules here as the app grows.
// ─────────────────────────────────────────────────────────────────────────────

// Phase 6+: Tray icon management
// pub mod tray;

// Phase 6+: OS notifications
// pub mod notifications;

// Phase 6+: Auto-start on boot
// pub mod autostart;

// Phase 6+: Native filesystem access (reading editor files, git repos, etc.)
// pub mod filesystem;

// Phase 6+: Background daemon / activity poller bridge
// pub mod daemon;

// Phase 6+: Native window overlays (focus mode, timers)
// pub mod overlay;
