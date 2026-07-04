"use client";
/**
 * useSessions — thin hook that reads from SessionContext.
 * All consumers share the same state through the provider in layout.tsx.
 */
import { useContext } from "react";
import { SessionContext } from "@/lib/session-context";

export function useSessions() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSessions must be used inside <SessionProvider>");
  return ctx;
}
