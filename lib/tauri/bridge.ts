/**
 * lib/tauri/bridge.ts
 *
 * The ONLY place in the frontend that touches @tauri-apps/api.
 * All other code goes through this file, never imports Tauri directly.
 *
 * Why: Tauri APIs throw in a browser (non-Tauri) context. This wrapper
 * checks the environment first, logs clearly in dev, and returns safe
 * fallbacks — so the app stays usable in `next dev` without a Tauri window.
 *
 * Usage:
 *   import { tauriInvoke, isTauri } from "@/lib/tauri/bridge";
 *
 *   // Call a Rust command:
 *   const result = await tauriInvoke<string>("get_active_window");
 *
 *   // Check environment:
 *   if (isTauri()) { ... }
 */

/** True when running inside a Tauri desktop window. */
export function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== "undefined"
  );
}

/**
 * Invoke a Rust command by name.
 * Returns undefined if not in a Tauri context.
 *
 * @param command  The Rust command name (snake_case, matches #[tauri::command])
 * @param args     Arguments to pass to the command
 */
export async function tauriInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T | undefined> {
  if (!isTauri()) {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[tauri:bridge] Not in Tauri — skipping invoke("${command}")`);
    }
    return undefined;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<T>(command, args);
  } catch (err) {
    console.error(`[tauri:bridge] invoke("${command}") failed:`, err);
    return undefined;
  }
}

/**
 * Emit a Tauri event to the Rust backend.
 * No-op if not in Tauri context.
 */
export async function tauriEmit(
  event: string,
  payload?: unknown,
): Promise<void> {
  if (!isTauri()) return;
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit(event, payload);
  } catch (err) {
    console.error(`[tauri:bridge] emit("${event}") failed:`, err);
  }
}

/**
 * Listen to a Tauri event from the Rust backend.
 * Returns an unsubscribe function. No-op if not in Tauri context.
 *
 * Usage:
 *   const unlisten = await tauriListen("session:committed", (payload) => { ... });
 *   // Later:
 *   unlisten();
 */
export async function tauriListen<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  if (!isTauri()) return () => {};
  try {
    const { listen } = await import("@tauri-apps/api/event");
    const unlisten = await listen<T>(event, (e) => handler(e.payload));
    return unlisten;
  } catch (err) {
    console.error(`[tauri:bridge] listen("${event}") failed:`, err);
    return () => {};
  }
}

/**
 * fetch() that goes through @tauri-apps/plugin-http when running inside
 * Tauri (required in v2 — the webview's global fetch can't reach
 * arbitrary local ports like ActivityWatch's localhost:5600 without the
 * http plugin + a scoped capability, see src-tauri/capabilities/default.json),
 * and falls back to the ordinary browser fetch otherwise so `next dev` in a
 * plain browser tab keeps working exactly like every other bridge helper here.
 */
export async function tauriFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  if (!isTauri()) {
    return fetch(input, init);
  }
  const { fetch: pluginFetch } = await import("@tauri-apps/plugin-http");
  return pluginFetch(input, init);
}

// ── Native save-file flow (Phase 4 fix-up: unified Save action) ────────────

export type SaveFileResult =
  | { status: "saved"; path: string }
  | { status: "downloaded"; path: string } // browser fallback, not a real filesystem path
  | { status: "cancelled" }
  | { status: "error"; message: string };

/**
 * Native "Save As" flow: opens the OS save dialog (@tauri-apps/plugin-dialog)
 * and writes the given bytes/text to the chosen path (@tauri-apps/plugin-fs).
 *
 * Requires both plugins registered on the Rust side — NOT present in this
 * repo as uploaded (no src-tauri/ directory at all here), so until that's
 * wired up (see src-tauri/capabilities/default.json: "dialog:allow-save",
 * "fs:allow-write-text-file", "fs:allow-write-file") this will simply hit
 * the browser fallback below, same as running in `next dev`.
 *
 * Outside Tauri (or if either plugin call fails), falls back to a plain
 * browser download via an object URL — the app stays usable in a plain
 * browser tab, same resilience pattern as tauriFetch.
 */
export async function tauriSaveFile(opts: {
  defaultName: string;
  filters: { name: string; extensions: string[] }[];
  data: string | Uint8Array;
  mimeType: string;
}): Promise<SaveFileResult> {
  if (!isTauri()) {
    return browserDownloadFallback(opts.defaultName, opts.data, opts.mimeType);
  }

  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({ defaultPath: opts.defaultName, filters: opts.filters });
    if (!path) {
      return { status: "cancelled" };
    }

    if (typeof opts.data === "string") {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      await writeTextFile(path, opts.data);
    } else {
      const { writeFile } = await import("@tauri-apps/plugin-fs");
      await writeFile(path, opts.data);
    }

    return { status: "saved", path };
  } catch (err) {
    console.error("[tauri:bridge] tauriSaveFile failed:", err);
    // Plugins likely aren't registered on the Rust side yet — fall back
    // to a browser download rather than leaving Save as a dead end.
    return browserDownloadFallback(opts.defaultName, opts.data, opts.mimeType);
  }
}

function browserDownloadFallback(filename: string, data: string | Uint8Array, mimeType: string): SaveFileResult {
  try {
    const blob = data instanceof Uint8Array ? new Blob([data], { type: mimeType }) : new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { status: "downloaded", path: filename };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Download failed" };
  }
}

/**
 * Open a URL in the OS's default browser.
 *
 * Plain `window.open(url, "_blank")` — used everywhere in this app before
 * this existed — does not reliably do that from inside a Tauri webview
 * (WRY): depending on platform/config it can silently no-op or try to
 * open a new in-app webview window instead of the system browser, which
 * is why "open externally" actions could appear to do nothing.
 *
 * This goes through @tauri-apps/plugin-opener's `openUrl()` — the plugin
 * Tauri v2 ships specifically for "open this URL/file in the default
 * external application" (an earlier version of this function used
 * @tauri-apps/plugin-shell's `open()` instead, which is the wrong plugin:
 * Shell is for spawning arbitrary child processes/commands, a much
 * broader and more sensitive capability than just opening a link, and
 * its `shell:allow-open` permission isn't even valid until the Shell
 * plugin itself is registered on the Rust side — Opener is the correct,
 * narrowly-scoped tool for this specific job).
 *
 * Same resilience pattern as tauriFetch/tauriSaveFile above: falls back
 * to window.open outside a Tauri context (e.g. `next dev` in a plain
 * browser tab) or if the plugin call itself fails.
 *
 * ONE-TIME SETUP THIS FILE CAN'T DO FOR YOU: the Opener plugin needs to
 * be added on the Rust side too — not present in this repo as uploaded
 * (see tauriSaveFile's comment above for the same caveat, no src-tauri/
 * folder exists here at all). Three steps in your actual Tauri project:
 *
 *   1. Cargo.toml:  tauri-plugin-opener = "2"
 *   2. src-tauri/src/lib.rs, in the Builder chain:
 *        .plugin(tauri_plugin_opener::init())
 *   3. src-tauri/capabilities/default.json, add to "permissions":
 *        "opener:default"
 *      (this default set already covers https:/http:/mailto:/tel: URLs —
 *      no per-URL scope config needed for a plain "open this link" case
 *      like ours; only opener:allow-open-path/open-url with an explicit
 *      scope if you need something narrower than the default set)
 *
 * Registering the plugin in Cargo.toml + lib.rs is also what makes
 * "opener:*" permission identifiers valid in the capabilities schema at
 * all — trying to reference them before the plugin is registered is
 * exactly the "invalid value, not accepted by the current schema" error
 * this replaced.
 */
export async function tauriOpenUrl(url: string): Promise<void> {
  if (!url) return;

  if (isTauri()) {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      return;
    } catch (err) {
      console.error("[tauri:bridge] tauriOpenUrl failed, falling back to window.open:", err);
    }
  }

  window.open(url, "_blank", "noreferrer");
}

// ── Native OS notifications (Phase 6) ───────────────────────────────────────
//
// Uses @tauri-apps/plugin-notification (the official plugin — verified via
// a real search against current docs, not assumed from training data; not
// to be confused with the third-party `tauri-plugin-notifications` fork,
// which is a different package with FCM/APNs push baggage this app doesn't
// need). Requires tauri-plugin-notification in Cargo.toml + lib.rs +
// "notification:default" in capabilities/default.json — see src-tauri/.
//
// Deliberately NOT used for save confirmations (Phase 4 fix-up) — those
// stay on the in-app toast (lib/shell-context.tsx's `toast` slice). This is
// only for real OS-level notifications, gated by lib/notifications-context.tsx
// against the Settings → Notifications toggles.
//
// KNOWN LIMITATION (confirmed against Tauri's own docs, not guessed): this
// plugin's Actions API — the thing that would let a click on the OS
// notification hand a payload back into the app for deep-linking — is
// documented as mobile-only. On Windows/macOS there is no supported click
// callback here, so a click just does whatever the OS does by default
// (typically focus/dismiss). Deep-linking to the specific report/resource/
// etc. only happens through the in-app bell panel, not the OS notification
// itself. Don't wire up an onAction listener expecting desktop clicks to
// fire it — it won't.

let permissionCheckedThisSession = false;

/**
 * Ensures notification permission is granted, asking once if needed.
 * No-op (returns false) outside Tauri.
 */
async function ensureNotificationPermission(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { isPermissionGranted, requestPermission } = await import("@tauri-apps/plugin-notification");
    if (await isPermissionGranted()) return true;
    // Only prompt once per app session — repeatedly asking after a "deny"
    // would be exactly the kind of loud, nagging behavior this app's
    // identity (design brief: calm, quiet, no hype) rules out.
    if (permissionCheckedThisSession) return false;
    permissionCheckedThisSession = true;
    const result = await requestPermission();
    return result === "granted";
  } catch (err) {
    console.error("[tauri:bridge] notification permission check failed:", err);
    return false;
  }
}

/**
 * Show a native OS notification. Silently no-ops outside Tauri or if
 * permission isn't granted — callers don't need to branch on environment,
 * same resilience pattern as the rest of this file.
 */
export async function showNotification(title: string, body: string): Promise<void> {
  if (!isTauri()) return;
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return;
    const { sendNotification } = await import("@tauri-apps/plugin-notification");
    sendNotification({ title, body });
  } catch (err) {
    console.error("[tauri:bridge] showNotification failed:", err);
  }
}

/**
 * Phase 6: Set app to launch at login.
 * Requires tauri-plugin-autostart in Cargo.toml.
 *
 * export async function setAutostart(enabled: boolean) {
 *   await tauriInvoke(enabled ? "plugin:autostart|enable" : "plugin:autostart|disable");
 * }
 */

/**
 * Phase 6: Read a file from the native filesystem.
 * Requires tauri-plugin-fs in Cargo.toml.
 *
 * export async function readTextFile(path: string): Promise<string | undefined> {
 *   return tauriInvoke<string>("plugin:fs|read_text_file", { path });
 * }
 */
