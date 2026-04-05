# ChefFlow - Key File Locations & Workspace Map

> This file is imported by CLAUDE.md via `@docs/CLAUDE-REFERENCE.md`. It contains reference tables that Claude loads on demand.

## KEY FILE LOCATIONS

| What                   | Where                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Event FSM              | `lib/events/transitions.ts`                                                        |
| Ledger append          | `lib/ledger/append.ts`                                                             |
| Ledger compute         | `lib/ledger/compute.ts`                                                            |
| Chef dashboard         | `app/(chef)/dashboard/page.tsx`                                                    |
| Event form             | `components/events/event-form.tsx`                                                 |
| Event transitions UI   | `components/events/event-transitions.tsx`                                          |
| DB connection          | `lib/db/index.ts` (Drizzle + postgres.js)                                          |
| DB compat shim         | `lib/db/compat.ts` (PostgreSQL-like API over raw SQL)                              |
| DB schema (gen)        | `lib/db/schema/` (auto-introspected, do not edit)                                  |
| Drizzle config         | `drizzle.config.ts`                                                                |
| Auth config            | `lib/auth/auth-config.ts` (Auth.js v5 providers + callbacks)                       |
| Auth route handler     | `app/api/auth/[...nextauth]/route.ts`                                              |
| Storage module         | `lib/storage/index.ts` (upload, download, signed URLs)                             |
| Storage API (signed)   | `app/api/storage/[...path]/route.ts`                                               |
| Storage API (public)   | `app/api/storage/public/[...path]/route.ts`                                        |
| SSE server bus         | `lib/realtime/sse-server.ts` (EventEmitter, broadcast, presence)                   |
| SSE client hook        | `lib/realtime/sse-client.ts` (useSSE, useSSEPresence)                              |
| SSE broadcast helpers  | `lib/realtime/broadcast.ts` (broadcastInsert/Update/Delete/Typing)                 |
| SSE endpoint           | `app/api/realtime/[channel]/route.ts`                                              |
| Schema Layer 1         | `database/migrations/20260215000001_layer_1_foundation.sql`                        |
| Schema Layer 2         | `database/migrations/20260215000002_layer_2_inquiry_messaging.sql`                 |
| Schema Layer 3         | `database/migrations/20260215000003_layer_3_events_quotes_financials.sql`          |
| Schema Layer 4         | `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql`             |
| Generated types        | `types/database.ts` (never edit manually)                                          |
| Scripts PostgreSQL lib | `scripts/lib/database.mjs` (shared factory for .mjs scripts)                       |
| Tier resolution        | `lib/billing/tier.ts`                                                              |
| Pro feature registry   | `lib/billing/pro-features.ts`                                                      |
| Module definitions     | `lib/billing/modules.ts`                                                           |
| Pro enforcement        | `lib/billing/require-pro.ts`                                                       |
| Upgrade gate UI        | `components/billing/upgrade-gate.tsx`                                              |
| Module toggle page     | `app/(chef)/settings/modules/page.tsx`                                             |
| Embed widget script    | `public/embed/chefflow-widget.js`                                                  |
| Embed API route        | `app/api/embed/inquiry/route.ts`                                                   |
| Embed form page        | `app/embed/inquiry/[chefId]/page.tsx`                                              |
| Embed form component   | `components/embed/embed-inquiry-form.tsx`                                          |
| Embed settings page    | `app/(chef)/settings/embed/page.tsx`                                               |
| AI providers config    | `lib/ai/providers.ts`                                                              |
| AI dispatch layer      | `lib/ai/dispatch/` (classifier, privacy gate, routing table, router, cost tracker) |
| AI model governance    | `docs/ai-model-governance.md` **(canonical routing policy)**                       |
| AI routing audit       | `scripts/audit-model-routing.ts` (detects direct provider imports)                 |
| App audit (living)     | `docs/app-complete-audit.md` **(update when UI changes)**                          |
| Product blueprint      | `docs/product-blueprint.md` **(V1 scope, progress bar, exit criteria, queue)**     |
| Project map            | `project-map/` **(browsable product mirror, read on startup)**                     |
| Session digests        | `docs/session-digests/` **(conversation summaries, read last 3 on startup)**       |
| Remy reference         | `docs/remy-complete-reference.md` **(read this instead of re-scanning Remy)**      |
| Persistent memory      | `MEMORY.md` **(canonical durable product and developer context)**                  |
| Project memory folder  | `memory/` (project-scoped memory docs, runtime notes, and agent artifacts)         |
| Research reports       | `docs/research/` (research agent output, not specs, not code)                      |
| Agent prompts          | `docs/specs/README.md` (canonical launcher prompts for planner, builder, research) |
| Prompt library         | `prompts/` (reusable prompt assets and queue items, not the launcher source)       |
| Session log            | `docs/session-log.md` (running log of what each agent did, read on startup)        |
| Build state            | `docs/build-state.md` (last known green build, read before building)               |
| Spec template          | `docs/specs/_TEMPLATE.md` (Timeline + Developer Notes + all sections)              |
| Definition of done     | `docs/definition-of-done.md` (verified, honest, resilient against drift)           |
| Interface philosophy   | `docs/specs/universal-interface-philosophy.md` **(mandatory for UI builders)**     |
| Interface gap analysis | `docs/interface-philosophy-gap-analysis.md` (violations + fix priority)            |
| MC Manual panel        | `scripts/launcher/index.html` (panel-manual, live codebase scanner)                |
| MC Codebase scanner    | `scripts/launcher/server.mjs` (`scanCodebase()`, `GET /api/manual/scan`)           |
| MC File watcher        | `scripts/launcher/server.mjs` (`initFileWatcher()`, `GET /api/activity/summary`)   |
| Experiential tests     | `tests/experiential/` (blank screen detection, cross-boundary UX verification)     |
| Experiential config    | `playwright.experiential.config.ts`                                                |
| Experiential docs      | `docs/experiential-verification.md`                                                |
| System behavior map    | `docs/system-behavior-map.md` (full runtime behavior audit, March 2026)            |
| OpenClaw sync (all)    | `scripts/openclaw-pull/sync-all.mjs` (full pipeline: pull + normalize + prices)    |
| OpenClaw pull          | `scripts/openclaw-pull/pull.mjs` (Pi SQLite -> openclaw.\* tables)                 |
| OpenClaw normalize     | `scripts/openclaw-pull/sync-normalization.mjs` (norm map + ingredient aliases)     |
| OpenClaw price sync    | `scripts/run-openclaw-sync.mjs` (Pi API -> ingredient_price_history)               |
| Pipeline audit         | `scripts/pipeline-audit.mjs` (current state vs targets)                            |
| Price resolution       | `lib/pricing/resolve-price.ts` (10-tier fallback chain)                            |

