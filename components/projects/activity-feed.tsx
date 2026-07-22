"use client";
/**
 * ActivityFeed — refinement pass over the Checkpoint C redesign. Same
 * interaction model (status presence still determines comment vs. update,
 * no manual mode toggle) — this pass sharpens the execution:
 *
 *  - Updates and comments are now clearly different WEIGHTS of card, not
 *    just a colored border — updates get more padding, a real status
 *    badge (icon + label, not just a dot), and a touch of elevation;
 *    comments stay small and quiet.
 *  - System-generated entries (task completed, resource added, note
 *    updated, project archived — wired up in lib/projects-context.tsx)
 *    render as their own compact, iconography-led row, visually distinct
 *    from anything a person typed.
 *  - Replies collapse behind a real "Reply" button (icon + label) instead
 *    of a permanent input; nested replies are clearly indented.
 *  - Attachments get a real icon/type/label parsed straight from the URL
 *    (lib/link-preview.ts) — no network calls, no fabricated metadata.
 *  - A single derived "pinned status" card (the latest update — nothing
 *    new persisted) sits above the timeline.
 *  - A subtle filter row, hover-gated delete actions, native-tooltip
 *    timestamps, mount/expand animation (respects prefers-reduced-motion,
 *    see styles/shell.css), and basic a11y (labeled icon buttons, Escape
 *    to close the status dropdown, focus-visible rings using existing
 *    tokens only — no new colors anywhere in this file).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityAttachment, ActivityEntryTag, ActivityStatusTag, ProjectActivityEntry, SystemEventType,
} from "@/types/project";
import { FileAttachmentRow } from "@/components/documents/file-attachment-row";
import { detectLinkKind } from "@/lib/link-preview";
import { tauriOpenUrl } from "@/lib/tauri/bridge";
import { cn } from "@/lib/utils";
import { Timestamp } from "@/components/ui/timestamp";
import {
  MessageSquare, Paperclip, Link2, X, ChevronDown, Trash2, Check,
  TrendingUp, AlertTriangle, Ban, CheckCircle2,
  Plus, Minus, Pencil, Archive, ArchiveRestore, CornerUpLeft,
  type LucideIcon,
} from "lucide-react";

const STATUS_OPTIONS: { value: Exclude<ActivityStatusTag, null>; label: string }[] = [
  { value: "on-track", label: "On Track" },
  { value: "at-risk", label: "At Risk" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

function statusColor(tag: ActivityStatusTag): string {
  switch (tag) {
    case "on-track": return "var(--status-warning)";
    case "at-risk": return "var(--status-learning)";
    case "blocked": return "var(--status-error)";
    case "done": return "var(--status-success)";
    default: return "var(--text-muted)";
  }
}
function statusIcon(tag: ActivityStatusTag): LucideIcon {
  switch (tag) {
    case "on-track": return TrendingUp;
    case "at-risk": return AlertTriangle;
    case "blocked": return Ban;
    case "done": return CheckCircle2;
    default: return TrendingUp;
  }
}
function statusLabel(tag: ActivityStatusTag): string {
  return STATUS_OPTIONS.find((o) => o.value === tag)?.label ?? "";
}

const SYSTEM_EVENT_ICON: Record<SystemEventType, LucideIcon> = {
  "task-created": Plus,
  "task-completed": CheckCircle2,
  "resource-added": Paperclip,
  "resource-removed": Minus,
  "note-updated": Pencil,
  "project-archived": Archive,
  "project-unarchived": ArchiveRestore,
};

/** Native tooltip only — full date, time, and the browser's own timezone
 * label, all from Intl (no network, no extra dependency). */
export interface NewActivityEntryInput {
  parentId?: string | null;
  tag: Exclude<ActivityEntryTag, "system">;
  statusTag?: ActivityStatusTag;
  content: string;
  attachments?: ActivityAttachment[];
}

