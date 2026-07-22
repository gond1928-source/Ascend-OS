"use client";

import { Suspense } from "react";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "./command-palette";
import { ToastHost } from "./toast-host";
import { ShellProvider } from "@/lib/shell-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <div className="shell">
        <Suspense fallback={<div className="app-sidebar" />}>
          <Sidebar />
        </Suspense>
        <div className="shell-main">
          <div className="shell-center">
            <div className="shell-workspace">{children}</div>
          </div>
        </div>
      </div>
      <CommandPalette />
      <ToastHost />
    </ShellProvider>
  );
}
