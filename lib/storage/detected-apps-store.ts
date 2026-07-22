/**
 * lib/storage/detected-apps-store.ts
 *
 * Same seam as the other lib/storage/*-store.ts files. Also exports a
 * subscribe/notify pair (subscribeDetectedApps), same pattern as
 * reflection-store.ts's subscribeReflections — see that file's doc
 * comment for the full rationale. Here it's what lets the App Rules panel
 * update live while it's open and monitoring is running: NativeTracker
 * writes new detections from its own poll loop, completely outside React,
 * so without this the panel would only pick up new apps on next mount.
 */

import { DetectedApp } from "@/types/detected-app";

const STORAGE_KEY = "ascend_detected_apps_v1";

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeDetectedApps(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  listeners.forEach((l) => l());
}

export function loadDetectedAppsSync(): DetectedApp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DetectedApp[]) : [];
  } catch (err) {
    console.warn("[detected-apps-store] Failed to load detected apps, starting clean:", err);
    return [];
  }
}

export function saveDetectedAppsSync(apps: DetectedApp[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch (err) {
    console.error("[detected-apps-store] Failed to save detected apps:", err);
  }
  notify();
}
