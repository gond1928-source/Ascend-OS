"use client";

import { useEffect, useState } from "react";
import { StudyItem } from "@/types/document";
import { renderMarkdown } from "@/lib/markdown";
import { Button } from "@/components/ui/button";
import { Pencil, Eye, Columns2, Save, Link2, FileWarning, Loader2 } from "lucide-react";
import { FileAttachmentRow } from "./file-attachment-row";
import { tauriFetch, tauriOpenUrl } from "@/lib/tauri/bridge";

type Mode = "read" | "edit" | "split";

/**
 * A real, reachable PDF needs an absolute http(s) URL — anything else
 * (a bare filename, a relative path, empty string, garbled test data) will
 * never resolve to real bytes. Catching that upfront avoids even
 * attempting a fetch for obviously-invalid stored content.
 */
export function looksLikeLoadablePdfUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function StudyItemView({
  item,
  onSave,
}: {
  item: StudyItem;
  onSave: (patch: Partial<Pick<StudyItem, "content">>) => void;
}) {
  const editable = item.kind === "note" || item.kind === "reference";

  if (!editable) {
    return <ReadOnlyStudyItem item={item} />;
  }

  return <EditableNote item={item} onSave={onSave} />;
}

function ReadOnlyStudyItem({ item }: { item: StudyItem }) {
  if (item.kind === "screenshot") {
    return (
      <div className="doc-prose">
        {/* content is a data URL for screenshots */}
        <img src={item.content} alt={item.title} className="w-full rounded-lg border border-white/[0.06]" />
      </div>
    );
  }

  if (item.kind === "pdf") {
    return <PdfViewer url={item.content} title={item.title} />;
  }

  // Links aren't rendered natively — they open in the browser, same as
  // clicking any other external URL. Same file-attachment-row treatment
  // as PDFs in the Study Library list for visual consistency.
  return (
    <div className="doc-prose">
      <FileAttachmentRow
        name={item.content}
        typeLabel="Link"
        icon={Link2}
        onClick={() => tauriOpenUrl(item.content)}
      />
      <p className="doc-p text-ink-500 mt-3">This opens externally in your browser.</p>
    </div>
  );
}

/**
 * Renders a PDF by fetching its bytes and handing the iframe a local
 * `blob:` URL, rather than pointing the iframe straight at the remote
 * host. This matters: pointing an iframe directly at a cross-origin URL
 * means the *remote host's own* X-Frame-Options/CSP headers decide
 * whether it renders — if they refuse framing (or the host doesn't
 * resolve at all), the browser/webview shows its own native "refused to
 * connect" page bleeding through our chrome, with no JS-visible signal we
 * can catch (cross-origin iframe failures are opaque by design).
 *
 * Fetching the bytes ourselves sidesteps that: a `blob:` URL is same-
 * origin, so framing it is never subject to the original host's headers.
 * It also gives us a real success/failure signal to show our own quiet
 * message on, instead of the browser's error page. Inside Tauri this goes
 * through tauriFetch → the native HTTP client (@tauri-apps/plugin-http),
 * which isn't subject to browser CORS either — see that function's doc
 * comment. Outside Tauri (plain browser fallback) a fetch can still fail
 * on hosts without permissive CORS headers even though a direct
 * navigation would have worked; that shows the same quiet failure state
 * here, with "Open externally" (Document Reader header) as the escape
 * hatch either way.
 */
function PdfViewer({ url, title }: { url: string; title: string }) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "ready"; blobUrl: string } | { status: "error"; message: string }
  >(() => (looksLikeLoadablePdfUrl(url) ? { status: "loading" } : { status: "error", message: "not-a-url" }));

  useEffect(() => {
    if (!looksLikeLoadablePdfUrl(url)) {
      setState({ status: "error", message: "not-a-url" });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setState({ status: "loading" });

    (async () => {
      try {
        const res = await tauriFetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType && !contentType.includes("pdf") && !contentType.includes("octet-stream")) {
          // Whatever this is, it isn't a PDF (e.g. an HTML error page
          // served with a 200) — treat it as a load failure rather than
          // handing the iframe bytes it can't render.
          throw new Error(`Unexpected content type: ${contentType}`);
        }
        const bytes = await res.arrayBuffer();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        setState({ status: "ready", blobUrl: objectUrl });
      } catch (err) {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof Error ? err.message : "Failed to load" });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (state.status === "loading") {
    return (
      <div className="doc-prose flex h-full flex-col items-center justify-center text-center">
        <Loader2 className="mb-2 h-5 w-5 animate-spin" style={{ color: "var(--text-muted)" }} />
        <p className="doc-p text-ink-500">Loading PDF…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="doc-prose flex h-full flex-col items-center justify-center text-center">
        <FileWarning className="mb-2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
        <p className="doc-p text-ink-300">
          {state.message === "not-a-url" ? "This item doesn't have a loadable PDF link." : "Couldn't load this PDF."}
        </p>
        <p className="doc-p text-ink-500">
          {state.message === "not-a-url"
            ? "Its stored content isn't a valid web address — re-add it from Study Library with a real hosted PDF URL."
            : "The host may be unreachable or refusing the request — try \"Open externally\" above, or re-check the URL."}
        </p>
      </div>
    );
  }

  return (
    <iframe
      src={state.blobUrl}
      title={title}
      className="h-full w-full rounded-lg border"
      style={{ borderColor: "var(--border-subtle)", background: "var(--surface-panel)" }}
    />
  );
}

function EditableNote({
  item,
  onSave,
}: {
  item: StudyItem;
  onSave: (patch: Partial<Pick<StudyItem, "content">>) => void;
}) {
  const [mode, setMode] = useState<Mode>("read");
  const [draft, setDraft] = useState(item.content);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const dirty = draft !== item.content;

  const handleSave = () => {
    onSave({ content: draft });
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 1600);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-base-900/40 p-1">
          <ModeButton active={mode === "read"} onClick={() => setMode("read")} icon={Eye} label="Read" />
          <ModeButton active={mode === "edit"} onClick={() => setMode("edit")} icon={Pencil} label="Edit" />
          <ModeButton active={mode === "split"} onClick={() => setMode("split")} icon={Columns2} label="Split" />
        </div>
        {mode !== "read" && (
          <Button variant={dirty ? "primary" : "outline"} onClick={handleSave} disabled={!dirty && savedAt === null} className="!px-3 !py-1.5 !text-[12px]">
            <Save className="h-3.5 w-3.5" /> {savedAt ? "Saved" : "Save"}
          </Button>
        )}
      </div>

      {mode === "read" && <div className="doc-prose">{renderMarkdown(draft)}</div>}

      {mode === "edit" && (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          className="doc-editor-textarea min-h-[60vh] w-full"
          placeholder="Write in markdown — # headings, **bold**, - lists, ```code```…"
        />
      )}

      {mode === "split" && (
        <div className="grid grid-cols-2 gap-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="doc-editor-textarea min-h-[60vh] w-full"
            placeholder="Write in markdown — # headings, **bold**, - lists, ```code```…"
          />
          <div className="doc-prose border-l border-white/[0.06] pl-4">{renderMarkdown(draft)}</div>
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Eye;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
        active ? "bg-accent-violet/15 text-accent-violet" : "text-ink-500 hover:text-ink-300"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
