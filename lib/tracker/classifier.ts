/**
 * ActivityClassifier v1 — simple, strict, believable.
 *
 * CODING requires ALL of:
 *   1. Focused app is one of the 8 supported editors
 *   2. Window title contains a real code file extension
 *   3. keyboardActivityDetected === true  (mouse-only activity is completely ignored)
 *   4. Title does NOT match a non-coding IDE panel (Welcome, Settings, etc.)
 *
 * LEARNING requires:
 *   - Browser focused
 *   - Title contains a tutorial keyword OR a programming keyword
 *   - No entertainment keyword present (entertainment is checked first and wins)
 *
 * ENTERTAINMENT: entertainment app focused, or browser title matches an
 * entertainment keyword.
 *
 * No focus score, no URL allowlists, no fuzzy heuristics — title + app name
 * only. Mouse movement is never read by this module.
 */

import { ClassifiedSnapshot, WindowSnapshot } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Supported IDE / editor process names (exactly the v1 supported set)
// ─────────────────────────────────────────────────────────────────────────────

const CODING_APPS: string[] = [
  "code", "vscode", "visual studio code", // VS Code
  "cursor",                                // Cursor
  "pycharm",                                // PyCharm
  "intellij",                               // IntelliJ
  "zed",                                    // Zed
  "webstorm",                                // WebStorm
  "neovim", "nvim",                         // Neovim
  "sublime text", "sublime",                // Sublime
];

/**
 * Editor window titles conventionally end with "<file> - <folder> - <Editor Name>"
 * (e.g. "main.py - my-project - Visual Studio Code"). This is checked as a
 * SECOND, independent signal alongside CODING_APPS (appName).
 *
 * Why this matters: an IDE's integrated terminal can cause the OS-level
 * window watcher to misreport the focused process as the shell itself
 * (powershell/bash/zsh/...) even though the actual window — and its title —
 * is unmistakably the editor. When that happens, appName lies but the title
 * doesn't, so it's checked too rather than trusted blindly either way.
 */
const IDE_TITLE_SIGNATURES: Record<string, string> = {
  "visual studio code": "VS Code",
  "vscode": "VS Code",
  "cursor": "Cursor",
  "pycharm": "PyCharm",
  "intellij idea": "IntelliJ",
  "intellij": "IntelliJ",
  "zed": "Zed",
  "webstorm": "WebStorm",
  "neovim": "Neovim",
  "nvim": "Neovim",
  "sublime text": "Sublime",
};

// Terminals are NEVER coding in v1 — too unreliable a signal, and not part
// of the supported editor list. Always classified as "other".
// (Only reached when the window isn't already recognized as an IDE by
// either appName or its title signature — see IDE_TITLE_SIGNATURES above.)
const TERMINAL_APPS: string[] = [
  "iterm2", "iterm", "terminal", "warp", "hyper", "kitty", "alacritty",
  "windows terminal", "powershell", "cmd", "bash", "zsh",
];

// ─────────────────────────────────────────────────────────────────────────────
// Valid code file extensions (window title must contain one of these)
// ─────────────────────────────────────────────────────────────────────────────

const CODE_EXTENSIONS: string[] = [
  ".py",
  ".js", ".ts", ".tsx", ".jsx",
  ".java",
  ".cpp", ".c",
  ".cs",
  ".go",
  ".rs",
  ".html",
  ".css",
  ".sql",
  ".json",
  ".yaml",
  ".toml",
];

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".py": "Python",
  ".js": "JavaScript",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".jsx": "JavaScript",
  ".java": "Java",
  ".cpp": "C++",
  ".c": "C",
  ".cs": "C#",
  ".go": "Go",
  ".rs": "Rust",
  ".html": "HTML",
  ".css": "CSS",
  ".sql": "SQL",
  ".json": "JSON",
  ".yaml": "YAML",
  ".toml": "TOML",
};

// ─────────────────────────────────────────────────────────────────────────────
// Non-coding IDE states — these titles mean the IDE is open but NOT coding
// ─────────────────────────────────────────────────────────────────────────────

const NON_CODING_TITLE_PATTERNS: RegExp[] = [
  /\bwelcome\b/i,
  /\bsettings\b/i,
  /\bextensions\b/i,
  /\bmarketplace\b/i,
  /\boutput\b/i,
  /\bdebug console\b/i,
  /chatgpt/i,
  /youtube/i,
  // NOTE: /\bterminal\b/i intentionally removed — VS Code integrated terminal
  // titles still contain the editor name + a real code file, so they must not
  // be rejected here. The code-file + keyboard guards below are sufficient.
  /\bproblems\b/i,
  /\bsource control\b/i,
  /\buntitled\b/i,
];

