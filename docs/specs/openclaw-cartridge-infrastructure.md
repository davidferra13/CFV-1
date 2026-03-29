# Spec: OpenClaw Cartridge Infrastructure

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-29
> **Built by:** Claude Code session 2026-03-29

---

## What This Does (Plain English)

Creates the reusable infrastructure that all future OpenClaw cartridges are built on. Today, `price-intel` is a one-off hand-built system. This spec extracts the reusable patterns into a **cartridge template** (shared scraper library, standardized SQLite schema, sync API boilerplate), upgrades the vault to support new cartridges, and generalizes ChefFlow's sync pipeline so it can receive data from ANY cartridge (not just prices). After this is built, spinning up a new OpenClaw cartridge (market-intel, lead-engine, trend-watch) becomes a matter of writing scrapers and plugging them into the template, not rebuilding infrastructure from scratch.

---

## Why It Matters

The [OpenClaw Database Catalog](../research/openclaw-database-catalog.md) identifies 30 databases across 4 cartridges. None of the 3 new cartridges can be built until the shared infrastructure exists. Without this spec, each cartridge would be hand-built from scratch like price-intel was, duplicating code, inventing new sync protocols, and creating maintenance nightmares. This is the foundation.

---

## Deliverables Overview

This spec produces **two categories** of work:

### A. Vault-Side (F:\OpenClaw-Vault\ and Pi)

1. **Shared library** (`_shared/`) extracted from price-intel's proven code
2. **Cartridge template** (`_template/`) for bootstrapping new cartridges
3. **Profile scaffolds** for `market-intel`, `lead-engine`, `trend-watch`
4. **Updated swap.sh** to handle the new cartridge type (data-producer with shared lib)

### B. ChefFlow-Side (lib/openclaw/)

1. **Generalized sync receiver** that can accept data from any cartridge
2. **Cartridge registry** so ChefFlow knows what cartridges exist and how to sync each one
3. **Cron endpoint update** to route incoming syncs by cartridge type

---

## Files to Create

### Vault-Side (F:\OpenClaw-Vault\)

| File                                      | Purpose                                                                                                                                                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_shared/lib/db.mjs`                      | Generalized SQLite helper (init, WAL mode, migration runner, getStats). Extracted from price-intel's `db.mjs`.                                                                                           |
| `_shared/lib/scrape-utils.mjs`            | HTTP fetch with user-agent rotation, rate limiting, Puppeteer helpers. Copied from price-intel's `scrape-utils.mjs` (already generic).                                                                   |
| `_shared/lib/sync-api-base.mjs`           | Base HTTP server factory. Takes a config object (port, routes) and returns a running server with `/health`, `/api/stats`, `/api/sync/database` built-in. Cartridge-specific routes are added via config. |
| `_shared/lib/cron-utils.mjs`              | Cron helper: logging, error handling, run-lock (prevent overlapping runs), heartbeat file.                                                                                                               |
| `_shared/lib/reporter.mjs`                | Structured logging: writes JSON log lines with `{ timestamp, cartridge, service, level, message, data }`.                                                                                                |
| `_shared/package.json`                    | Dependencies: `better-sqlite3`, `puppeteer-core`. Shared across all cartridges via symlink.                                                                                                              |
| `_template/profile.json`                  | Template profile.json with placeholders for cartridge-specific fields.                                                                                                                                   |
| `_template/services/sync-api.mjs`         | Template sync API that imports `sync-api-base.mjs` and adds cartridge-specific routes.                                                                                                                   |
| `_template/services/sync-to-chefflow.mjs` | Template nightly sync script. Calls ChefFlow's `/api/cron/openclaw-sync` with cartridge identifier.                                                                                                      |
| `_template/lib/db.mjs`                    | Template database layer that imports shared `db.mjs` and adds cartridge-specific schema.                                                                                                                 |
| `_template/README.md`                     | How to use the template to create a new cartridge.                                                                                                                                                       |
| `profiles/market-intel/profile.json`      | Profile definition for market-intel cartridge.                                                                                                                                                           |
| `profiles/lead-engine/profile.json`       | Profile definition for lead-engine cartridge.                                                                                                                                                            |
| `profiles/trend-watch/profile.json`       | Profile definition for trend-watch cartridge.                                                                                                                                                            |

### ChefFlow-Side (c:\Users\david\Documents\CFv1\)

| File                                  | Purpose                                                                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/openclaw/cartridge-registry.ts`  | Registry of known cartridges: name, sync endpoint path, data handler function, expected schema.                                                       |
| `lib/openclaw/sync-receiver.ts`       | Generalized sync receiver. Accepts data from any registered cartridge, validates schema, routes to the correct handler.                               |
| `app/api/cron/openclaw-sync/route.ts` | New unified cron endpoint. Replaces the price-only endpoint. Reads `cartridge` param from request, delegates to the correct handler via the registry. |

