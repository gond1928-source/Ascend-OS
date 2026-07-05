"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "@/styles/splash.css";

/**
 * splash-screen.tsx
 *
 * Purely presentational — <SplashGate> owns the timeline and hands down
 * `phase` + `progress`. Each phase maps to a visual state; framer-motion
 * interpolates between them, so the whole boot sequence is really just
 * this state machine rendered frame by frame:
 *
 *   black    → nothing but a black field
 *   glow     → soft radial bloom appears at center
 *   logoIn   → logo fades/scales in over the glow
 *   uiIn     → wordmark, message line, progress bar, particles fade in
 *   loading  → steady state: bar tracks real progress, messages rotate
 *   completePause → bar sits at 100%, brief hold
 *   collapsing    → ambient background gets sucked toward the center and dissolves
 *   logoOnly      → plain dark field, just the logo + glow remain
 *   aBurst        → the "A" plays its exit flourish (energy ring + glow burst + pulse)
 *   fading        → logo dissolves into soft light; dashboard crossfades in beneath
 */

export type Phase =
  | "black"
  | "glow"
  | "logoIn"
  | "uiIn"
  | "loading"
  | "completePause"
  | "collapsing"
  | "logoOnly"
  | "aBurst"
  | "fading"
  | "done";

type BootMessage = { type: "status" | "quote"; text: string };

const DEFAULT_MESSAGES: BootMessage[] = [
  { type: "status", text: "Initializing Ascend Core" },
  { type: "status", text: "Loading productivity systems" },
  { type: "status", text: "Syncing your workflow" },
  { type: "quote", text: "Small progress compounds into mastery." },
  { type: "status", text: "Preparing focus environment" },
  { type: "status", text: "Creating the perfect workspace" },
  { type: "quote", text: "Consistency beats intensity." },
  { type: "status", text: "Calibrating intelligent tracking" },
  { type: "status", text: "Loading modules & resources" },
  { type: "quote", text: "Focus creates freedom." },
  { type: "status", text: "Optimizing focus environment" },
  { type: "quote", text: "Your future is built daily." },
  { type: "status", text: "Building your momentum" },
  { type: "status", text: "Almost ready" },
];

const MESSAGE_INTERVAL_MS = 2200;
const PARTICLE_COUNT = 22;
const UI_PHASES: Phase[] = ["uiIn", "loading", "completePause"];
const LOGO_VISIBLE_PHASES: Phase[] = [
  "logoIn",
  "uiIn",
  "loading",
  "completePause",
  "collapsing",
  "logoOnly",
  "aBurst",
  "fading",
];

interface Particle {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  hue: "violet" | "sky";
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    size: 1.5 + Math.random() * 2.5,
    delay: Math.random() * 6,
    duration: 6 + Math.random() * 6,
    opacity: 0.25 + Math.random() * 0.35,
    hue: Math.random() > 0.5 ? "violet" : "sky",
  }));
}

export interface SplashScreenProps {
  phase: Phase;
  progress: number;
  userName?: string;
  messages?: BootMessage[];
  version?: string;
}