// ─────────────────────────────────────────────────────────────────────────────
// Browser apps
// ─────────────────────────────────────────────────────────────────────────────


const BROWSER_TITLE_SIGNATURES: string[] = [
  "youtube",
  "google chrome",
  "chrome",
  "mozilla firefox",
  "firefox",
  "microsoft edge",
  "edge",
  "brave",
  "opera",
  "vivaldi",
  "chromium",
  "udemy",
  "coursera",
];

const BROWSER_APPS: string[] = [
  "google chrome", "chrome",
  "mozilla firefox", "firefox",
  "safari",
  "microsoft edge", "msedge", "edge",
  "brave browser", "brave",
  "arc",
  "opera",
  "vivaldi",
  "chromium",
];

/**
 * Browser window titles conventionally end with " - <Browser Name>"
 * (e.g. "Claude - Google Chrome", "ChatGPT - Google Chrome"). This is the
 * suffix stripped off by extractBrowserSiteLabel() to recover just the page
 * title. Kept separate from BROWSER_TITLE_SIGNATURES above, which mixes in
 * non-browser-name content signals (e.g. "udemy", "coursera") that must NOT
 * be treated as a suffix to strip.
 */
const BROWSER_NAME_SUFFIXES: string[] = [
  "google chrome", "chrome",
  "mozilla firefox", "firefox",
  "microsoft edge", "edge",
  "brave browser", "brave",
  "opera", "vivaldi", "chromium", "safari", "arc",
];

/**
 * Hostname → friendly display name, for the (preferred, but often
 * unavailable) case where WindowSnapshot.url is populated. Only the sites
 * relevant to distraction tracking need an entry here; anything else falls
 * back to a prettified hostname (see prettifyHostname()).
 */
const KNOWN_SITE_LABELS: Record<string, string> = {
  "claude.ai": "Claude",
  "chatgpt.com": "ChatGPT",
  "chat.openai.com": "ChatGPT",
  "openai.com": "ChatGPT",
  "reddit.com": "Reddit",
  "youtube.com": "YouTube",
  "twitter.com": "X",
  "x.com": "X",
  "facebook.com": "Facebook",
  "instagram.com": "Instagram",
  "tiktok.com": "TikTok",
  "netflix.com": "Netflix",
  "twitch.tv": "Twitch",
  "github.com": "GitHub",
  "linkedin.com": "LinkedIn",
};

// ─────────────────────────────────────────────────────────────────────────────
// Learning detection — title keywords only, case-insensitive
// ─────────────────────────────────────────────────────────────────────────────

const TUTORIAL_KEYWORDS: string[] = [
  "tutorial", "course", "learn", "lesson", "guide", "explained", "beginner", "bootcamp",
];

const PROGRAMMING_KEYWORDS: string[] = [
  "python", "javascript", "typescript", "react", "nextjs", "html", "css", "sql",
  "node", "api", "database", "java", "cpp", "c++", "programming", "coding", "development",
];

/**
 * Title keyword → language/topic, for WATCHING sessions (tutorials, courses,
 * docs). Ordered most-specific-first so e.g. "nextjs" is checked before the
 * generic "node" or "react" substrings could otherwise mismatch it.
 *
 * This is intentionally a separate table from PROGRAMMING_KEYWORDS above:
 * PROGRAMMING_KEYWORDS answers "is this learning content?" (a boolean gate)
 * and includes generic, non-language terms like "api"/"database"/"coding".
 * This table answers "which language/topic is it?" — only real, nameable
 * languages/frameworks belong here. A watching session's language must come
 * from THIS extraction, never inherited from an adjacent coding session and
 * never defaulted to "Learning" or "unknown".
 */
