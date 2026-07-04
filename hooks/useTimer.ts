"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type TimerMode = "stopwatch" | "countdown";

export interface UseTimerOptions {
  mode?: TimerMode;
  initialSeconds?: number; // for countdown
  onComplete?: () => void;
}

export function useTimer({ mode = "stopwatch", initialSeconds = 0, onComplete }: UseTimerOptions = {}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const totalSeconds = mode === "countdown" ? initialSeconds : elapsedSeconds;
  const displaySeconds = mode === "countdown" ? Math.max(0, initialSeconds - elapsedSeconds) : elapsedSeconds;

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((s) => {
          const next = s + 1;
          if (mode === "countdown" && next >= initialSeconds) {
            setIsRunning(false);
            onCompleteRef.current?.();
            return initialSeconds;
          }
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, mode, initialSeconds]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => { setIsRunning(false); setElapsedSeconds(0); }, []);
  const stop = useCallback(() => { const e = elapsedSeconds; setIsRunning(false); setElapsedSeconds(0); return e; }, [elapsedSeconds]);

  return {
    elapsedSeconds,
    displaySeconds,
    isRunning,
    start,
    pause,
    reset,
    stop,
  };
}
