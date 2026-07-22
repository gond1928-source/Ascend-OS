/**
 * constants/self-identity.ts — how the tracker recognizes "this is Ascend
 * OS itself" so it can be hard-excluded everywhere it would otherwise show
 * up (native-tracker's poll loop, and the App Rules panel's live
 * "currently focused" poll) — a hard exclusion baked into the pipeline,
 * NOT a configurable AppRule a person could accidentally re-enable. There
 * is no valid reason for this app to log time spent inside itself.
 *
 * MATCHING RULE — read this before changing anything here:
 * Matched ONLY against the OS-level process identity fields
 * (WindowSnapshot.appName, and processName when the OS provides one) —
 * NEVER against windowTitle. Process identity is what the OS itself
 * assigns to the running executable/bundle and can't be influenced by
 * page/document content; windowTitle is free text that could legitimately
 * coincide with "Ascend OS" for an unrelated reason (a browser tab, a
 * video title, a note's heading, someone else's app literally named
 * similarly) and would wrongly exclude real activity that just happens to
 * have a matching title. Matching is EXACT (normalized: trim + lowercase),
 * never a substring/fuzzy match — so an unrelated app or window that
 * merely contains "ascend" or "os" somewhere in its name is never caught
 * by this.
 */

/**
 * Every value the OS is known to report for THIS app's own process/bundle
 * identity, across how it can be launched/packaged:
 *  - "ascend-os"  — package.json's `name`; this is what a packaged Tauri
 *    build's process/bundle identifier resolves to today (confirmed
 *    directly from a live "Currently focused" row while this app itself
 *    was the focused window).
 *  - "ascend os"  — the human-readable product name (Next.js metadata
 *    `title`, and what a platform-specific packager reporting the display
 *    name instead of the npm slug — e.g. macOS's CFBundleName-derived
 *    process name — would report instead).
 * If a future packaging change reports some other exact value, add it
 * here rather than loosening the match into a substring check.
 */
export const SELF_APP_IDENTITIES: readonly string[] = ["ascend-os", "ascend os"];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** True if a raw process-identity string (appName or processName — never
 * windowTitle) is an exact, case-insensitive match for this app itself. */
export function isSelfProcessName(name: string | undefined): boolean {
  if (!name) return false;
  const normalized = normalize(name);
  return SELF_APP_IDENTITIES.some((id) => id === normalized);
}

/**
 * True if a WindowSnapshot is Ascend OS's own window. Checks appName
 * (always present) and processName (present on some platforms — e.g. an
 * executable path basename that can differ from the reported app name);
 * either matching is sufficient, since both are OS-assigned process
 * identity fields, never user/content-driven text. windowTitle is
 * deliberately never inspected — see this file's header.
 */
export function isSelfSnapshot(snapshot: { appName: string; processName?: string }): boolean {
  return isSelfProcessName(snapshot.appName) || isSelfProcessName(snapshot.processName);
}
