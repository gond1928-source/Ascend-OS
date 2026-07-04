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

// ── Future native feature hooks (stub signatures for Phase 6+) ───────────────

/**
 * Phase 6: Show a native OS notification.
 * Requires tauri-plugin-notification in Cargo.toml.
 *
 * export async function showNotification(title: string, body: string) {
 *   await tauriInvoke("plugin:notification|notify", { title, body });
 * }
 */

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
