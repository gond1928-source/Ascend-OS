/**
 * Electron main process — Ascend OS desktop shell.
 *
 * Responsibilities:
 *  1. Create and manage the BrowserWindow (Next.js renderer)
 *  2. Run the native window tracker (replaces /api/native-tracker HTTP poll)
 *  3. Expose IPC channels to the renderer:
 *       "tracker:snapshot"  → returns current WindowSnapshot
 *       "tracker:start"     → starts native polling
 *       "tracker:stop"      → stops native polling
 *  4. Manage the system tray icon
 *
 * When running in Electron, the renderer's NativeTracker should be
 * configured to use IPC instead of HTTP. The /api/native-tracker route
 * remains as fallback for web-only (npm run dev) usage.
 *
 * NOTE: This file is compiled separately from Next.js.
 * Run with: npx electron .
 * (electron must be installed: npm install --save-dev electron)
 */

// These imports require electron to be installed.
// They are typed here for architecture documentation purposes.

// import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from "electron";
// import path from "path";
// import { getActiveWindow } from "./window-detector";

// ── Window detector (Electron native) ────────────────────────────────────────

/**
 * In Electron, we use the `active-win` npm package (or a native binding)
 * to get the active window without subprocess overhead.
 *
 * Install: npm install active-win
 * Then: import activeWin from "active-win";
 *
 * interface ActiveWindow {
 *   title: string;
 *   id: number;
 *   bounds: { x, y, width, height };
 *   owner: { name, processId, path };
 *   url?: string;   // macOS Safari/Chrome only, requires accessibility
 *   memoryUsage: number;
 * }
 *
 * const win = await activeWin();
 * snapshot = {
 *   capturedAt: Date.now(),
 *   appName: win.owner.name,
 *   windowTitle: win.title,
 *   url: win.url,
 *   processName: path.basename(win.owner.path),
 *   isUserActive: true,
 * };
 */

// ── IPC handlers (stubbed) ────────────────────────────────────────────────────

/**
 * ipcMain.handle("tracker:snapshot", async () => {
 *   const win = await activeWin();
 *   return {
 *     capturedAt: Date.now(),
 *     appName: win?.owner.name ?? "Unknown",
 *     windowTitle: win?.title ?? "",
 *     url: win?.url,
 *     isUserActive: true,
 *   };
 * });
 *
 * ipcMain.handle("tracker:get-idle-time", async () => {
 *   // powerMonitor.getSystemIdleTime() returns seconds since last input
 *   const { powerMonitor } = require("electron");
 *   return powerMonitor.getSystemIdleTime();
 * });
 */

// ── BrowserWindow setup (stubbed) ─────────────────────────────────────────────

/**
 * app.whenReady().then(() => {
 *   const win = new BrowserWindow({
 *     width: 1200,
 *     height: 800,
 *     titleBarStyle: "hiddenInset",   // native macOS traffic lights
 *     vibrancy: "under-window",       // macOS blur effect
 *     visualEffectState: "active",
 *     backgroundColor: "#00000000",   // transparent for vibrancy
 *     webPreferences: {
 *       preload: path.join(__dirname, "preload.js"),
 *       contextIsolation: true,
 *       nodeIntegration: false,
 *     },
 *   });
 *
 *   // In production: load the built Next.js export
 *   // In dev: load the Next.js dev server
 *   if (process.env.NODE_ENV === "development") {
 *     win.loadURL("http://localhost:3000");
 *   } else {
 *     win.loadFile(path.join(__dirname, "../out/index.html"));
 *   }
 * });
 */

export {};
