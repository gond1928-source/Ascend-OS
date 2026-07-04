/**
 * GET /api/native-tracker
 *
 * Returns a WindowSnapshot for the currently active window + user idle state.
 * 
 * v2 additions:
 *   - idleSeconds: precise seconds since last input (used for coding idle threshold)
 *   - keyboardActivityDetected: true if idleSeconds < 10 (keyboard was active this poll)
 *
 * Platform detection:
 *   macOS  → AppleScript via osascript
 *   Linux  → xdotool + xprintidle
 *   Win32  → PowerShell GetForegroundWindow + GetLastInputInfo
 */

import { NextResponse } from "next/server";
import { WindowSnapshot, DEFAULT_TRACKER_CONFIG } from "@/lib/tracker/types";
import { execFile } from "child_process";
import { promisify } from "util";

export const dynamic = "force-dynamic";

const exec = promisify(execFile);

/**
 * Keyboard activity threshold: if idle < this many seconds,
 * the user was actively typing/clicking very recently.
 * Set low (10s) to ensure we only count genuine active typing.
 */
const KEYBOARD_ACTIVE_THRESHOLD_SECS = 10;

/**
 * "All tracking pauses" idle threshold, in seconds — derived from the same
 * config the client-side tracker uses, so this never drifts out of sync
 * with TrackerConfig.idleThresholdMs (spec: pause everything after 60s idle).
 */
const IDLE_THRESHOLD_SECS = DEFAULT_TRACKER_CONFIG.idleThresholdMs / 1000;

// ── macOS ─────────────────────────────────────────────────────────────────────

async function getActiveWindowDarwin(): Promise<Partial<WindowSnapshot>> {
  try {
    const script = [
      'tell application "System Events"',
      '  set frontApp to first application process whose frontmost is true',
      '  set appName to name of frontApp',
      '  set windowTitle to ""',
      '  try',
      '    set windowTitle to name of front window of frontApp',
      '  end try',
      'end tell',
      'set idleTime to 0',
      'try',
      '  set idleTime to (do shell script "python3 -c \\"import Quartz; e=Quartz.CGEventSourceSecondsSinceLastEventType; print(int(e(0,4294967295)))\\"") as integer',
      'end try',
      'return appName & "||" & windowTitle & "||" & idleTime',
    ].join("\n");

    const { stdout } = await exec("osascript", ["-e", script], { timeout: 2500 });
    const parts = stdout.trim().split("||");
    const appName = parts[0]?.trim() ?? "";
    const windowTitle = parts[1]?.trim() ?? "";
    const idleSeconds = parseInt(parts[2] ?? "0", 10);

    return {
      appName,
      windowTitle,
      idleSeconds,
      isUserActive: idleSeconds < IDLE_THRESHOLD_SECS,
      keyboardActivityDetected: idleSeconds < KEYBOARD_ACTIVE_THRESHOLD_SECS,
    };
  } catch (err) {
    console.warn("[native-tracker] macOS detection failed:", err instanceof Error ? err.message : err);
    return {};
  }
}

// ── Linux ─────────────────────────────────────────────────────────────────────

async function getActiveWindowLinux(): Promise<Partial<WindowSnapshot>> {
  try {
    const { stdout: winId } = await exec("xdotool", ["getactivewindow"], { timeout: 1500 });
    const id = winId.trim();

    const [{ stdout: title }, { stdout: pidStr }] = await Promise.all([
      exec("xdotool", ["getwindowname", id], { timeout: 1500 }),
      exec("xdotool", ["getwindowpid", id], { timeout: 1500 }),
    ]);

    let appName = "";
    try {
      const { stdout: comm } = await exec("cat", [`/proc/${pidStr.trim()}/comm`], { timeout: 500 });
      appName = comm.trim();
    } catch {
      appName = "unknown";
    }

    let idleMs = 0;
    try {
      const { stdout: idle } = await exec("xprintidle", [], { timeout: 500 });
      idleMs = parseInt(idle.trim(), 10);
    } catch { /* xprintidle not installed — assume active */ }

    const idleSeconds = Math.round(idleMs / 1000);

    return {
      appName,
      windowTitle: title.trim(),
      idleSeconds,
      isUserActive: idleSeconds < IDLE_THRESHOLD_SECS,
      keyboardActivityDetected: idleSeconds < KEYBOARD_ACTIVE_THRESHOLD_SECS,
    };
  } catch (err) {
    console.warn("[native-tracker] Linux detection failed:", err instanceof Error ? err.message : err);
    return {};
  }
}

// ── Windows ───────────────────────────────────────────────────────────────────

async function getActiveWindowWin32(): Promise<Partial<WindowSnapshot>> {
  const ps = `
$sig = @'
using System;
using System.Runtime.InteropServices;
public class WinInfo {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO p);
  [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
}
'@
Add-Type -TypeDefinition $sig
$hwnd = [WinInfo]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 512
[WinInfo]::GetWindowText($hwnd, $sb, 512) | Out-Null
$pid = 0
[WinInfo]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
$proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
$li = New-Object WinInfo+LASTINPUTINFO
$li.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($li)
[WinInfo]::GetLastInputInfo([ref]$li) | Out-Null
$idleMs = [Environment]::TickCount - $li.dwTime
Write-Output "$($proc.ProcessName)||$($sb.ToString())||$idleMs"
`.trim();

  try {
    const { stdout } = await exec("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      timeout: 4000,
    });
    const parts = stdout.trim().split("||");
    const appName = parts[0]?.trim() ?? "";
    const windowTitle = parts[1]?.trim() ?? "";
    const idleMs = parseInt(parts[2] ?? "0", 10);
    const idleSeconds = Math.round(idleMs / 1000);

    return {
      appName,
      windowTitle,
      idleSeconds,
      isUserActive: idleSeconds < IDLE_THRESHOLD_SECS,
      keyboardActivityDetected: idleSeconds < KEYBOARD_ACTIVE_THRESHOLD_SECS,
    };
  } catch (err) {
    console.warn("[native-tracker] Win32 detection failed:", err instanceof Error ? err.message : err);
    return {};
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse<WindowSnapshot>> {
  const platform = process.platform;
  let partial: Partial<WindowSnapshot> = {};

  if (platform === "darwin") {
    partial = await getActiveWindowDarwin();
  } else if (platform === "linux") {
    partial = await getActiveWindowLinux();
  } else if (platform === "win32") {
    partial = await getActiveWindowWin32();
  } else {
    console.warn(`[native-tracker] Unsupported platform: ${platform}`);
  }

  const snapshot: WindowSnapshot = {
    capturedAt: Date.now(),
    appName: partial.appName || "Unknown",
    windowTitle: partial.windowTitle || "",
    url: partial.url,
    processName: partial.processName,
    isUserActive: partial.isUserActive ?? true,
    idleSeconds: partial.idleSeconds ?? 0,
    keyboardActivityDetected: partial.keyboardActivityDetected ?? false,
  };

  return NextResponse.json(snapshot);
}
