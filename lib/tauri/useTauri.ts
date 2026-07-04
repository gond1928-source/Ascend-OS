"use client";

/**
 * lib/tauri/useTauri.ts
 *
 * React hook for consuming Tauri bridge in components.
 *
 * Usage:
 *   const { isDesktop } = useTauri();
 *   if (isDesktop) { ... show native-only UI ... }
 */

import { useEffect, useState } from "react";
import { isTauri } from "./bridge";

interface TauriContext {
  /** True when running inside the Tauri desktop app, false in browser */
  isDesktop: boolean;
  /** True while the environment check is still pending (SSR / hydration) */
  loading: boolean;
}

export function useTauri(): TauriContext {
  const [isDesktop, setIsDesktop] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsDesktop(isTauri());
    setLoading(false);
  }, []);

  return { isDesktop, loading };
}
