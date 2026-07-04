/**
 * ActivityWatch bridge — fixed to handle the real API response shape.
 *
 * /api/0/buckets returns an OBJECT keyed by bucket ID, NOT an array:
 * {
 *   "aw-watcher-vscode_hostname": { id, name, type, client, ... },
 *   "aw-watcher-window_hostname": { ... },
 * }
 *
 * We use Object.values() to normalize this into AWBucket[] everywhere.
 */

import { SessionDraft } from "@/types/session";

export const AW_BASE_URL = "http://localhost:5600";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AWBucket {
  id: string;
  name: string | null;
  type: string;
  client: string;
  hostname: string;
  created: string;
  last_updated: string;
}

export interface AWEvent {
  id: number;
  timestamp: string;
  duration: number; // seconds
  data: Record<string, unknown>;
}

export interface AWBucketsResponse {
  // Object map — bucket_id → AWBucket
  [bucketId: string]: AWBucket;
}

export type BucketKind = "vscode" | "window" | "web" | "unknown";

// ─── Identification ────────────────────────────────────────────────────────────

const VSCODE_CLIENTS = ["aw-watcher-vscode", "aw-watcher-cursor"];
const VSCODE_ID_PREFIXES = ["aw-watcher-vscode", "aw-watcher-cursor"];
const WINDOW_CLIENTS = ["aw-watcher-window", "aw-watcher-afk"];
const WINDOW_ID_PREFIXES = ["aw-watcher-window"];
const WEB_CLIENTS = ["aw-watcher-web", "aw-watcher-firefox", "aw-watcher-chrome"];
const WEB_ID_PREFIXES = ["aw-watcher-web", "aw-watcher-firefox", "aw-watcher-chrome"];

export function classifyBucket(bucket: AWBucket): BucketKind {
  const id = (bucket.id ?? "").toLowerCase();
  const client = (bucket.client ?? "").toLowerCase();

  if (VSCODE_CLIENTS.includes(client) || VSCODE_ID_PREFIXES.some((p) => id.startsWith(p))) return "vscode";
  if (WEB_CLIENTS.includes(client) || WEB_ID_PREFIXES.some((p) => id.startsWith(p))) return "web";
  if (WINDOW_CLIENTS.includes(client) || WINDOW_ID_PREFIXES.some((p) => id.startsWith(p))) return "window";
  return "unknown";
}

// ─── API helpers ───────────────────────────────────────────────────────────────

/**
 * Ping AW and return buckets as an array.
 * Handles both object-map response (real AW) and hypothetical array response defensively.
 */
