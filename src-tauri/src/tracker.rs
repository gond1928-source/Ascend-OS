use serde::Serialize;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Windows CREATE_NO_WINDOW flag. Without this, every `Command::new("powershell")`
/// spawn below pops a real, visible console window for a split second — that's
/// the flashing terminal you see once per poll. It can also briefly steal
/// foreground focus right as GetForegroundWindow() runs inside it, which is why
/// the tracker sometimes reports "powershell"/"WindowsTerminal" instead of
/// whatever app you were actually using (e.g. VS Code).
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const KEYBOARD_ACTIVE_THRESHOLD_SECS: u64 = 10;
const DEFAULT_IDLE_THRESHOLD_SECS: u64 = 60; // mirrors DEFAULT_TRACKER_CONFIG.idleThresholdMs

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WindowSnapshot {
    pub captured_at: u64,
    pub app_name: String,
    pub window_title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub process_name: Option<String>,
    pub is_user_active: bool,
    pub idle_seconds: u64,
    pub keyboard_activity_detected: bool,
}

struct RawSnapshot {
    app_name: String,
    window_title: String,
    idle_seconds: u64,
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64
}

#[cfg(target_os = "macos")]
fn get_active_window() -> Option<RawSnapshot> {
    let script = r#"
tell application "System Events"
  set frontApp to first application process whose frontmost is true
  set appName to name of frontApp
  set windowTitle to ""
  try
    set windowTitle to name of front window of frontApp
  end try
end tell
set idleTime to 0
try
  set idleTime to (do shell script "python3 -c \"import Quartz; e=Quartz.CGEventSourceSecondsSinceLastEventType; print(int(e(0,4294967295)))\"") as integer
end try
return appName & "||" & windowTitle & "||" & idleTime
"#;

    let output = Command::new("osascript").arg("-e").arg(script).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parts: Vec<&str> = stdout.trim().split("||").collect();
    Some(RawSnapshot {
        app_name: parts.first().unwrap_or(&"").trim().to_string(),
        window_title: parts.get(1).unwrap_or(&"").trim().to_string(),
        idle_seconds: parts.get(2).unwrap_or(&"0").trim().parse().unwrap_or(0),
    })
}

#[cfg(target_os = "linux")]
fn get_active_window() -> Option<RawSnapshot> {
    let win_id_out = Command::new("xdotool").arg("getactivewindow").output().ok()?;
    let win_id = String::from_utf8_lossy(&win_id_out.stdout).trim().to_string();
    if win_id.is_empty() {
        return None;
    }

    let title_out = Command::new("xdotool").args(["getwindowname", &win_id]).output().ok()?;
    let title = String::from_utf8_lossy(&title_out.stdout).trim().to_string();

    let pid_out = Command::new("xdotool").args(["getwindowpid", &win_id]).output().ok()?;
    let pid = String::from_utf8_lossy(&pid_out.stdout).trim().to_string();

    let app_name = Command::new("cat")
        .arg(format!("/proc/{}/comm", pid))
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let idle_ms: u64 = Command::new("xprintidle")
        .output()
        .ok()
        .and_then(|o| String::from_utf8_lossy(&o.stdout).trim().parse().ok())
        .unwrap_or(0);

    Some(RawSnapshot {
        app_name,
        window_title: title,
        idle_seconds: idle_ms / 1000,
    })
}

#[cfg(target_os = "windows")]
fn get_active_window() -> Option<RawSnapshot> {
    let ps_script = r#"
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
$procId = 0
[WinInfo]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
$proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
$li = New-Object WinInfo+LASTINPUTINFO
$li.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($li)
[WinInfo]::GetLastInputInfo([ref]$li) | Out-Null
$idleMs = [Environment]::TickCount - $li.dwTime
Write-Output "$($proc.ProcessName)||$($sb.ToString())||$idleMs"
"#;

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", ps_script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parts: Vec<&str> = stdout.trim().split("||").collect();
    let idle_ms: u64 = parts.get(2).unwrap_or(&"0").trim().parse().unwrap_or(0);

    Some(RawSnapshot {
        app_name: parts.first().unwrap_or(&"").trim().to_string(),
        window_title: parts.get(1).unwrap_or(&"").trim().to_string(),
        idle_seconds: idle_ms / 1000,
    })
}

#[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
fn get_active_window() -> Option<RawSnapshot> {
    None
}

#[tauri::command]
pub fn get_window_snapshot(idle_threshold_secs: Option<u64>) -> WindowSnapshot {
    let threshold = idle_threshold_secs.unwrap_or(DEFAULT_IDLE_THRESHOLD_SECS);
    let raw = get_active_window();

    match raw {
        Some(r) => WindowSnapshot {
            captured_at: now_ms(),
            app_name: if r.app_name.is_empty() { "Unknown".into() } else { r.app_name },
            window_title: r.window_title,
            url: None,
            process_name: None,
            is_user_active: r.idle_seconds < threshold,
            idle_seconds: r.idle_seconds,
            keyboard_activity_detected: r.idle_seconds < KEYBOARD_ACTIVE_THRESHOLD_SECS,
        },
        None => WindowSnapshot {
            captured_at: now_ms(),
            app_name: "Unknown".into(),
            window_title: String::new(),
            url: None,
            process_name: None,
            is_user_active: true,
            idle_seconds: 0,
            keyboard_activity_detected: false,
        },
    }
}