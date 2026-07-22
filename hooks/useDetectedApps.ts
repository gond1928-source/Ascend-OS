"use client";
/**
 * useDetectedApps — read-only, live-updating view of the DetectedApp
 * registry. No context/provider: this is written exclusively by
 * NativeTracker (outside React) and read by exactly one consumer today
 * (the App Rules panel), so a lightweight subscribe-on-mount hook is
 * enough — same proportionality call as hooks/useReflection.ts.
 */

import { useEffect, useState } from "react";
import { DetectedApp } from "@/types/detected-app";
import { loadDetectedAppsSync, subscribeDetectedApps } from "@/lib/storage/detected-apps-store";

export function useDetectedApps(): DetectedApp[] {
  const [apps, setApps] = useState<DetectedApp[]>([]);

  useEffect(() => {
    setApps(loadDetectedAppsSync());
    return subscribeDetectedApps(() => setApps(loadDetectedAppsSync()));
  }, []);

  return apps;
}
