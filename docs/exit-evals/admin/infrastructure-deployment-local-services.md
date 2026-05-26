# Exit Eval: Admin / INFRASTRUCTURE, DEPLOYMENT & LOCAL SERVICES

> Wave 3 | 8 scenarios | Role: ADMIN
> Evaluated: 2026-05-25 | Mode: Solo (NEEDS-DEVELOPER-REVIEW)

---

## Scenario #9: Restart or inspect the canonical dev server

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why admin leaves:** The admin needs to determine if the dev server (port 3100) is healthy, hung, or consuming excessive RAM, and then restart it if broken. The decision is "is my local dev environment working?" and the action is process lifecycle control.

**Context ChefFlow has:**

- Mission Control (`/admin/services`) already shows dev server running/stopped state
- `services-panel.tsx` displays all 6 services with running/stopped badges
- API route `app/api/admin/services/route.ts` executes `scripts/services.sh` commands
- Start/stop buttons exist per service
- Output log panel shows raw script output
- RAM usage is printed by the script but not parsed into structured UI

**Data source?** Yes, local process table and port checks via `scripts/services.sh`

**Client-collaborative angle:** None. Infrastructure is admin-only.

**Physical reality:** Screen-based. Admin is at their development machine. No physical constraints.

**Compounding:** Low. Dev server state is ephemeral; no historical value in capturing it.

**Solution design:**

- Parse RAM usage from `services.sh` output into structured cards (currently raw text)
- Add uptime/last-restart timestamp per service
- Add "restart" as a single action (stop + start) instead of requiring two clicks
- Add auto-refresh polling (every 30s) so admin sees live state without manual refresh
- Surface last error/crash reason if the server died unexpectedly

**Where it appears:**

- `/admin/services` (Mission Control) - already exists
- Could appear as a banner on any admin page if dev server is down

**What remains as permanent exit:**
Debugging WHY the server crashed (reading terminal output, stack traces, Next.js compilation errors) stays in the terminal. ChefFlow can detect "down" but cannot replicate a full terminal debugging session.

**Priority:** High frequency (daily dev work) x Low effort (parsing already exists) = High
**Spec needed?** No, incremental enhancement to existing Mission Control

---

## Scenario #10: Inspect Docker containers

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why admin leaves:** The admin needs to verify Docker containers (PostgreSQL, OpenClaw, AnythingLLM) are running, check their health, inspect logs for errors, or restart them after a crash. The decision is "is my data infrastructure healthy?"

**Context ChefFlow has:**

- `services-panel.tsx` already tracks OpenClaw, AnythingLLM, and PostgreSQL Docker containers
- `scripts/services.sh` checks `docker ps` for container names (`chefflow_postgres`, `openclaw-engine`, `anythingllm`)
- Start/stop actions exist for each container
- Running/stopped state displayed with color-coded badges
- `/admin/openclaw/health` shows OpenClaw sync health, quarantine stats, last sync time

**Data source?** Yes, `docker ps` and `docker logs` via shell commands

**Client-collaborative angle:** None. Infrastructure is admin-only.

**Physical reality:** Screen-based. Admin is at their machine.

**Compounding:** Low. Container state is ephemeral. However, patterns of container failures (e.g., "OpenClaw crashes every Tuesday") would compound if tracked.

**Solution design:**

- Add container health details: uptime, restart count, last exit code
- Surface last N lines of container logs in Mission Control (especially on failure)
- Add container resource usage (memory, CPU) to the service cards
- Track failure history: "container X crashed 3 times this week" pattern detection
- Keep Docker Desktop/CLI as the deep-dive tool; Mission Control is the glance layer

**Where it appears:**

- `/admin/services` (Mission Control) - partially exists
- `/admin/openclaw/health` - exists for OpenClaw-specific health

**What remains as permanent exit:**
Complex container debugging (exec into container, inspect volumes, rebuild images, network debugging) stays in Docker Desktop/terminal. ChefFlow surfaces health and last-error, not interactive container shells.

**Priority:** Medium frequency (weekly) x Medium effort (docker log parsing) = Medium
**Spec needed?** No, incremental enhancement to existing Mission Control

---

## Scenario #11: Check hosting deployment status

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** The admin needs to verify that a deployment succeeded, check build logs for errors, see which commit is live, or investigate a failed deploy. The deployment pipeline (git push, build, deploy) lives entirely outside ChefFlow.

**Context ChefFlow has:**

- System Health page (`/admin/system`) has an "External Dashboards" section with Stripe link
- No deployment/hosting links currently exist in admin
- `lib/environment/production-safety.ts` evaluates env var health (required vars, Stripe mode)
- No build metadata (commit SHA, deploy time, build duration) stored in-app