---

## Files to Modify

### Vault-Side

| File            | What to Change                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json` | Add entries for `market-intel`, `lead-engine`, `trend-watch` with status `planned`.                                                                |
| `swap.sh`       | Add `new` command: `./swap.sh new <profile-name>` scaffolds a new cartridge from `_template/`. Add `_shared/` symlink creation during `load` step. |

### ChefFlow-Side

| File                                         | What to Change                                                                                                                                                                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/openclaw/sync.ts`                       | Refactor: extract the price-specific sync logic into a handler function that the new `sync-receiver.ts` calls. Keep all existing behavior intact. The existing `syncEnrichedPrices()` function signature and return type do not change. |
| `app/api/cron/price-sync/route.ts`           | Add deprecation comment pointing to the new unified endpoint. Keep working for backwards compatibility (price-intel's existing `sync-to-chefflow.mjs` calls this). Internally delegates to the new receiver.                            |
| `docs/ground-truth-databases.md`             | Update architecture section to reference the cartridge infrastructure.                                                                                                                                                                  |
| `docs/research/openclaw-database-catalog.md` | Update status of infrastructure from "nothing built" to "infrastructure ready".                                                                                                                                                         |

---

## Database Changes

None. This spec is infrastructure only. Individual cartridges will define their own ChefFlow-side tables when they are built (separate specs).

---

## Data Model

### Cartridge Registry (TypeScript, not DB)

```typescript
interface CartridgeDefinition {
  /** Unique identifier matching the vault profile codename */
  codename: string
  /** Human-readable name */
  name: string
  /** Port the Pi sync API runs on for this cartridge */
  port: number
  /** API path on the Pi to pull data from */
  pullEndpoint: string
  /** Function that processes the pulled data into ChefFlow */
  syncHandler: (data: unknown) => Promise<CartridgeSyncResult>
  /** Whether this cartridge syncs to DB tables or TypeScript constants */
  targetType: 'database' | 'constants'
}

interface CartridgeSyncResult {
  success: boolean
  cartridge: string
  matched: number
  updated: number
  skipped: number
  errors: number
  errorDetails?: string[]
}
```

### Shared SQLite Schema (Pi-side, in `_shared/lib/db.mjs`)

Every cartridge's SQLite database gets these tables automatically:

```sql
-- Every cartridge tracks its data sources
CREATE TABLE IF NOT EXISTS source_registry (
  source_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'website', 'api', 'rss', 'government', 'scrape'
  url TEXT,
  scrape_method TEXT NOT NULL DEFAULT 'http',  -- 'http', 'puppeteer', 'api', 'rss'
  status TEXT NOT NULL DEFAULT 'active',
  last_scraped_at TEXT,
  scrape_failures_consecutive INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Every cartridge logs sync events
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target TEXT NOT NULL,         -- 'chefflow' or 'local'
  status TEXT NOT NULL,         -- 'success', 'partial', 'failed'
  records_sent INTEGER DEFAULT 0,
  records_accepted INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
```

Cartridge-specific tables are added by each cartridge's own `lib/db.mjs` which imports and extends the shared schema.

### Sync API Base (Pi-side)

Every cartridge gets these endpoints for free from `sync-api-base.mjs`:

| Endpoint             | Method | Description                                        |
| -------------------- | ------ | -------------------------------------------------- |
| `/health`            | GET    | `{ status: 'ok', cartridge: '<name>', timestamp }` |
| `/api/stats`         | GET    | Source count, record count, last scrape, last sync |
| `/api/sync/database` | GET    | Download the SQLite .db file                       |
| `/api/sources`       | GET    | List all tracked sources with status               |
| `/api/sync/log`      | GET    | Recent sync history                                |

Cartridge-specific endpoints are added via config when instantiating the server.

---

## Server Actions

### New

| Action                                       | Auth             | Input              | Output                  | Side Effects                              |
| -------------------------------------------- | ---------------- | ------------------ | ----------------------- | ----------------------------------------- |
| `syncCartridge(cartridge: string)`           | `requireAdmin()` | Cartridge codename | `CartridgeSyncResult`   | Routes to registered handler, logs result |
| `getCartridgeRegistry()`                     | `requireAdmin()` | none               | `CartridgeDefinition[]` | Read-only                                 |
| `getCartridgeSyncHistory(cartridge: string)` | `requireAdmin()` | Cartridge codename | `SyncLogEntry[]`        | Read-only                                 |

### Modified

| Action                              | What Changes                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `syncEnrichedPrices()` in `sync.ts` | Extracted into a handler function. Existing callers (admin page Sync tab) still work unchanged. |

---

## UI / Component Spec

No new UI in this spec. The admin price catalog page continues to work as-is. A future spec will add a unified "OpenClaw Dashboard" that shows all cartridges. This spec is infrastructure only.

---

## Edge Cases and Error Handling

| Scenario                                        | Correct Behavior                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Pi is offline when sync runs                    | Return `{ success: false, error: 'Pi unreachable' }`. Existing price sync behavior preserved.                      |
| Unknown cartridge name in sync request          | Return 400 with `{ error: 'Unknown cartridge: X' }`. Do not crash.                                                 |
| Cartridge sync API returns malformed data       | Log the raw response, return `{ success: false, error: 'Invalid response from cartridge' }`. Never write bad data. |
| Old price-sync cron endpoint called             | Still works. Internally delegates to the new receiver with `cartridge: 'price-intel'`.                             |
| Two cartridges try to sync simultaneously       | Each sync is independent (different tables). No conflict.                                                          |
| Shared library update needed                    | Update `_shared/`, all cartridges pick it up via symlink on next load.                                             |
| `swap.sh new` called with existing profile name | Error: "Profile already exists".                                                                                   |

---

## Implementation Order

1. **Vault: `_shared/` library** - Extract from price-intel, make generic
2. **Vault: `_template/`** - Build the cartridge template using shared lib
3. **Vault: Profile scaffolds** - Create profile.json for 3 new cartridges
4. **Vault: Update `swap.sh`** - Add `new` command and `_shared/` symlink logic
5. **Vault: Update `manifest.json`** - Register new profiles as `planned`
6. **ChefFlow: `cartridge-registry.ts`** - Define the registry with price-intel as the first entry
7. **ChefFlow: `sync-receiver.ts`** - Generalized receiver
8. **ChefFlow: New cron endpoint** - Unified `/api/cron/openclaw-sync`
9. **ChefFlow: Refactor `sync.ts`** - Extract price handler, wire into registry
10. **ChefFlow: Backwards compat** - Old `/api/cron/price-sync` delegates to new receiver
11. **Docs update** - ground-truth-databases.md and catalog status

---

## Verification Steps

1. **`swap.sh new test-cartridge`** creates a valid scaffold in `profiles/test-cartridge/` with profile.json, services/, lib/
2. **`swap.sh list`** shows the 3 new profiles (market-intel, lead-engine, trend-watch) with status `planned`
3. **Existing price sync still works:** Run the admin Sync tab dry-run. Same results as before.
4. **Old cron endpoint still works:** `curl -X POST http://localhost:3100/api/cron/price-sync -H "Authorization: Bearer $CRON_SECRET"` returns the same sync result format.
5. **New cron endpoint works:** `curl -X POST http://localhost:3100/api/cron/openclaw-sync?cartridge=price-intel -H "Authorization: Bearer $CRON_SECRET"` returns the same result.
6. **Unknown cartridge rejected:** `curl -X POST http://localhost:3100/api/cron/openclaw-sync?cartridge=nonexistent -H "Authorization: Bearer $CRON_SECRET"` returns 400.
7. **Type check passes:** `npx tsc --noEmit --skipLibCheck` exits 0.
8. **Build passes:** `npx next build --no-lint` exits 0.

---

## Out of Scope

- **Building any of the 30 databases.** This spec is infrastructure only. Each cartridge's scrapers are separate specs.
- **New admin UI for cartridge management.** Future spec.
- **Changing price-intel's existing scrapers.** Price-intel keeps working exactly as it does today.
- **Rotation scheduling automation.** The catalog document describes a rotation strategy, but automating swap scheduling is a separate concern.
- **Database migrations for cartridge data.** Each cartridge spec will define its own tables.

---

## Notes for Builder Agent

### Critical: Do Not Break Price-Intel

Price-intel is live, running 20 cron jobs, syncing nightly. Every change to `lib/openclaw/sync.ts` and the cron endpoint must be **backwards compatible**. The old endpoint keeps working. The old `syncEnrichedPrices()` function keeps its exact signature and return type. Test by running the admin Sync tab dry-run before and after.

### Vault-Side Work Runs on the PC, Not the Pi

All vault files live at `F:\OpenClaw-Vault\`. The builder creates files there. Nothing gets deployed to the Pi in this spec. The `_shared/` library and `_template/` are vault constructs that get pushed to the Pi during `swap.sh load`.

### Shared Library Symlink Strategy

When `swap.sh load <cartridge>` runs, it should:

1. Push `_shared/` to `~/openclaw-shared/` on the Pi
2. Create a symlink inside the cartridge's project dir: `ln -s ~/openclaw-shared shared`
3. Cartridge code imports via `import { getDb } from '../shared/lib/db.mjs'`

This way `_shared/` is always up-to-date and doesn't bloat each cartridge's snapshot.

### Port Assignment Convention

| Cartridge      | Port            |
| -------------- | --------------- |
| `price-intel`  | 8081 (existing) |
| `market-intel` | 8082            |
| `lead-engine`  | 8083            |
| `trend-watch`  | 8084            |

Only one cartridge runs at a time, so ports don't conflict. But consistent assignment prevents confusion.

### File References

| What                                     | Where                                        |
| ---------------------------------------- | -------------------------------------------- |
| Price-intel sync API (reference)         | `.openclaw-build/services/sync-api.mjs`      |
| Price-intel DB layer (reference)         | `.openclaw-build/lib/db.mjs`                 |
| Price-intel scrape utils (copy directly) | `.openclaw-build/lib/scrape-utils.mjs`       |
| ChefFlow price sync                      | `lib/openclaw/sync.ts`                       |
| ChefFlow cron endpoint                   | `app/api/cron/price-sync/route.ts`           |
| Vault manifest                           | `F:\OpenClaw-Vault\manifest.json`            |
| Vault swap script                        | `F:\OpenClaw-Vault\swap.sh`                  |
| Database catalog                         | `docs/research/openclaw-database-catalog.md` |

### Spec Validation Answers (Planner Gate)

1. **What exists today?** Price-intel is a hand-built one-off. `sync.ts` (494 lines) is hardcoded for prices. `sync-api.mjs` (61KB) is price-specific. `swap.sh` (371 lines) handles profile management but has no scaffolding or shared-lib features. Vault has 5 profiles, 3 new ones needed.

2. **What exactly changes?** Vault gets `_shared/` and `_template/` directories (new). `swap.sh` gets `new` command and symlink logic (modify). `manifest.json` gets 3 new profile entries (modify). ChefFlow gets `cartridge-registry.ts` and `sync-receiver.ts` (new). `sync.ts` refactors internals but keeps external API (modify). Old cron endpoint delegates to new receiver (modify).

3. **Assumptions:** All verified via file reads. Price-intel's `scrape-utils.mjs` is already generic (verified: line 1-141, no price-specific code). Price-intel's `db.mjs` has price-specific schema mixed with generic init (verified: lines 33-80). `sync.ts` hardcodes `OpenClawPrice` type (verified: lines 28-47).

4. **Where will it break?** (1) Refactoring `sync.ts` without breaking the admin Sync tab. (2) `swap.sh` symlink creation on Pi (path resolution, permissions). (3) Shared lib imports across cartridges (ESM module resolution with symlinks).

5. **What is underspecified?** Nothing. Every file, every function, every endpoint is defined. Port assignments are explicit. Implementation order is explicit.

6. **Dependencies?** None. This is the foundation.

7. **Conflicts?** `sync.ts` is imported by the admin price catalog page. The refactor must not change its exports.

8. **End-to-end flow?** Pi cartridge scrapes -> data lands in SQLite -> nightly cron calls ChefFlow `/api/cron/openclaw-sync?cartridge=X` -> route handler reads `cartridge` param -> looks up handler in registry -> handler pulls from Pi API -> writes to ChefFlow DB -> returns result.

9. **Implementation order?** Defined above in 11 steps.

10. **Success criteria?** All 8 verification steps pass.

11. **Non-negotiable constraints?** Backwards compat with price-intel. One-way pipeline (Pi -> ChefFlow only). Free-only model config. No client data on Pi.

12. **What should NOT be touched?** Price-intel's scrapers. The admin price catalog UI. Any of the `lib/openclaw/*-actions.ts` files. The ingredient tables. The `resolvePrice()` chain.

13. **Simplest complete version?** Yes. This is the minimum to unblock the 3 new cartridges.

14. **If implemented exactly as written, what would still be wrong?** The shared lib symlink strategy assumes the Pi has `~/openclaw-shared/` as a persistent directory. If a cartridge swap clears it, all cartridges break. The `swap.sh` load command must explicitly preserve `~/openclaw-shared/` during step 3 (clear project dirs). This is called out in the implementation notes.

### Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

Production-ready. Every file has been read. Every assumption is verified. The riskiest change (sync.ts refactor) has explicit backwards-compat requirements and verification steps. The vault-side work is isolated from production (PC-only files until deployment).
