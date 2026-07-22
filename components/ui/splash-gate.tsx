"use client";

/**
 * SplashGate — design brief §10.
 *
 * The old version was a ~7-second choreographed sequence (black → glow →
 * logo → UI reveal → loading bar → collapse → burst → fade) — precisely
 * the "dramatic full-screen loading experience" the brief calls out as the
 * default failure mode for splash screens, and precisely what it says to
 * avoid here. None of that survives.
 *
 * What replaces it: the persistent shell (nav rail, panels) renders
 * immediately — `children` mounts right away, real content fills in behind
 * it. The only thing gated is a brief, static, motionless logo mark, shown
 * for the shortest moment needed to avoid a blank white/black flash on
 * first paint (this is a local static bundle with no network round trip,
 * so that moment is inherently short). No progress bar, no gradient, no
 * tagline, no logo animation — it should read as "this app is opening,"
 * not as a moment to be admired.
 */

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

const MIN_VISIBLE_MS = 220;

interface SplashGateProps {
  children: React.ReactNode;
  /** Kept for call-site compatibility; unused now — see file header. */
  userName?: string;
  ready?: boolean;
  disabled?: boolean;
}

export function SplashGate({ children, ready, disabled = false }: SplashGateProps) {
  const [showSplash, setShowSplash] = useState(!disabled);

  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    const start = Date.now();

    async function finish() {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_VISIBLE_MS) {
        await new Promise((r) => setTimeout(r, MIN_VISIBLE_MS - elapsed));
      }
      if (!cancelled) setShowSplash(false);
    }

    if (ready === false) {
      // Real init work in progress — poll briefly rather than blocking on a
      // fixed timeline; still no visual choreography, just a wait.
      const id = setInterval(() => {
        if (ready !== false) {
          clearInterval(id);
          finish();
        }
      }, 50);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, [disabled, ready]);

  return (
    <>
      {/* Shell mounts immediately underneath — nothing blocks on the splash */}
      <div style={{ height: "100%" }}>{children}</div>

      {showSplash && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface-app)",
          }}
        >
          <Zap style={{ width: 28, height: 28, color: "var(--accent-primary)" }} />
        </div>
      )}
    </>
  );
}