**Data source?** Yes, hosting provider API (Vercel/Cloudflare) could be queried, but ChefFlow is self-hosted with no cloud provider per memory rules.

**Client-collaborative angle:** None. Infrastructure is admin-only.

**Physical reality:** Screen-based.

**Compounding:** Low. Each deploy is a one-off event. Historical deploy log has marginal value.

**Solution design:**

- Store current build metadata (git SHA, build time, Node version) in a build-info endpoint
- Display "Current Build" card in System Health showing commit, timestamp, uptime
- Add a "last deploy" indicator so admin knows what code is running
- Link to GitHub commit for the running build

**Where it appears:**

- `/admin/system` (System Health) - new card

**What remains as permanent exit:**
Investigating build failures, reading CI logs, triggering redeploys, and managing hosting configuration all stay external. ChefFlow shows what IS deployed, not how to deploy.

**Priority:** Low frequency (weekly deploys) x Low effort (build-info endpoint) = Low-Medium
**Spec needed?** No, simple build-info feature

---

## Scenario #12: Inspect server logs during a 500

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why admin leaves:** A 500 error occurred. The admin needs the full stack trace, request context, and surrounding log lines to diagnose and fix the bug. Terminal/hosting logs are the only place with complete error information.

**Context ChefFlow has:**

- `/admin/silent-failures` (Hidden Issues) captures non-blocking operation failures with severity, source, and details via `lib/monitoring/non-blocking.ts` writing to `side_effect_failures` table
- `lib/observability/request-id.ts` provides correlation IDs via `AsyncLocalStorage` and `x-request-id` header
- Request IDs are available in deep library code via `getRequestId()`
- System Health shows integrity signals (zombie events, orphaned clients)
- No structured error capture for 500s specifically

**Data source?** Yes, server stdout/stderr and potentially a log drain

**Client-collaborative angle:** None. Infrastructure is admin-only.

**Physical reality:** Screen-based. Time-sensitive during an active outage.

**Compounding:** Medium. Recurring 500s on the same route/action would build a pattern. Error frequency by route is diagnostic gold.

**Solution design:**

- Capture unhandled 500s into a structured table (route, timestamp, error message, request ID, user context)
- Display recent 500s in Hidden Issues with correlation ID for terminal cross-reference
- Add "error rate by route" view so admin sees which pages are failing
- Include request ID in user-facing error messages so admin can correlate user reports to logs
- Keep full stack traces in terminal; surface error summary + correlation ID in admin

**Where it appears:**

- `/admin/silent-failures` (Hidden Issues) - extend existing
- Error pages shown to users - include request ID

**What remains as permanent exit:**
Full stack traces, debugging with breakpoints, reading surrounding log context, and fixing the code all stay in terminal/IDE. ChefFlow surfaces WHAT failed and WHERE, not HOW to fix it.

**Priority:** High frequency (500s happen during active dev) x Medium effort (error capture middleware) = High
**Spec needed?** No, but would benefit from a structured error capture enhancement

---

## Scenario #13: Check environment variables

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** The admin suspects an env var is missing, misconfigured, or using wrong mode (test vs live Stripe keys). They need to verify configuration without exposing secrets in the admin UI.

**Context ChefFlow has:**

- `lib/environment/production-safety.ts` already evaluates env health: missing required vars, missing optional vars, localhost URLs in production, Stripe key mode mismatches, demo mode
- `/admin/system/payments` shows Stripe key mode diagnostics and mismatch warnings
- System Health shows owner identity warnings
- Secrets are intentionally NOT shown in admin UI (correct security boundary)

**Data source?** Yes, `process.env` at runtime

**Client-collaborative angle:** None. Infrastructure is admin-only.

**Physical reality:** Screen-based.

**Compounding:** Low. Env vars rarely change once configured correctly.

**Solution design:**

- Add a "Configuration Health" card to System Health showing: all required vars present (yes/no), all optional vars present (yes/no), Stripe mode (test/live), site URL mode, demo mode status
- Show REDACTED values (first 4 chars or just presence/absence)
- Never show full secret values in the UI
- Flag when configuration changed since last deploy (if build-info tracks this)

**Where it appears:**

- `/admin/system` (System Health) - partial exists via production-safety
- `/admin/system/payments` - Stripe key mode already shown

**What remains as permanent exit:**
Editing env vars, adding new secrets, rotating keys, and accessing the secret manager all stay external. ChefFlow shows "is config healthy?" not "edit your secrets."