export function SplashScreen({
  phase,
  progress,
  userName,
  messages,
  version = "v0.1.0",
}: SplashScreenProps) {
  const bootMessages = useMemo<BootMessage[]>(() => {
    const base = messages ?? DEFAULT_MESSAGES;
    if (!userName) return base;
    return [base[0], { type: "quote", text: `Welcome back, ${userName}.` }, ...base.slice(1)];
  }, [messages, userName]);

  const [messageIndex, setMessageIndex] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(makeParticles(PARTICLE_COUNT));
  }, []);

  useEffect(() => {
    if (!UI_PHASES.includes(phase)) return;
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % bootMessages.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [phase, bootMessages.length]);

  const current = bootMessages[messageIndex];
  const showUI = UI_PHASES.includes(phase);
  const showLogo = LOGO_VISIBLE_PHASES.includes(phase);
  const isCollapsing = phase === "collapsing";
  const isFlattened = phase === "collapsing" || phase === "logoOnly" || phase === "aBurst" || phase === "fading";
  const isBurst = phase === "aBurst";
  const isFading = phase === "fading";
  const roundedProgress = Math.round(progress);

  return (
    <motion.div
      className="ascend-splash fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* true black first frame — lifts as the glow blooms in */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-black"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === "black" ? 1 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        aria-hidden
      />

      {/* flattens the ambient gradient down to plain dark once the collapse begins */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background: "#05060a" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isFlattened ? 1 : 0 }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
        aria-hidden
      />

      {/* ambient light field */}
      <motion.div
        className="ascend-splash__blob ascend-splash__blob--violet"
        style={{ width: 520, height: 520, top: "12%", left: "50%", marginLeft: -260 }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: phase === "black" ? 0 : isCollapsing || isFlattened ? 0 : 1,
          scale: isCollapsing ? 0.2 : 1,
        }}
        transition={{ duration: isCollapsing ? 0.7 : 0.6, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="ascend-splash__blob ascend-splash__blob--sky"
        style={{ width: 420, height: 420, bottom: "6%", left: "58%", marginLeft: -210 }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: phase === "black" ? 0 : isCollapsing || isFlattened ? 0 : 1,
          scale: isCollapsing ? 0.2 : 1,
        }}
        transition={{ duration: isCollapsing ? 0.7 : 0.6, ease: "easeInOut" }}
        aria-hidden
      />

      {/* central bloom that precedes the logo on entry */}
      <motion.div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 260,
          height: 260,
          background: "radial-gradient(circle, rgba(124,108,246,0.5), transparent 70%)",
          filter: "blur(30px)",
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          opacity: phase === "black" ? 0 : phase === "glow" ? 0.9 : 0,
          scale: phase === "glow" ? 1.1 : 0.5,
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        aria-hidden
      />

      {/* drifting particles */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="ascend-splash__particle"
            initial={{ opacity: 0 }}
            animate={{ opacity: showUI ? 1 : 0 }}
            transition={{ duration: 0.6 }}
            style={
              {
                left: `${p.left}%`,
                bottom: "-4%",
                width: p.size,
                height: p.size,
                background:
                  p.hue === "violet"
                    ? "radial-gradient(circle, rgba(124,108,246,0.9), transparent 70%)"
                    : "radial-gradient(circle, rgba(77,200,245,0.9), transparent 70%)",
                animationName: showUI ? "ascend-rise" : "none",
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
                "--particle-o": p.opacity,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "inset 0 0 180px 60px rgba(0,0,0,0.75)" }}
        aria-hidden
      />

      {/* core content */}
      <div className="relative z-10 flex flex-col items-center px-6">
        {/* logo + rings + exit-burst effects */}
        <div className="relative mb-8 flex items-center justify-center" style={{ width: 176, height: 176 }}>
          {showUI &&
            [0, 1, 2].map((ring) => (
              <motion.span
                key={ring}
                className="absolute rounded-[28%] border"
                style={{ borderColor: "rgba(124,108,246,0.35)", width: 176, height: 176 }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: [0, 0.5, 0], scale: [0.7, 1.35, 1.6] }}
                transition={{ duration: 3.2, ease: "easeOut", repeat: Infinity, delay: ring * 1.05 }}
                aria-hidden
              />
            ))}

          {/* energy swirl ring — only during the exit burst */}
          <AnimatePresence>
            {isBurst && (
              <motion.span
                className="absolute rounded-full"
                style={{
                  width: 176,
                  height: 176,
                  background:
                    "conic-gradient(from 0deg, transparent, rgba(77,200,245,0.9), rgba(124,108,246,0.95), transparent 60%)",
                  filter: "blur(2px)",
                  maskImage: "radial-gradient(circle, transparent 58%, black 62%, black 72%, transparent 76%)",
                  WebkitMaskImage:
                    "radial-gradient(circle, transparent 58%, black 62%, black 72%, transparent 76%)",
                }}
                initial={{ opacity: 0, scale: 0.75, rotate: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0.75, 1.25, 1.4], rotate: 320 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, ease: "easeInOut" }}
                aria-hidden
              />
            )}
          </AnimatePresence>

          {/* glow burst flash — only during the exit burst */}
          <AnimatePresence>
            {isBurst && (
              <motion.span
                className="absolute rounded-full"
                style={{
                  width: 176,
                  height: 176,
                  background: "radial-gradient(circle, rgba(190,180,255,0.9), transparent 70%)",
                  filter: "blur(14px)",
                }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.7, 2.1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, ease: "easeOut" }}
                aria-hidden
              />
            )}
          </AnimatePresence>

          <motion.div
            className="relative"
            style={{
              filter:
                "drop-shadow(0 0 22px rgba(124,108,246,0.55)) drop-shadow(0 0 48px rgba(77,200,245,0.28))",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={
              isBurst
                ? { opacity: 1, scale: [1, 1.2, 0.96, 1.06, 1], rotate: [0, -6, 6, -2, 0] }
                : isFading
                  ? { opacity: 0, scale: 1.12, filter: "blur(6px)" }
                  : { opacity: showLogo ? 1 : 0, scale: showLogo ? [1, 1.035, 1] : 0.8 }
            }
            transition={
              isBurst
                ? { duration: 0.75, ease: "easeInOut" }
                : isFading
                  ? { duration: 0.55, ease: "easeInOut" }
                  : phase === "logoIn"
                    ? { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
                    : { duration: 4, ease: "easeInOut", repeat: showUI ? Infinity : 0 }
            }
          >
            <img
              src="/branding/ascend-logo.png"
              alt="Ascend OS"
              width={112}
              height={112}
              className="relative select-none"
              draggable={false}
            />
          </motion.div>
        </div>

        {/* wordmark */}
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.05em" }}
          animate={{
            opacity: showUI ? 1 : 0,
            letterSpacing: showUI ? "0.34em" : "0.05em",
            y: isCollapsing ? -18 : 0,
            filter: isCollapsing ? "blur(4px)" : "blur(0px)",
          }}
          transition={{ duration: isCollapsing ? 0.6 : 0.7, ease: "easeOut" }}
          className="text-[13px] font-semibold uppercase text-[var(--text-primary)]"
          style={{ textShadow: "0 0 24px rgba(124,108,246,0.35)" }}
        >
          Ascend&nbsp;OS
        </motion.p>

        {/* rotating message */}
        <motion.div
          className="mt-7 flex h-5 items-center justify-center"
          animate={{ opacity: showUI ? 1 : 0, y: isCollapsing ? -12 : 0, filter: isCollapsing ? "blur(4px)" : "blur(0px)" }}
          transition={{ duration: isCollapsing ? 0.6 : 0.4 }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={
                current.type === "status"
                  ? "font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]"
                  : "text-[13px] text-[var(--text-secondary)]"
              }
            >
              {current.text}
              {current.type === "status" && <BootDots />}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* progress bar — tracks real/simulated readiness */}
        <motion.div
          className="mt-8 flex flex-col items-center"
          animate={{ opacity: showUI ? 1 : 0, y: isCollapsing ? -6 : 0, filter: isCollapsing ? "blur(4px)" : "blur(0px)" }}
          transition={{ duration: isCollapsing ? 0.6 : 0.4 }}
        >
          <div className="ascend-splash__bar-track h-[3px] w-[220px] rounded-full">
            <div className="ascend-splash__bar-fill-det" style={{ width: `${roundedProgress}%` }} />
          </div>
          <span className="mt-2 font-mono text-[10px] tabular-nums tracking-[0.1em] text-[var(--text-muted)]">
            {roundedProgress}%
          </span>
        </motion.div>
      </div>

      {/* build tag */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.14em] text-[var(--text-muted)]"
        animate={{ opacity: showUI ? 0.6 : 0 }}
        transition={{ duration: 0.4 }}
      >
        {version} &middot; ASCEND SYSTEMS
      </motion.div>
    </motion.div>
  );
}

function BootDots() {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0.2 }}
      animate={{ opacity: [0.2, 1, 0.2] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    >
      &nbsp;...
    </motion.span>
  );
}