---

## WORKSPACE MAP

Use this when orienting yourself in the repo. The workspace is one canonical app, but the folder is artifact-heavy.

### 1. Source of truth

Start investigations here first unless the task is explicitly about runtime artifacts:

- `app/`, `components/`, `lib/`, `hooks/`, `features/`, `types/`
- `database/`, `scripts/`, `tests/`, `public/`, `config/`
- `docs/`, `CLAUDE.md`, `MEMORY.md`

### 2. Generated build artifacts

These are outputs, not the canonical implementation:

- `.next/`
- `.next-*`
- `node_modules/`
- `*.tsbuildinfo`

### 3. Agent and runtime state

These hold agent state, auth, local runtime notes, and control-plane data:

- `.claude/`
- `.auth/`
- `memory/`
- `prompts/queue/`
- `mission-control.log` and similar runtime logs

### 4. Test and verification artifacts

These are evidence and operational leftovers, not primary navigation targets:

- `screenshots/`, `qa-screenshots/`, `.qa-screenshots/`
- `test-results/`, `results/`, `test-screenshots/`, `tmp-screenshots/`
- `*.log`
- runtime probe folders like `.next-runtime-probe-*`, `.next-web-beta-probe`, `.next-dev-pin-smoke`

### 5. Media and reference assets

These are content assets or supporting reference files:

- `davidfood/`
- screenshot and image files at the repo root
- `storage/` when the task is about uploaded/local file content

### 6. Archives, backups, and sync artifacts

These are useful for recovery or imports, but are not the live app source:

- `backups/`
- `backup-*.sql`
- `.openclaw-build/`, `.openclaw-deploy/`, `.openclaw-temp/`

### Navigation rule

Do not start code archaeology in `.next*`, logs, screenshots, temp probes, or result folders unless the task is specifically about builds, verification evidence, or runtime debugging.

---

## SINGLE ENVIRONMENT

One directory. Two servers. Zero fragmentation.

```text
C:\Users\david\Documents\CFv1\    (THE app, the only copy)
localhost:3100                     (dev server: npm run dev, hot reload for coding)
localhost:3000                     (prod server: npm run prod, compiled build, fast)
app.cheflowhq.com                 (Cloudflare Tunnel -> localhost:3000)
```

- **Dev:** `npm run dev` (port 3100, hot reload, your coding window)
- **Prod:** `npm run prod` (port 3000, optimized build, what clients see via app.cheflowhq.com)
- **Build only:** `npm run build` (compile without starting)
- **Ship workflow:** commit + push + rebuild prod (`npm run prod`)
- **Ollama:** `localhost:11434` (local AI, all private data processing)
- **Database:** Local PostgreSQL via Docker (`chefflow_postgres` on port `54322`), accessed through postgres.js over direct TCP

There are no beta/staging/prod directories. There is one copy of the app. The prod server is just the compiled version of whatever is in this folder.

---

## DATABASE

- **Local PostgreSQL** via Docker container (`chefflow_postgres` on port 54322)
- **Connection:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Start:** `docker compose up -d`
- **Init (first time):** `bash scripts/init-local-db.sh` (creates stubs, applies migrations, seeds demo accounts)
- **Full docs:** `docs/local-database-setup.md`
- Cross-layer columns added via `ALTER TABLE` (e.g., Layer 3 adds columns to `clients`)
- Supabase compatibility stubs (auth schema, roles, storage schema) allow original migrations to run on vanilla PostgreSQL
- **No cloud database dependency.** Everything runs locally.