**Priority:** Low frequency (rare after initial setup) x Low effort (already partially built) = Low
**Spec needed?** No

---

## Scenario #14: Restart Ollama or local AI

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why admin leaves:** Ollama (local AI on port 11434) is unresponsive, hung, or returning errors. The admin needs to restart the daemon so AI features (Remy, brain dump parsing, follow-up drafts) work again.

**Context ChefFlow has:**

- Mission Control (`/admin/services`) shows Ollama running/stopped state
- Start/stop buttons exist for Ollama
- `scripts/services.sh` checks port 11434 for Ollama presence
- API route supports start/stop actions for ollama service
- No Ollama-specific health check (model loaded, inference working, response time)

**Data source?** Yes, Ollama HTTP API at `localhost:11434` (has `/api/tags`, `/api/generate` endpoints)

**Client-collaborative angle:** None. Infrastructure is admin-only.

**Physical reality:** Screen-based.

**Compounding:** Medium. Tracking Ollama uptime/crash patterns helps decide if the model needs more RAM or a different approach.

**Solution design:**

- Add Ollama health probe: ping `/api/tags` to verify it responds, check which models are loaded
- Show "last successful inference" timestamp and average response time
- Add restart button (stop + start) as single action
- Surface Ollama errors in Hidden Issues when AI features fail due to Ollama being down
- Show model name and size currently loaded

**Where it appears:**

- `/admin/services` (Mission Control) - exists, needs health probe
- Hidden Issues - when AI operations fail due to Ollama

**What remains as permanent exit:**
Pulling new models, updating Ollama version, debugging model-specific issues, and GPU/memory configuration stay in terminal. ChefFlow handles "is it working?" and "restart it."

**Priority:** Medium frequency (Ollama crashes occasionally) x Low effort (HTTP health check) = Medium
**Spec needed?** No, incremental enhancement

---

## Scenario #15: Restart OpenClaw worker/container

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why admin leaves:** The OpenClaw data engine container has stopped, failed a sync, or is stuck. The admin needs to restart it and verify sync resumes.

**Context ChefFlow has:**

- Mission Control shows OpenClaw container running/stopped with start/stop buttons
- `/admin/openclaw/health` shows detailed sync health: last sync time, total syncs, acceptance rate, quarantine rate, recent errors
- `getSyncAuditLog()` returns sync history with records processed/accepted/quarantined/skipped and error messages
- `getSyncHealthSummary()` computes health metrics over last 30 days
- Quarantine review workflow exists for admin to approve/reject/correct prices
- Sync audit log with started_at, completed_at, error_message fields

**Data source?** Yes, Docker API + internal sync tables

**Client-collaborative angle:** None. Infrastructure is admin-only.

**Physical reality:** Screen-based.

**Compounding:** Medium. OpenClaw failure patterns (always fails on Tuesdays, always fails on source X) compound into operational knowledge.

**Solution design:**

- Combine Mission Control "restart" with OpenClaw Health "last sync" into a single recovery flow
- Show "time since last successful sync" prominently (already partially exists via `lastSyncAt`)
- Add "last failure reason" card linking sync audit error to restart action
- Add one-click "restart and verify" that restarts container then polls for next successful sync
- Track restart history to identify recurring failure patterns

**Where it appears:**

- `/admin/services` (Mission Control) - exists
- `/admin/openclaw/health` - exists with rich detail

**What remains as permanent exit:**
Debugging WHY the container fails (inspecting Docker logs, checking source API rate limits, fixing scraper configs, managing credentials) stays in terminal/Docker. ChefFlow handles "restart it" and "did it recover?"

**Priority:** Medium frequency (weekly sync issues) x Low effort (combine existing surfaces) = Medium
**Spec needed?** No, combine existing capabilities

---

## Scenario #16: Verify database connectivity outage

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why admin leaves:** The app is returning errors. The admin suspects the database is down or unreachable and needs to verify connectivity, check PostgreSQL health, and potentially restart the container.

**Context ChefFlow has:**

- Mission Control shows PostgreSQL Docker container running/stopped with start/stop buttons
- System Health (`/admin/system`) shows database row counts (proves connectivity works)
- `getSystemHealthStats()` queries multiple tables and would fail if DB is unreachable
- Hidden Issues captures side-effect failures that may correlate with DB outages
- PostgreSQL is marked "essential" (required) in services panel
- `scripts/services.sh` checks `docker ps` for `chefflow_postgres`

**Data source?** Yes, PostgreSQL connection itself + Docker container state

**Client-collaborative angle:** None. Infrastructure is admin-only.