const WATCHING_LANGUAGE_KEYWORDS: Array<{ keyword: string; language: string }> = [
  { keyword: "typescript", language: "TypeScript" },
  { keyword: "nextjs", language: "React" },
  { keyword: "next.js", language: "React" },
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
  { keyword: " go ", language: "Go" },
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
 * Extracts a specific language/topic from a watching-session title, e.g.
 * "Python Tutorial - YouTube" → "Python", "React Crash Course" → "React".
 * Returns null if no specific language/topic is recognized — callers must
 * NOT substitute "Learning", "unknown", or an adjacent session's language
 * when this returns null; the session should simply remain languageless
 * upstream (the session-builder falls back to a neutral label, never a
 * fabricated one).
 */
function extractWatchingLanguage(title: string): string | null {
  const t = normalizeTitle(title);
  for (const { keyword, language } of WATCHING_LANGUAGE_KEYWORDS) {
    if (t.includes(keyword)) return language;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entertainment detection
// ─────────────────────────────────────────────────────────────────────────────

const ENTERTAINMENT_KEYWORDS: string[] = [
  "minecraft", "gameplay", "funny", "meme", "stream", "music", "anime", "reaction",
];

const ENTERTAINMENT_APPS: string[] = [
  "spotify", "apple music",
  "vlc", "mpv", "mplayer",
  "steam", "epic games", "gog galaxy",
  "discord",
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase();
}

/**
 * Normalize a window title for keyword matching:
 * lowercase, trim, collapse duplicate whitespace into a single space.
 */
function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Extract the first matching code file (extension + filename) from a window title. */
function extractCodeFile(title: string): { ext: string; filename: string; language: string } | null {
  const t = normalizeTitle(title);
  for (const ext of CODE_EXTENSIONS) {
    const escapedExt = ext.replace(".", "\\.");
    // Capture the filename token (word chars + dots/dashes) ending in this extension,
    // as long as it's followed by a real boundary (so .js never matches inside .jsx).
    const pattern = new RegExp("([\\w.\\-]*" + escapedExt + ")(?=[\\s\\-–|\\[\\(]|$)", "i");
    const match = t.match(pattern);
    if (match) {
      return { ext, filename: match[1], language: EXTENSION_LANGUAGE_MAP[ext] ?? "Other" };
    }
  }
  return null;
}

/** Returns the display name of the editor whose signature appears in the title, or null. */
function detectIdeFromTitle(title: string): string | null {
  const t = normalizeTitle(title);
  for (const [sig, displayName] of Object.entries(IDE_TITLE_SIGNATURES)) {
    if (t.includes(sig)) return displayName;
  }
  return null;
}

/** True if the window title suggests a non-coding IDE state. */
function isNonCodingIdeState(title: string): string | null {
  for (const pattern of NON_CODING_TITLE_PATTERNS) {
    if (pattern.test(title)) {
      return pattern.source.replace(/\\b/g, "").replace(/\\/g, "");
    }
  }
  return null;
}

/** Turns "some-cool-site.com" into "Some Cool Site" as a last-resort label. */
function prettifyHostname(hostname: string): string {
  const base = hostname.split(".").slice(0, -1).join(".") || hostname;
  return base
    .split(/[-.]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Derives a site-level label for a browser window — e.g. "Claude" vs
 * "ChatGPT" — as distinct from the OS-reported process name, which is just
 * "Chrome"/"Google Chrome" for every tab regardless of which site is open.
 *
 * Preference order:
 *   1. The tab URL's hostname (most reliable, when the OS/browser exposes
 *      it — not all platforms do).
 *   2. The window title, with the trailing " - <Browser Name>" suffix
 *      stripped off. Nearly every desktop browser sets its window title to
 *      "<page title> - <Browser Name>", so what remains is normally exactly
 *      the site's own page title (e.g. "Claude", "ChatGPT").
 *
 * Returns null only if neither signal yields anything usable.
 */
export function extractBrowserSiteLabel(title: string, url?: string): string | null {
  if (url) {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
      if (hostname) {
        return KNOWN_SITE_LABELS[hostname] ?? prettifyHostname(hostname);
      }
    } catch {
      // Not a parseable URL — fall through to title parsing.
    }
  }

  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;

  let pageTitle = trimmedTitle;
  const lowerTitle = trimmedTitle.toLowerCase();
  for (const suffix of BROWSER_NAME_SUFFIXES) {
    // Match a trailing " - <suffix>" (allow either hyphen or en/em dash as
    // the separator, since browsers are inconsistent about which they use).
    const pattern = new RegExp("[\\s]+[-–—][\\s]+" + suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i");
    const match = lowerTitle.match(pattern);
    if (match) {
      pageTitle = trimmedTitle.slice(0, match.index).trim();
      break;
    }
  }

  return pageTitle.length > 0 ? pageTitle : null;
}

/** Returns the first matched entertainment keyword, or null. */
function matchEntertainmentKeyword(title: string): string | null {
  const t = normalizeTitle(title);
  for (const kw of ENTERTAINMENT_KEYWORDS) {
    if (t.includes(kw)) return kw;
  }
  return null;
}

/** Returns all matched learning keywords (programming keywords first, then tutorial keywords). */
function matchLearningKeywords(title: string): string[] {
  const t = normalizeTitle(title);
  const matches: string[] = [];
  for (const kw of PROGRAMMING_KEYWORDS) {
    if (t.includes(kw)) matches.push(kw);
  }
  for (const kw of TUTORIAL_KEYWORDS) {
    if (t.includes(kw)) matches.push(kw);
  }
  return matches;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public helpers (used by the native tracker hook for live UI state)
// ─────────────────────────────────────────────────────────────────────────────

export function isCodingApp(appName: string): boolean {
  const a = norm(appName);
  return CODING_APPS.some((c) => a.includes(c) || a === c);
}

export function isTerminalApp(appName: string): boolean {
  const a = norm(appName);
  return TERMINAL_APPS.some((t) => a.includes(t) || a === t);
}

export function isBrowserApp(appName: string): boolean {
  const a = norm(appName);
  return BROWSER_APPS.some((b) => a.includes(b));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main classifier
// ─────────────────────────────────────────────────────────────────────────────

export function classifySnapshot(snapshot: WindowSnapshot): ClassifiedSnapshot {
  const appLower = norm(snapshot.appName);
  const title = normalizeTitle(snapshot.windowTitle ?? "");

  // ── 1. Hard idle ─────────────────────────────────────────────────────────
  // WATCHING / LEARNING sessions must NOT be killed by the idle gate —
  // a user watching a tutorial video has no keyboard/mouse activity by design.
  // Only apply the hard idle return when content is clearly NOT learning.
  //
  // Logic: if the system reports idle AND the title/app does NOT look like
  // learning content, return idle immediately. If it looks like learning
  // content, fall through to the normal classification pipeline; the
  // segmenter's activeRatio guard handles truly dead sessions (no activity
  // for multiple consecutive polls).
  if (!snapshot.isUserActive) {
    const isBrowserActive =
      BROWSER_APPS.some((b) => appLower.includes(b)) ||
      BROWSER_TITLE_SIGNATURES.some((b) => title.includes(b));
    const idleTitleLearnMatches = matchLearningKeywords(title);
    const idleTitleEntKw = matchEntertainmentKeyword(title);
    const isLikelyWatching =
      isBrowserActive && idleTitleLearnMatches.length > 0 && !idleTitleEntKw;

    if (!isLikelyWatching) {
      return {
        ...snapshot,
        category: "idle",
        classificationReason: "User idle — no input detected",
        isActivelyCoding: false,
      };
    }
    // Falls through: watching/learning content detected — let steps 3+ classify it.
    // isUserActive is intentionally left as-is on the snapshot so downstream
    // metadata (activeRatio) still correctly reflects the idle period.
  }

  // ── 2. IDE / Editor ───────────────────────────────────────────────────────
  // Two independent signals, either is enough: the OS-reported app name, or
  // the window title's own editor signature (see IDE_TITLE_SIGNATURES).
  const isIdeByApp = CODING_APPS.some((c) => appLower.includes(c) || appLower === c);
  const ideFromTitle = detectIdeFromTitle(title);
  const isIde = isIdeByApp || ideFromTitle !== null;

  if (isIde) {
    // Prefer the OS-reported app name when it agrees; otherwise trust the
    // title (this is exactly the case where appName lies — e.g. an IDE's
    // integrated terminal getting reported as "powershell").
    const displayApp = isIdeByApp ? snapshot.appName : (ideFromTitle as string);

    // 2a. Non-coding IDE panel (Welcome, Settings, Extensions, Marketplace,
    //     Output, Debug Console, ChatGPT, YouTube, ...)
    const nonCodingReason = isNonCodingIdeState(title);
    if (nonCodingReason) {
      return {
        ...snapshot,
        category: "other",
        classificationReason: `IDE open — non-coding panel: "${nonCodingReason}"`,
        isActivelyCoding: false,
      };
    }

    // 2b. Must have a real code file in the title
    const codeFile = extractCodeFile(title);
    if (!codeFile) {
      return {
        ...snapshot,
        category: "other",
        classificationReason: "IDE open but no valid code file",
        isActivelyCoding: false,
      };
    }

    // 2c. Must have keyboard activity — mouse-only activity is ignored completely
    if (!snapshot.keyboardActivityDetected) {
      return {
        ...snapshot,
        category: "other",
        language: codeFile.language,
        classificationReason: `${displayApp} + ${codeFile.filename} — no keyboard activity (mouse ignored)`,
        isActivelyCoding: false,
      };
    }

    // ✅ All conditions met — genuine coding
    return {
      ...snapshot,
      category: "coding",
      language: codeFile.language,
      classificationReason: `${displayApp} + ${codeFile.filename} + keyboard active`,
      isActivelyCoding: true,
    };
  }

  // ── 3. Title-based learning/browser detection (runs BEFORE terminal rejection)
  //      If the window title contains tutorial or programming keywords, classify
  //      as LEARNING regardless of what process name the OS reports. This ensures
  //      YouTube tutorials, browser-based courses, etc. are never silently dropped
  //      by the terminal rejection gate below.
  //
  //      We also do a full browser check here so that a browser misreported as a
  //      shell process (rare but observed on Windows) is still handled correctly.
  const isBrowser = BROWSER_APPS.some((b) => appLower.includes(b));

  if (isBrowser) {
    // Site-level label (e.g. "Claude" vs "ChatGPT"), distinct from appName
    // which is just "Chrome" for every tab. Attached to every branch below
    // so the segmenter can group/label browser activity by site rather than
    // by browser process — see ClassifiedSnapshot.siteLabel and
    // segmenter.ts's primaryApp computation.
    const siteLabel = extractBrowserSiteLabel(snapshot.windowTitle ?? "", snapshot.url) ?? undefined;

    // 3a. Entertainment keyword — checked first, always wins
    const entKw = matchEntertainmentKeyword(title);
    if (entKw) {
      return {
        ...snapshot,
        category: "entertainment",
        classificationReason: `matched: ${entKw}`,
        siteLabel,
      };
    }

    // 3b. Tutorial / programming keyword → learning
    const learnMatches = matchLearningKeywords(title);
    if (learnMatches.length > 0) {
      const watchingLanguage = extractWatchingLanguage(title);
      return {
        ...snapshot,
        category: "learning",
        language: watchingLanguage ?? undefined,
        classificationReason: watchingLanguage
          ? `matched: ${learnMatches.slice(0, 2).join(" + ")} (language: ${watchingLanguage})`
          : `matched: ${learnMatches.slice(0, 2).join(" + ")} (no specific language detected)`,
        siteLabel,
      };
    }

    return {
      ...snapshot,
      category: "other",
      classificationReason: "Browser open — no tutorial/programming keywords in title",
      siteLabel,
    };
  }

  // ── 3b. Title-only learning detection for non-browser processes ───────────
  //        Catches: "Python Tutorial - YouTube" when Chrome is misreported as
  //        powershell, or any other app whose title clearly signals learning.
  const titleLearnMatches = matchLearningKeywords(title);
  const titleEntKw = matchEntertainmentKeyword(title);

  if (titleLearnMatches.length > 0 && !titleEntKw) {
    const watchingLanguage = extractWatchingLanguage(title);
    return {
      ...snapshot,
      category: "learning",
      language: watchingLanguage ?? undefined,
      classificationReason: `title matched: ${titleLearnMatches.slice(0, 2).join(" + ")} (process: ${snapshot.appName})${watchingLanguage ? ` (language: ${watchingLanguage})` : ""}`,
    };
  }

  // ── 4. Terminal rejection ─────────────────────────────────────────────────
  //       Only reached when:
  //         - the window was NOT already recognised as an IDE (step 2)
  //         - the window title contains NO learning/tutorial keywords (step 3b)
  //         - the app is NOT a browser (step 3)
  //       A genuine terminal with none of those signals is "other".
  const isTerminal = TERMINAL_APPS.some((t) => appLower.includes(t) || appLower === t);
  if (isTerminal) {
    return {
      ...snapshot,
      category: "other",
      classificationReason: "Terminal — not a supported coding surface",
      isActivelyCoding: false,
    };
  }

  // ── 5. Entertainment apps (Spotify, VLC, Steam, Discord, ...) ────────────
  if (ENTERTAINMENT_APPS.some((a) => appLower.includes(a))) {
    return {
      ...snapshot,
      category: "entertainment",
      classificationReason: `Entertainment app: "${snapshot.appName}"`,
    };
  }

  // ── 6. Fallback ───────────────────────────────────────────────────────────
  return {
    ...snapshot,
    category: "other",
    classificationReason: `Unclassified app: "${snapshot.appName}"`,
    isActivelyCoding: false,
  };
}