type FilterValue = "all" | "updates" | "comments" | "system" | Exclude<ActivityStatusTag, null>;
const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "updates", label: "Updates" },
  { value: "comments", label: "Comments" },
  { value: "system", label: "System" },
  { value: "on-track", label: "On Track" },
  { value: "at-risk", label: "At Risk" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

export function ActivityFeed({
  entries,
  repliesFor,
  onAddEntry,
  onDeleteEntry,
}: {
  entries: ProjectActivityEntry[];
  repliesFor: (entryId: string) => ProjectActivityEntry[];
  onAddEntry: (input: NewActivityEntryInput) => void;
  onDeleteEntry: (id: string) => void;
}) {
  const [filter, setFilter] = useState<FilterValue>("all");

  // Derived, not persisted — "only one pinned status" falls out naturally
  // from always showing just the single latest update, no separate pin
  // state to keep in sync.
  const pinnedStatus = useMemo(() => entries.find((e) => e.tag === "update" && e.statusTag), [entries]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "all": return entries;
      case "updates": return entries.filter((e) => e.tag === "update");
      case "comments": return entries.filter((e) => e.tag === "comment");
      case "system": return entries.filter((e) => e.tag === "system");
      default: return entries.filter((e) => e.statusTag === filter);
    }
  }, [entries, filter]);

  return (
    <div className="space-y-4">
      {pinnedStatus && <PinnedStatusCard entry={pinnedStatus} />}

      <Composer onAddEntry={onAddEntry} />

      {entries.length > 0 && <FilterBar value={filter} onChange={setFilter} />}

      {entries.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <p className="px-1 py-6 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
          Nothing matches this filter.
        </p>
      ) : (
        <div className="space-y-2" role="feed" aria-label="Project activity">
          {filtered.map((entry, i) => (
            <div key={entry.id} className="activity-entry-in" style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}>
              {entry.tag === "system" ? (
                <SystemEntryRow entry={entry} onDeleteEntry={onDeleteEntry} />
              ) : (
                <ActivityEntryCard entry={entry} replies={repliesFor(entry.id)} onAddEntry={onAddEntry} onDeleteEntry={onDeleteEntry} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pinned status ────────────────────────────────────────────────────────

function PinnedStatusCard({ entry }: { entry: ProjectActivityEntry }) {
  const Icon = statusIcon(entry.statusTag);
  const color = statusColor(entry.statusTag);
  return (
    <div
      className="activity-status-transition rounded-lg border p-3"
      style={{ borderColor: "var(--border-subtle)", background: "var(--surface-elevated)" }}
    >
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        Current Project Status
      </p>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color }} />
        <div className="min-w-0">
          <span className="font-mono text-[12px] font-semibold uppercase tracking-wide" style={{ color }}>
            {statusLabel(entry.statusTag)}
          </span>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>{entry.content}</p>
          <p className="mt-1 font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
            Last updated <Timestamp iso={entry.createdAt} />
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Filters ──────────────────────────────────────────────────────────────

function FilterBar({ value, onChange }: { value: FilterValue; onChange: (v: FilterValue) => void }) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Filter activity">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          aria-pressed={value === f.value}
          className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors"
          style={
            value === f.value
              ? { color: "var(--accent-primary)", background: "var(--surface-elevated)" }
              : { color: "var(--text-muted)" }
          }
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="quiet-empty">
      <p className="quiet-empty-title">Nothing has happened yet.</p>
      <p className="quiet-empty-sub">Post an update, leave a comment, or complete a task to get this timeline moving.</p>
    </div>
  );
}

// ── Timestamp ────────────────────────────────────────────────────────────

// ── Composer ───────────────────────────────────────────────────────────

function Composer({ onAddEntry }: { onAddEntry: (input: NewActivityEntryInput) => void }) {
  const [content, setContent] = useState("");
  const [statusTag, setStatusTag] = useState<ActivityStatusTag>(null);
  const [attachments, setAttachments] = useState<ActivityAttachment[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachName, setAttachName] = useState("");
  const [attachUrl, setAttachUrl] = useState("");

  function addAttachment() {
    if (!attachUrl.trim()) return;
    const detected = detectLinkKind(attachUrl.trim());
    setAttachments((prev) => [...prev, { name: attachName.trim() || detected.label, url: attachUrl.trim() }]);
    setAttachName("");
    setAttachUrl("");
    setAttachOpen(false);
  }

  function submit() {
    if (!content.trim()) return;
    const tag: Exclude<ActivityEntryTag, "system"> = statusTag ? "update" : "comment";
    // Auto-include a pending, not-yet-"Added" attachment instead of
    // silently dropping it — typing a URL and clicking Post directly
    // (without a separate click on "Add" first) used to lose it with no
    // warning at all, which is exactly what happened here.
    const pendingUrl = attachUrl.trim();
    const finalAttachments = pendingUrl
      ? [...attachments, { name: attachName.trim() || detectLinkKind(pendingUrl).label, url: pendingUrl }]
      : attachments;
    onAddEntry({ tag, statusTag, content: content.trim(), attachments: finalAttachments });
    setContent("");
    setStatusTag(null);
    setAttachments([]);
    setAttachName("");
    setAttachUrl("");
    setAttachOpen(false);
  }

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--border-subtle)" }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write something about this project…"
        rows={3}
        aria-label="New activity post"
        className="w-full resize-none bg-transparent text-[13px] focus:outline-none"
        style={{ color: "var(--text-primary)" }}
      />

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((a, i) => {
            const detected = a.url ? detectLinkKind(a.url) : null;
            const Icon = detected?.icon ?? Link2;
            return (
              <span
                key={i}
                className="flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px]"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
              >
                <Icon className="h-3 w-3" />
                {a.name}
                <button onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))} aria-label={`Remove attachment ${a.name}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {attachOpen && (
        <div className="mb-2">
          <p className="mb-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            Attach a supporting link to this post (e.g. a PR or commit) — separate from the project's Resources tab.
          </p>
          <div className="flex items-center gap-1.5">
            <input
              value={attachName}
              onChange={(e) => setAttachName(e.target.value)}
              placeholder="Label"
              aria-label="Attachment label"
              className="w-[110px] rounded-md border bg-transparent px-2 py-1 text-[12px] focus:outline-none"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            />
            <input
              value={attachUrl}
              onChange={(e) => setAttachUrl(e.target.value)}
              placeholder="https://…"
              aria-label="Attachment URL"
              onKeyDown={(e) => e.key === "Enter" && addAttachment()}
              className="flex-1 rounded-md border bg-transparent px-2 py-1 text-[12px] focus:outline-none"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            />
            <button onClick={addAttachment} className="font-mono text-[10px] uppercase" style={{ color: "var(--accent-primary)" }}>Attach</button>
          </div>
        </div>
      )}

      <div className="mt-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAttachOpen((o) => !o)}
            aria-label="Attach a link"
            aria-pressed={attachOpen}
            title="Attach a link"
            className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary rounded-md p-1.5"
            style={{ color: attachOpen ? "var(--accent-primary)" : "var(--text-muted)" }}
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          <StatusDropdown value={statusTag} onChange={setStatusTag} />
        </div>

        <button
          onClick={submit}
          disabled={!content.trim()}
          className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary rounded-md px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-40"
          style={{ background: "var(--accent-primary)" }}
        >
          Post
        </button>
      </div>
    </div>
  );
}

function StatusDropdown({ value, onChange }: { value: ActivityStatusTag; onChange: (v: ActivityStatusTag) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="activity-status-transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wide"
        style={{ borderColor: value ? "var(--border-accent)" : "var(--border-subtle)", color: value ? statusColor(value) : "var(--text-muted)" }}
      >
        {value && <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor(value) }} />}
        {value ? statusLabel(value) : "Status (Optional)"}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-20 min-w-[140px] overflow-hidden rounded-md border py-1"
          style={{ borderColor: "var(--border-default)", background: "var(--surface-overlay)", boxShadow: "var(--shadow-lg)" }}
        >
          <DropdownRow active={value === null} label="None" onClick={() => { onChange(null); setOpen(false); }} />
          {STATUS_OPTIONS.map((opt) => (
            <DropdownRow
              key={opt.value}
              active={value === opt.value}
              label={opt.label}
              dotColor={statusColor(opt.value)}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DropdownRow({ label, dotColor, active, onClick }: { label: string; dotColor?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      role="option"
      aria-selected={active}
      onClick={onClick}
      className="focus-visible:outline-none focus-visible:bg-[var(--surface-elevated)] flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--surface-elevated)]"
      style={{ color: "var(--text-secondary)" }}
    >
      {dotColor ? (
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: dotColor }} />
      ) : (
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full border" style={{ borderColor: "var(--text-muted)" }} />
      )}
      <span className="flex-1">{label}</span>
      {active && <Check className="h-3 w-3" style={{ color: "var(--accent-primary)" }} />}
    </button>
  );
}

// ── Entry card ───────────────────────────────────────────────────────────

function ActivityEntryCard({
  entry, replies, onAddEntry, onDeleteEntry,
}: {
  entry: ProjectActivityEntry;
  replies: ProjectActivityEntry[];
  onAddEntry: (input: NewActivityEntryInput) => void;
  onDeleteEntry: (id: string) => void;
}) {
  const isUpdate = entry.tag === "update" && !!entry.statusTag;
  const [replyOpen, setReplyOpen] = useState(false);
  const StatusIcon = isUpdate ? statusIcon(entry.statusTag) : null;

  return (
    <article
      className={cn("group activity-status-transition rounded-lg", isUpdate ? "p-3.5" : "px-3 py-2")}
      style={
        isUpdate
          ? { borderLeft: `2px solid ${statusColor(entry.statusTag)}`, background: "var(--surface-elevated)" }
          : { borderLeft: "2px solid transparent" }
      }
      aria-label={isUpdate ? `${statusLabel(entry.statusTag)} update` : "Comment"}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {isUpdate && StatusIcon ? (
            <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide" style={{ color: statusColor(entry.statusTag) }}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusLabel(entry.statusTag)}
            </span>
          ) : (
            <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          )}
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>You</span>
          <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
            · <Timestamp iso={entry.createdAt} />
          </span>
        </div>
        <button
          onClick={() => onDeleteEntry(entry.id)}
          aria-label="Delete entry"
          title="Delete"
          className="flex-shrink-0 rounded p-1 opacity-0 transition-opacity duration-150 hover:bg-status-error/10 hover:text-status-error focus-visible:opacity-100 group-hover:opacity-100"
          style={{ color: "var(--text-muted)" }}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <p
        className="mt-1 whitespace-pre-wrap"
        style={{
          fontSize: isUpdate ? "13.5px" : "13px",
          fontWeight: isUpdate ? 500 : 400,
          color: isUpdate ? "var(--text-primary)" : "var(--text-secondary)",
        }}
      >
        {entry.content}
      </p>

      {entry.attachments.length > 0 && (
        <div className="mt-2 space-y-1">
          {entry.attachments.map((a, i) => {
            const detected = a.url ? detectLinkKind(a.url) : null;
            return (
              <FileAttachmentRow
                key={i}
                name={a.name}
                sizeBytes={a.sizeBytes}
                typeLabel={detected?.type ?? "Link"}
                icon={detected?.icon ?? Link2}
                onClick={() => a.url && tauriOpenUrl(a.url)}
              />
            );
          })}
        </div>
      )}

      {replies.length > 0 && (
        <div className="mt-2 space-y-1.5 border-l pl-3" style={{ borderColor: "var(--border-subtle)" }}>
          {replies.map((reply) => (
            <div key={reply.id} className="group/reply flex items-start justify-between gap-2">
              <p className="text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
                <span className="mr-1.5" style={{ color: "var(--text-muted)" }}>You</span>
                <span className="mr-1.5 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <Timestamp iso={reply.createdAt} />
                </span>
                {reply.content}
              </p>
              <button
                onClick={() => onDeleteEntry(reply.id)}
                aria-label="Delete reply"
                title="Delete"
                className="flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity duration-150 hover:bg-status-error/10 hover:text-status-error focus-visible:opacity-100 group-hover/reply:opacity-100"
                style={{ color: "var(--text-muted)" }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2">
        {replyOpen ? (
          <div className="activity-reply-in">
            <ReplyEditor
              onCancel={() => setReplyOpen(false)}
              onSubmit={(text) => {
                onAddEntry({ parentId: entry.id, tag: "comment", content: text });
                setReplyOpen(false);
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setReplyOpen(true)}
            className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary flex items-center gap-1 rounded-md px-1 py-0.5 font-mono text-[10px] uppercase tracking-wide opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
            style={{ color: "var(--text-muted)" }}
          >
            <CornerUpLeft className="h-3 w-3" />
            Reply
          </button>
        )}
      </div>
    </article>
  );
}

function ReplyEditor({ onSubmit, onCancel }: { onSubmit: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Reply"
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) onSubmit(text.trim());
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => { if (!text.trim()) onCancel(); }}
        placeholder="Leave a reply…"
        className="flex-1 rounded-md border bg-transparent px-2.5 py-1.5 text-[12px] focus:outline-none"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
      />
    </div>
  );
}

// ── System event row ───────────────────────────────────────────────────
// Deliberately the most compact, lowest-weight row in the feed — a person
// should instantly read these as "the app noted this happened", not as
// something someone wrote.

function SystemEntryRow({ entry, onDeleteEntry }: { entry: ProjectActivityEntry; onDeleteEntry: (id: string) => void }) {
  const Icon = entry.systemEventType ? SYSTEM_EVENT_ICON[entry.systemEventType] : Pencil;
  return (
    <div className="group flex items-center gap-2 px-3 py-1">
      <Icon className="h-3 w-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
      <p className="min-w-0 flex-1 truncate text-[12px]" style={{ color: "var(--text-muted)" }}>{entry.content}</p>
      <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
        <Timestamp iso={entry.createdAt} />
      </span>
      <button
        onClick={() => onDeleteEntry(entry.id)}
        aria-label="Delete system entry"
        title="Delete"
        className="flex-shrink-0 rounded p-1 opacity-0 transition-opacity duration-150 hover:bg-status-error/10 hover:text-status-error focus-visible:opacity-100 group-hover:opacity-100"
        style={{ color: "var(--text-muted)" }}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