**Physical reality:** Screen-based. Time-sensitive during an outage.

**Compounding:** Low. DB outages are rare events. However, tracking response latency over time helps predict degradation.

**Solution design:**

- Add a lightweight DB health probe: simple `SELECT 1` with response time measurement
- Show connection pool status (active/idle/waiting connections)
- Display average query latency (last 5 min) as a health signal
- Add "DB unreachable" banner on admin pages when health probe fails
- Combine with restart action from Mission Control for one-click recovery
- Track DB uptime percentage over time

**Where it appears:**

- `/admin/system` (System Health) - extend existing row count section
- `/admin/services` (Mission Control) - PostgreSQL card already exists
- Admin shell banner - when DB probe fails

**What remains as permanent exit:**
Root-cause investigation (checking PostgreSQL logs, disk space, WAL issues, connection limits, Docker volume health) stays in terminal/Supabase dashboard. ChefFlow answers "is it up?" and "how fast?" not "why did it die?"

**Priority:** High severity (DB down = app down) x Low effort (simple probe) = High
**Spec needed?** No, simple health probe addition

---

## Batch Summary

| #   | Title                                       | Reclassified To     | Spec Needed? |
| --- | ------------------------------------------- | ------------------- | ------------ |
| 9   | Restart or inspect the canonical dev server | Partially Reducible | No           |
| 10  | Inspect Docker containers                   | Partially Reducible | No           |
| 11  | Check hosting deployment status             | Permanent           | No           |
| 12  | Inspect server logs during a 500            | Partially Reducible | No           |
| 13  | Check environment variables                 | Permanent           | No           |
| 14  | Restart Ollama or local AI                  | Partially Reducible | No           |
| 15  | Restart OpenClaw worker/container           | Partially Reducible | No           |
| 16  | Verify database connectivity outage         | Partially Reducible | No           |

---

## Codebase Evidence Summary

| File                                            | Relevance                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `app/(admin)/admin/services/services-panel.tsx` | Mission Control UI with service grid, start/stop, output log            |
| `app/(admin)/admin/services/page.tsx`           | Mission Control page shell                                              |
| `app/api/admin/services/route.ts`               | API route executing `scripts/services.sh` with admin gate               |
| `scripts/services.sh`                           | Service manager: status, up, down, start, stop, clean for all services  |
| `app/(admin)/admin/system/page.tsx`             | System Health: DB row counts, integrity signals, QoL metrics            |
| `app/(admin)/admin/openclaw/health/page.tsx`    | OpenClaw health: quarantine, sync audit, coverage metrics               |
| `lib/admin/openclaw-health-actions.ts`          | Server actions for sync health, quarantine review                       |
| `lib/admin/platform-stats.ts`                   | `getSystemHealthStats()` with table row counts, zombie/orphan detection |
| `app/(admin)/admin/silent-failures/page.tsx`    | Hidden Issues: non-blocking failure capture                             |
| `lib/observability/request-id.ts`               | Correlation ID via AsyncLocalStorage                                    |
| `lib/environment/production-safety.ts`          | Env var health evaluation (required/optional/mode checks)               |
| `lib/monitoring/non-blocking.ts`                | Side-effect failure tracking to `side_effect_failures` table            |

---

## Key Findings

1. **Mission Control already exists and works.** The admin can see service state and start/stop all 6 services from `/admin/services`. The gap is not basic control; it is health depth (RAM parsing, uptime, last-error, health probes).

2. **OpenClaw health is the most complete.** Sync audit log, quarantine review, coverage metrics, acceptance rates, and time-since-last-sync are all built. The gap is connecting "container restart" to "sync recovered" in one flow.

3. **Correlation IDs exist but are not surfaced.** `lib/observability/request-id.ts` provides per-request IDs via AsyncLocalStorage, but these are not shown to admins during 500s or linked to Hidden Issues entries.

4. **Env var health is partially built.** `production-safety.ts` evaluates 10+ configuration health checks, but only Stripe mode is surfaced in the admin UI. A "Configuration Health" card would expose the rest.

5. **All 8 scenarios are correctly classified as Permanent in the source.** After analysis, 6 are reclassified to Partially Reducible because ChefFlow already has 60-80% of what is needed; the remaining 20% (deep debugging, log reading, config editing) genuinely stays external.

6. **No specs needed.** All improvements are incremental enhancements to existing surfaces (Mission Control, System Health, Hidden Issues). No new architectural patterns required.

---

_NEEDS-DEVELOPER-REVIEW: All 8 scenarios evaluated in solo mode without chef operational input._
