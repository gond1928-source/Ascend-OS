/**
 * lib/link-preview.ts
 *
 * Pure URL-pattern detection for "smart" resource/attachment previews —
 * deliberately NOT a real link-preview service. Getting live metadata
 * (GitHub stars/last-updated, a Figma thumbnail, a video's duration, a
 * Discord server's member count) means a real network call to each
 * service's API, which this function doesn't make: no network access to
 * build/verify that here, and faking those numbers to look "richer" would
 * just be lying to the user in the UI. Everything below is derived only
 * from the URL string itself — honest, zero-latency, and it degrades
 * gracefully (a plain link) for anything it doesn't recognize.
 */

import { Github, Youtube, FileText, PenTool, MessageCircle, Link2, type LucideIcon } from "lucide-react";

export interface LinkKind {
  icon: LucideIcon;
  /** Short type badge, e.g. "Repository", "Video". */
  type: string;
  /** Best-effort display label parsed from the URL — e.g. "owner/repo" for
   * GitHub. Falls back to the bare hostname when nothing more specific is
   * parseable. */
  label: string;
}

export function detectLinkKind(rawUrl: string): LinkKind {
  let host = "";
  let path = "";
  try {
    const u = new URL(rawUrl);
    host = u.hostname.replace(/^www\./, "");
    path = u.pathname;
  } catch {
    return { icon: Link2, type: "Link", label: rawUrl };
  }

  if (host === "github.com") {
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return { icon: Github, type: "Repository", label: `${parts[0]}/${parts[1]}` };
    }
    if (parts.length === 1) return { icon: Github, type: "GitHub", label: parts[0] };
    return { icon: Github, type: "GitHub", label: host };
  }

  if (host === "youtube.com" || host === "youtu.be") {
    return { icon: Youtube, type: "Video", label: "YouTube video" };
  }

  if (host === "figma.com" || host === "www.figma.com") {
    const parts = path.split("/").filter(Boolean);
    const name = parts.length >= 3 ? decodeURIComponent(parts[2]).replace(/-/g, " ") : "Figma file";
    return { icon: PenTool, type: "Design", label: name };
  }

  if (host === "notion.so" || host.endsWith(".notion.site")) {
    const parts = path.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    const name = last ? decodeURIComponent(last.replace(/-[a-f0-9]{32}$/i, "")).replace(/-/g, " ") : "Notion page";
    return { icon: FileText, type: "Notion", label: name || "Notion page" };
  }

  if (host === "docs.google.com") {
    const type = path.includes("/spreadsheets/") ? "Google Sheet" : path.includes("/presentation/") ? "Google Slides" : "Google Doc";
    return { icon: FileText, type, label: type };
  }

  if (host === "discord.gg" || (host === "discord.com" && path.startsWith("/invite/"))) {
    return { icon: MessageCircle, type: "Discord Invite", label: "Discord invite" };
  }

  return { icon: Link2, type: "Link", label: host || rawUrl };
}
