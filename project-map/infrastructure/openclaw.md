# OpenClaw (Data Pipeline)

**What:** Separate system on Raspberry Pi that does ALL data collection. Price scraping, directory crawling, catalog building. ChefFlow reads from it. They are completely separate codebases.

**Pi location:** 10.0.0.177, services on Pi:8090 (surveillance dashboard)
**PC control:** OpenClaw Operator at localhost:4000
**Key sync files:** `scripts/openclaw-pull/sync-all.mjs`, `scripts/run-openclaw-sync.mjs`
**Status:** RUNNING (developer has anxiety about utilization)

## What OpenClaw Feeds ChefFlow

- Ingredient prices (62K+ scraped prices, 54K ingredients)
- Store availability (39 local stores)
- Directory images
- Product photos

## What ChefFlow Does With It

- Price catalog (15K+ items surfaced to chefs)
- 10-tier price resolution chain (`lib/pricing/resolve-price.ts`)
- Auto-costing engine for menus
- Cost forecasting
- Trend arrows on price badges (7-day direction + percentage)

## ChefFlow Admin Visibility (NEW 2026-04-05)

- **Data Engine Health page:** `/admin/openclaw/health` (quarantine queue, sync history, pricing coverage KPIs)
- **Analytics card:** `/admin/analytics` shows data engine health summary (last sync, acceptance rate, quarantine count, price coverage)
- **Server actions:** `lib/admin/openclaw-health-actions.ts` (6 actions: quarantine CRUD, sync audit, coverage)
- **Quarantine review:** Approve/reject individual prices or bulk-reject. Previously invisible.
- **Sync audit log:** Every sync run visible with acceptance rate, quarantine count, errors.

## Relationship Rules

- OpenClaw does ALL scraping. ChefFlow does ZERO scraping.
- OpenClaw is internal only. "OpenClaw" never appears in user-facing UI.
- Pi runs 24/7. Currently using 1-3% CPU, 10-20% memory. Massively underutilized.
- Developer monitors via surveillance dashboard (Pi:8090) on a dedicated TV monitor.
- PC-side Operator (localhost:4000) has 5 tabs: Dashboard, Services, Data, Jobs, Chat.

## Open Items

- Pi:8090/game pixel-art HQ dashboard (spec ready, not built)
- 48K canonical ingredients with nutrition data sitting unused
- Store location data unused in price resolution (no geographic filtering)
- Runtime operations guide for OpenClaw agents not yet created
- Archive Digester cartridge approved but waiting on developer file collection
- Nationwide expansion: Phase 1 (store directory) not started
