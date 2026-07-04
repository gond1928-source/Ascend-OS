"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SessionDraft } from "@/types/session";
import { pollActivityWatch } from "@/lib/activitywatch/pollActivityWatch";

export type AWStatus = "idle" | "polling" | "connected" | "error";

export interface AWState {
  status: AWStatus;
  error: string | null;
  bucketCount: number;
  lastPolled: Date | null;
  pendingSessions: SessionDraft[];
}

const POLL_INTERVAL_MS = 60_000; // poll every 60s

export function useActivityWatch(
  enabled: boolean,
  onNewSessions: (drafts: SessionDraft[]) => void
) {
  const [state, setState] = useState<AWState>({
    status: "idle",
    error: null,
    bucketCount: 0,
    lastPolled: null,
    pendingSessions: [],
  });

  const onNewSessionsRef = useRef(onNewSessions);
  onNewSessionsRef.current = onNewSessions;

  const poll = useCallback(async () => {
    setState((s) => ({ ...s, status: "polling" }));
    try {
      const data = await pollActivityWatch();

      if (data.connected) {
        setState({
          status: "connected",
          error: null,
          bucketCount: data.bucketCount,
          lastPolled: new Date(),
          pendingSessions: data.sessions ?? [],
        });
        if (data.sessions?.length > 0) {
          onNewSessionsRef.current(data.sessions);
        }
      } else {
        setState((s) => ({
          ...s,
          status: "error",
          error: data.error ?? "Not connected",
          lastPolled: new Date(),
        }));
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        lastPolled: new Date(),
      }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, status: "idle" }));
      return;
    }
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, poll]);

  return { ...state, poll };
}
