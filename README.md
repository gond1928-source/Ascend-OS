# ascend-os

A developer productivity OS that tracks **active coding time** separately from
**passive tutorial-watching time**, and visualizes the split through a real
analytics dashboard.

## What's implemented in this pass

This is a from-scratch Next.js 14 (App Router) + TypeScript + Tailwind scaffold,
built directly against the file structure you specified. To stay within a single
focused pass, effort went in this order:

1. **The analytics dashboard (core V1 feature)** — fully built, real components,
   real chart logic, backed by 90 days of generated mock session data.
2. **The architecture around it** — types, the analytics engine, API routes,
   hooks, and the full folder layout — built out so the project is genuinely
   scalable, not just the one page.
3. **Everything else in the file tree** (timer, gamification, sessions CRUD,
   Prisma, Electron) — present as clean, working stubs with clear `// TODO`-style
   comments on what to wire up next, so nothing in your spec is missing from
   disk, but effort wasn't spent gold-plating features you didn't ask to be
   the priority.

## Analytics dashboard — what's there

`/analytics` (and a lighter overview on `/dashboard`) includes every item
requested:

- Coding vs. Watching split (donut + stat readout)
- Per-language coding time **and** watching time (matches your Python/JS example)
- Daily coding activity graph (last 30 days)
- Weekly trend analytics (last 8 weeks)
- Session history timeline
- Total coding hours by language
- Most-used language stat
- Productivity heatmap (terminal-style commit grid, last 119 days)
- Daily streak tracking (current + longest streak)

All of it is driven by `lib/analytics-engine.ts` — a pure, framework-free module
that turns a `Session[]` into an `AnalyticsSummary`. No component computes its
own aggregates; they all read from this one source of truth, via `/api/analytics`
and the `useAnalytics()` hook. Swapping the mock JSON for Prisma later means
changing the data source in one route, not touching any chart.

## Running it

```bash
npm install
npm run dev
```

Sessions currently come from `data/starter-data.json` (90 days of realistic
generated activity across Python, JavaScript, TypeScript, Rust, Go, C++).
Swap this for the real Prisma-backed store described in `database/schema.prisma`
when you're ready to persist live data — `lib/analytics-engine.ts` doesn't change.

## What's stubbed, on purpose

- **Gamification** (`lib/xp-system.ts`, `level-system.ts`, `achievement-engine.ts`,
  `components/gamification/*`) — simple, working placeholder rules, ready to
  extend without changing their call sites.
- **Sessions CRUD** — `/sessions` has a real form and list UI; `POST /api/sessions`
  currently echoes input instead of persisting (no DB connected yet).
- **ActivityWatch bridge** (`lib/activitywatch.ts`, `/api/activitywatch`) — typed
  stub matching AW's API shape, not yet polling a live instance.
- **Electron** — empty entrypoints so desktop packaging has somewhere to start.
- **Prisma** — full `schema.prisma` written; not yet migrated/connected (no
  `DATABASE_URL` provisioned in this environment).

## Notes

- I wasn't able to run `npm install` / a real build in this sandbox (no network
  egress to the npm registry), so I couldn't compile-check this end to end.
  Everything was written carefully and the import graph was traced by hand, but
  run `npm run dev` on your machine as the real verification step — if anything
  trips, paste me the error and I'll fix it directly.
- Design direction: dark, terminal/dev-tool inspired (monospace stat readouts,
  a commit-graph-style heatmap, GitHub-language-style color coding) rather than
  a generic dashboard template, since the product itself is a tool for developers.
