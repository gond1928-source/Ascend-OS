"use client";

/**
 * IconRail — narrow left column (~52px).
 * Brand icon at top, primary nav icons in middle, settings at bottom.
 * Matches the reference dashboard's leftmost dark icon strip.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Zap,
  Timer,
  History,
  Trophy,
  Radio,
  Share2,
  Settings,
} from "lucide-react";

const PRIMARY_NAV = [
  { href: "/timer",        icon: Timer,     label: "Timer" },
  { href: "/sessions",     icon: History,   label: "Sessions" },
  { href: "/achievements", icon: Trophy,    label: "Achievements" },
  { href: "/monitoring",   icon: Radio,     label: "Monitoring" },
  { href: "/documents",    icon: Share2,    label: "Documents", comingSoon: true },
];

export function IconRail() {
  const pathname = usePathname();

  return (
    <div className="icon-rail">
      {/* Brand */}
      <Link href="/dashboard" className="icon-rail-brand" title="Dashboard">
        <Zap className="h-[18px] w-[18px] text-accent-violet" />
      </Link>

      {/* Primary nav */}
      <nav className="icon-rail-nav">
        {PRIMARY_NAV.map(({ href, icon: Icon, label, comingSoon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn("icon-rail-btn", active && "icon-rail-btn--active")}
            >
              {active && <span className="icon-rail-indicator" />}
              <Icon className="h-[17px] w-[17px]" />
              {comingSoon && <span className="icon-rail-dot" />}
            </Link>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <Link
        href="/settings"
        title="Settings"
        className={cn("icon-rail-btn icon-rail-settings", pathname?.startsWith("/settings") && "icon-rail-btn--active")}
      >
        <Settings className="h-[17px] w-[17px]" />
      </Link>
    </div>
  );
}
