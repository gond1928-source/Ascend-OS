"use client";

import { useEffect, useRef, useState } from "react";
import { SplashScreen, type Phase } from "./splash-screen";

/**
 * splash-gate.tsx
 *
 * Owns the boot sequence's timeline and the app-readiness contract.
 * <SplashScreen> just renders whatever phase/progress it's told to.
 *
 * Timeline:
 *   black → glow → logoIn → uiIn → loading → completePause
 *         → collapsing → logoOnly → aBurst → fading → done
 *
 * The dashboard mounts immediately underneath (nothing expensive to wait
 * on in a local static bundle) but stays visually and interactively dead
 * — `visibility: hidden` + `inert`-equivalent — until the "fading" phase,
 * at which point it crossfades in under the departing logo glow.
 */

const DURATIONS: Record<Exclude<Phase, "loading">, number> = {
  black: 160,
  glow: 480,
  logoIn: 520,
  uiIn: 480,
  completePause: 450,
  collapsing: 750,
  logoOnly: 320,
  aBurst: 750,
  fading: 550,
  done: 0,
};

/** Minimum time the loading phase itself must hold, regardless of readiness. */
const MIN_LOADING_MS = 2600;
/** Soft ceiling the progress bar eases toward while genuinely waiting. */
const SOFT_CAP = 92;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

interface SplashGateProps {
  children: React.ReactNode;
  /** Personalizes the boot sequence, e.g. the signed-in user's name. */
  userName?: string;
  /**
   * Real app-readiness signal. Leave undefined to let the gate finish on
   * its own after MIN_LOADING_MS — pass `false` while genuine init work
   * (data hydration, native handshake, etc.) is running and flip to `true`
   * when it's done, and the bar will hold at ~92% and complete the moment
   * you do.
   */
  ready?: boolean;
  /** Skip entirely — useful for tests or a reduced-motion preference. */
  disabled?: boolean;
}

export function SplashGate({ children, userName, ready, disabled = false }: SplashGateProps) {
  const [phase, setPhase] = useState<Phase>(disabled ? "done" : "black");
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const progressTargetRef = useRef(0);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  // Smoothly eases `progress` toward `progressTargetRef.current` on a fixed
  // clock (not requestAnimationFrame) so it can't stall if the window loses
  // focus for a moment during boot.
  useEffect(() => {
    if (disabled) return;
    const id = setInterval(() => {
      const target = progressTargetRef.current;
      const current = progressRef.current;
      const next = current + (target - current) * 0.12;
      const settled = Math.abs(target - next) < 0.05 ? target : next;
      progressRef.current = settled;
      setProgress(settled);
    }, 16);
    return () => clearInterval(id);
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;

    async function run() {
      setPhase("black");
      await wait(DURATIONS.black);
      if (cancelled) return;

      setPhase("glow");
      await wait(DURATIONS.glow);
      if (cancelled) return;

      setPhase("logoIn");
      await wait(DURATIONS.logoIn);
      if (cancelled) return;

      setPhase("uiIn");
      await wait(DURATIONS.uiIn);
      if (cancelled) return;

      setPhase("loading");
      progressTargetRef.current = SOFT_CAP;
      const loadingStart = Date.now();

      // Hold until both the minimum stage time has elapsed AND the caller
      // says the app is actually ready (readyRef stays undefined = "always
      // ready", so apps that don't wire this up just get MIN_LOADING_MS).
      while (
        !cancelled &&
        (Date.now() - loadingStart < MIN_LOADING_MS || readyRef.current === false)
      ) {
        await wait(80);
      }
      if (cancelled) return;

      progressTargetRef.current = 100;
      while (!cancelled && progressRef.current < 99.4) {
        await wait(30);
      }
      if (cancelled) return;

      setPhase("completePause");
      await wait(DURATIONS.completePause);
      if (cancelled) return;

      setPhase("collapsing");
      await wait(DURATIONS.collapsing);
      if (cancelled) return;

      setPhase("logoOnly");
      await wait(DURATIONS.logoOnly);
      if (cancelled) return;

      setPhase("aBurst");
      await wait(DURATIONS.aBurst);
      if (cancelled) return;

      setPhase("fading");
      await wait(DURATIONS.fading);
      if (cancelled) return;

      setPhase("done");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [disabled]);

  const dashboardRevealed = phase === "fading" || phase === "done";

  return (
    <>
      <div
        aria-hidden={!dashboardRevealed}
        style={{
          visibility: dashboardRevealed ? "visible" : "hidden",
          opacity: dashboardRevealed ? 1 : 0,
          pointerEvents: dashboardRevealed ? "auto" : "none",
          transition: "opacity 600ms ease",
          height: "100%",
        }}
      >
        {children}
      </div>

      {phase !== "done" && (
        <SplashScreen userName={userName} phase={phase} progress={progress} />
      )}
    </>
  );
}
