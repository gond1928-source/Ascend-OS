"use client";

import { IconRail } from "./icon-rail";
import { NavPanel } from "./nav-panel";
import { TopBarActions } from "./top-bar-actions";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <IconRail />
      <NavPanel />
      <main className="shell-main">
        <TopBarActions />
        {children}
      </main>
    </div>
  );
}