export async function pingActivityWatch(): Promise<AWBucket[]> {
  const res = await fetch(`${AW_BASE_URL}/api/0/buckets`, {
    signal: AbortSignal.timeout(4000),
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error(`ActivityWatch returned HTTP ${res.status}`);

  const raw: unknown = await res.json();

  console.debug("[AW] /api/0/buckets raw response type:", typeof raw, Array.isArray(raw) ? "array" : "object-map");
  console.debug("[AW] bucket keys:", typeof raw === "object" && raw !== null ? Object.keys(raw) : raw);

  // AW returns an object map { bucketId: AWBucket }
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const buckets = Object.values(raw as AWBucketsResponse);
    console.debug(`[AW] Normalized ${buckets.length} buckets from object-map`);
    return buckets;
  }

  // Defensive: if it somehow returns an array, accept it
  if (Array.isArray(raw)) {
    console.debug(`[AW] Got array of ${raw.length} buckets directly`);
    return raw as AWBucket[];
  }

  throw new Error(`Unexpected /api/0/buckets shape: ${typeof raw}`);
}

/**
 * Fetch events for a bucket within a time window.
 * AW returns events as an array directly.
 */
export async function fetchBucketEvents(
  bucketId: string,
  since: Date,
  until: Date = new Date()
): Promise<AWEvent[]> {
  const params = new URLSearchParams({
    start: since.toISOString(),
    end: until.toISOString(),
    limit: "2000",
  });

  const url = `${AW_BASE_URL}/api/0/buckets/${encodeURIComponent(bucketId)}/events?${params}`;
  console.debug(`[AW] Fetching events: ${url}`);

  const res = await fetch(url, {
    signal: AbortSignal.timeout(6000),
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error(`Failed to fetch events from "${bucketId}" (HTTP ${res.status})`);

  const raw: unknown = await res.json();

  if (!Array.isArray(raw)) {
    console.warn(`[AW] Events for "${bucketId}" was not an array:`, typeof raw);
    return [];
  }

  console.debug(`[AW] "${bucketId}" → ${raw.length} events`);
  return raw as AWEvent[];
}

// ─── Event classification ──────────────────────────────────────────────────────

const YOUTUBE_PATTERNS = ["youtube.com/watch", "youtube.com/shorts", "youtu.be/"];
const TUTORIAL_SITES = [
  "udemy.com", "coursera.org", "egghead.io", "frontendmasters.com",
  "pluralsight.com", "linkedin.com/learning", "skillshare.com",
  "codecademy.com", "khanacademy.org", "brilliant.org", "leetcode.com",
  "exercism.org", "hackerrank.com",
];
const ENTERTAINMENT_SITES = [
  "netflix.com", "twitch.tv", "reddit.com", "twitter.com", "x.com",
  "instagram.com", "tiktok.com", "facebook.com",
];

export type ContentKind = "coding" | "learning" | "entertainment" | "other";

/** Classify a window/web event by its URL and title. */
export function classifyWindowEvent(event: AWEvent): ContentKind {
  const url = String(event.data?.url ?? event.data?.currentTab ?? "").toLowerCase();
  const title = String(event.data?.title ?? "").toLowerCase();
  const app = String(event.data?.app ?? event.data?.process ?? "").toLowerCase();

  // VS Code / coding editors via window watcher
  if (
    app.includes("code") || app.includes("cursor") ||
    app.includes("pycharm") || app.includes("webstorm") ||
    app.includes("intellij") || app.includes("vim") ||
    app.includes("neovim") || app.includes("emacs")
  ) return "coding";

  // YouTube & tutorial platforms
  if (YOUTUBE_PATTERNS.some((p) => url.includes(p))) return "learning";
  if (TUTORIAL_SITES.some((p) => url.includes(p))) return "learning";
  if (title.includes("tutorial") || title.includes(" - youtube") && (title.includes("tutorial") || title.includes("course") || title.includes("learn"))) return "learning";

  // Entertainment
  if (ENTERTAINMENT_SITES.some((p) => url.includes(p))) return "entertainment";

  return "other";
}

/** Is this a VS Code event? */
export function isWatchingEvent(event: AWEvent): boolean {
  return classifyWindowEvent(event) === "learning";
}

// ─── Language detection ────────────────────────────────────────────────────────

const EXT_TO_LANGUAGE: Record<string, string> = {
  ".py": "Python", ".pyw": "Python", ".pyi": "Python",
  ".js": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
  ".ts": "TypeScript", ".tsx": "TypeScript", ".mts": "TypeScript",
  ".jsx": "JavaScript",
  ".rs": "Rust",
  ".go": "Go",
  ".java": "Java", ".kt": "Kotlin", ".kts": "Kotlin",
  ".cpp": "C++", ".cc": "C++", ".cxx": "C++", ".h": "C++", ".hpp": "C++",
  ".c": "C",
  ".cs": "C#",
  ".rb": "Ruby", ".rake": "Ruby",
  ".php": "PHP",
  ".swift": "Swift",
  ".dart": "Dart",
  ".ex": "Elixir", ".exs": "Elixir",
  ".hs": "Haskell",
  ".lua": "Lua",
  ".r": "R", ".R": "R",
  ".scala": "Scala",
  ".clj": "Clojure",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".html": "HTML", ".htm": "HTML",
  ".css": "CSS", ".scss": "CSS", ".sass": "CSS",
  ".sql": "SQL",
  ".sh": "Shell", ".bash": "Shell", ".zsh": "Shell",
  ".yaml": "YAML", ".yml": "YAML",
  ".json": "JSON",
  ".md": "Markdown",
};

export function detectLanguage(event: AWEvent): string {
  // Direct language field (aw-watcher-vscode sends this)
  const langField = String(event.data?.language ?? "").trim();
  if (langField && langField !== "plaintext" && langField !== "unknown") {
    // Normalize common variants
    const normalized: Record<string, string> = {
      javascript: "JavaScript", typescript: "TypeScript", python: "Python",
      rust: "Rust", go: "Go", java: "Java", kotlin: "Kotlin",
      "c++": "C++", cpp: "C++", "c#": "C#", csharp: "C#",
      ruby: "Ruby", php: "PHP", swift: "Swift", dart: "Dart",
      vue: "Vue", svelte: "Svelte", html: "HTML", css: "CSS",
      shell: "Shell", bash: "Shell", sql: "SQL", r: "R",
    };
    return normalized[langField.toLowerCase()] ?? langField;
  }

  // File path extension
  const filePath = String(event.data?.file ?? event.data?.path ?? event.data?.title ?? "");
  for (const [ext, lang] of Object.entries(EXT_TO_LANGUAGE)) {
    if (filePath.toLowerCase().endsWith(ext)) return lang;
  }

  return "Other";
}

// ─── Watching-topic detection (language extraction for learning sessions) ──────
//
// A "learning" event (YouTube tutorial, Udemy course, doc site, ...) has no
// `data.language` field the way a VS Code event does — the only signal is
// the page title/URL. This table is the AW-side counterpart to
// lib/tracker/classifier.ts's WATCHING_LANGUAGE_KEYWORDS: same intent (pull
// a real language/topic out of free text), same rule (never fall back to
// "Learning" or inherit a coding session's language — only a genuine title
// match counts, otherwise the caller uses a neutral "Other" bucket).

const WATCHING_TOPIC_KEYWORDS: Array<{ keyword: string; language: string }> = [
  { keyword: "typescript", language: "TypeScript" },
  { keyword: "next.js", language: "React" },
  { keyword: "nextjs", language: "React" },
  { keyword: "react", language: "React" },
  { keyword: "vue", language: "Vue" },
  { keyword: "svelte", language: "Svelte" },
  { keyword: "javascript", language: "JavaScript" },
  { keyword: "node.js", language: "JavaScript" },
  { keyword: "nodejs", language: "JavaScript" },
  { keyword: "python", language: "Python" },
  { keyword: "django", language: "Python" },
  { keyword: "flask", language: "Python" },
  { keyword: "java", language: "Java" },
  { keyword: "kotlin", language: "Kotlin" },
  { keyword: "c++", language: "C++" },
  { keyword: "cpp", language: "C++" },
  { keyword: "c#", language: "C#" },
  { keyword: "csharp", language: "C#" },
  { keyword: "golang", language: "Go" },
  { keyword: "rust", language: "Rust" },
  { keyword: "html", language: "HTML" },
  { keyword: "css", language: "CSS" },
  { keyword: "sql", language: "SQL" },
  { keyword: "swift", language: "Swift" },
  { keyword: "dart", language: "Dart" },
  { keyword: "flutter", language: "Dart" },
  { keyword: "ruby", language: "Ruby" },
  { keyword: "php", language: "PHP" },
];

/**
 * Extracts a specific language/topic from a watching event's title or URL,
 * e.g. "Python Tutorial - YouTube" → "Python". Returns null when nothing
 * recognizable is found — callers must use a neutral fallback ("Other"),
 * never "Learning" or an adjacent coding session's language.
 */
export function detectWatchingTopic(event: AWEvent): string | null {
  const title = String(event.data?.title ?? "").toLowerCase();
  const url = String(event.data?.url ?? event.data?.currentTab ?? "").toLowerCase();
  const haystack = `${title} ${url}`;
  for (const { keyword, language } of WATCHING_TOPIC_KEYWORDS) {
    if (haystack.includes(keyword)) return language;
  }
  return null;
}

// ─── Session building ──────────────────────────────────────────────────────────

/** Per-event detected language, used to split a contiguous time block by language. */
function eventLanguage(event: AWEvent, kind: "coding" | "watching"): string {
  if (kind === "coding") return detectLanguage(event);
  return detectWatchingTopic(event) ?? "Other";
}

/**
 * Groups AW events into SessionDrafts by detected (kind, language), summing
 * duration across the whole polled window. Each distinct language gets its
 * own draft per kind — this is the language-centric aggregation: it's what
 * lets a Python tutorial watched at 9am and again at 2pm collapse into one
 * "Python" / watching draft, while a different language never blends in.
 *
 * `languageHint`, when provided, is used only as the fallback for events
 * where no language/topic could be detected — it never overrides a real
 * per-event detection, and is never "Learning".
 *
 * `runId`, when provided, is stamped onto every resulting draft. The caller
 * (app/api/activitywatch/route.ts) generates ONE runId per poll request and
 * passes it to every eventsToSessions call within that request — even
 * though coding and watching events come from different buckets and are
 * parsed in separate calls, they're all part of the same logical "one
 * import from one poll", and should group together in the Sessions history
 * display the same way one native-tracker run does.
 */
export function eventsToSessions(
  events: AWEvent[],
  kind: "coding" | "watching",
  languageHint?: string,
  runId?: string
): SessionDraft[] {
  if (events.length === 0) return [];

  const MIN_DURATION_MINUTES = 1;
  const fallbackLanguage = languageHint ?? "Other";

  // Group by detected language so e.g. a Python tutorial watched in two
  // separate sittings becomes one Python draft, and a session that drifts
  // from a Python tutorial to a React tutorial yields two distinct drafts
  // instead of one merged "whichever language had more total time" draft.
  const byLanguage = new Map<string, AWEvent[]>();

  for (const e of events) {
    const lang = eventLanguage(e, kind) || fallbackLanguage;
    const existing = byLanguage.get(lang);
    if (existing) {
      existing.push(e);
    } else {
      byLanguage.set(lang, [e]);
    }
  }

  return Array.from(byLanguage.entries())
    .map(([language, group]): SessionDraft | null => {
      const totalSeconds = group.reduce((s, e) => s + (e.duration ?? 0), 0);
      const durationMinutes = Math.round(totalSeconds / 60);
      if (durationMinutes < MIN_DURATION_MINUTES) return null;

      return { language, kind, durationMinutes, source: "activitywatch", runId };
    })
    .filter((s): s is SessionDraft => s !== null);
}
