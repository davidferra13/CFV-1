# Spec: OpenClaw PC Local Mirror And Backup Contract

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `openclaw-inventory-evolution.md`
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date             | Agent/Session   | Commit |
| --------------------- | ---------------- | --------------- | ------ |
| Created               | 2026-04-03 17:06 | Planner (Codex) |        |
| Status: ready         | 2026-04-03 17:06 | Planner (Codex) |        |
| Claimed (in-progress) |                  |                 |        |
| Spike completed       |                  |                 |        |
| Pre-flight passed     |                  |                 |        |
| Build completed       |                  |                 |        |
| Type check passed     |                  |                 |        |
| Build check passed    |                  |                 |        |
| Playwright verified   |                  |                 |        |
| Status: verified      |                  |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

OpenClaw on the Raspberry Pi must prioritize continuous and expanding data acquisition above everything else. Its job is to keep reading and integrating new, unique data points instead of looping over the same known information. If it only keeps rescanning what it already has, that means it is failing to discover new sources and the price intelligence stops growing.

At the same time, the database cannot live only on the Raspberry Pi. The Pi is the machine that does the collection and stores the upstream data, but ChefFlow should never have to read the database directly from the Pi. The PC must be on a schedule that constantly replenishes when new data arrives so there are always two copies of the same data: the live collector copy on the Pi and the latest mirrored copy on the PC.

The website must rely on the copy that lives with ChefFlow on the PC, not the Raspberry Pi. There must always be a current version and a backup version on the PC. If the Food Catalog page suggests it is loading from the Raspberry Pi, that is completely wrong and the product truth needs to be fixed.

### Developer Intent

- **Core goal:** Make the Raspberry Pi the upstream collector only, and make the PC-resident mirror the only data source ChefFlow reads at request time.
- **Key constraints:** Never require a chef-facing page to hit Pi endpoints for catalog, price history, optimization, or status reads; require a durable latest SQLite copy plus rotating snapshots on the PC before a pull is considered successful; preserve the Pi's role as the continuous collector.
- **Motivation:** The developer wants the data pool to keep expanding without risking loss or product regressions from Pi-only storage or Pi-dependent website reads.
- **Success from the developer's perspective:** The Pi keeps collecting, the PC always holds the latest usable mirror plus backups, ChefFlow reads only local data, and no chef-facing Food Catalog or price surface implies it is loading from the Raspberry Pi.

---

## What This Does (Plain English)

This spec turns OpenClaw into a clear two-machine system with one website truth source: the Raspberry Pi keeps scraping and collecting upstream grocery data, the PC pull pipeline stores a durable latest SQLite mirror plus timestamped backup snapshots on disk, syncs the mirror into local PostgreSQL, and every chef-facing OpenClaw surface reads only that local PC data. The Food Catalog, pricing widgets, cart refresh, weekly briefing, sales, and shopping optimization surfaces stay functional without request-time Pi dependency, and the UI stops telling chefs that pages are loading from the Raspberry Pi.

---

## Why It Matters

Right now the repo is in an in-between state: some catalog reads are already local, but several chef-facing price intelligence paths still call the Pi directly, and the raw pulled SQLite backup flow is only partially wired. That leaves product truth wrong, makes the website fragile when the Pi is unavailable, and violates the intended architecture established in the OpenClaw inventory evolution.

---

## Files to Create

_List every NEW file with its full path and a one-line description._

| File                                                                       | Purpose                                                                 |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `database/migrations/20260403000004_openclaw_pc_local_mirror_contract.sql` | Add local mirror artifact metadata and local canonical price history    |
| `tests/unit/openclaw-local-mirror-contract.test.ts`                        | Verify local-only helper/query behavior and no-Pi request-time fallback |
| `tests/unit/openclaw-pull-artifact-contract.test.ts`                       | Verify latest+snapshot artifact persistence and retention semantics     |

---

## Files to Modify

_List every EXISTING file that needs changes. Be specific about what changes._

| File                                                       | What to Change                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `.gitignore`                                               | Ignore `data/openclaw-backups/` so mirrored raw SQLite artifacts never get committed                          |
| `scripts/openclaw-pull/config.mjs`                         | Make the durable local backup directory and latest snapshot path the canonical PC artifact contract           |
| `scripts/openclaw-pull/pull.mjs`                           | Require successful local artifact persistence before sync success; record artifact metadata and daily history |
| `scripts/openclaw-pull/sync-normalization.mjs`             | Read from the durable local latest SQLite copy instead of treating `.openclaw-temp` as the authoritative copy |
| `lib/openclaw/catalog-actions.ts`                          | Preserve the local-mirror read contract and expose any helper reuse needed for other local pricing actions    |
| `lib/openclaw/store-catalog-actions.ts`                    | Fix stale Pi-direct comments and, if useful, expose shared local query helpers                                |
| `lib/openclaw/refresh-status-actions.ts`                   | Stop pinging the Pi at request time; return local mirror and local backup freshness only                      |
| `lib/openclaw/price-intelligence-actions.ts`               | Replace Pi fetches with local PostgreSQL queries over mirrored current data and local history                 |
| `lib/openclaw/cart-actions.ts`                             | Refresh cart prices from the local mirror instead of Pi ingredient detail endpoints                           |
| `lib/openclaw/event-shopping-actions.ts`                   | Replace Pi optimizer/scorecard calls with local optimizer logic                                               |
| `lib/openclaw/weekly-briefing-actions.ts`                  | Replace Pi cost-impact fetches with local historical comparisons                                              |
| `lib/openclaw/sale-calendar-actions.ts`                    | Build sales views from local mirrored sale/current price data                                                 |
| `lib/openclaw/price-watch-actions.ts`                      | Resolve watch alerts from local mirrored prices instead of Pi lookups                                         |
| `lib/openclaw/store-preference-actions.ts`                 | Source available store names from the local mirror, not Pi `/api/sources`                                     |
| `app/(chef)/culinary/price-catalog/page.tsx`               | Keep Food Catalog copy and status language strictly local-mirror truthful                                     |
| `app/(chef)/culinary/price-catalog/catalog-browser.tsx`    | Keep existing UX but ensure expanded history and cart refresh flows stay local                                |
| `components/pricing/openclaw-refresh-status.tsx`           | Present only local mirror / local backup timing on chef-facing surfaces                                       |
| `components/pricing/shopping-optimizer.tsx`                | Remove live/Pi wording from error and helper copy                                                             |
| `components/pricing/cost-impact.tsx`                       | Keep error copy truthful to local mirror availability                                                         |
| `components/pricing/event-shopping-planner.tsx`            | Remove Pi optimizer wording from user-facing copy/comments if surfaced                                        |
| `app/(admin)/admin/price-catalog/price-catalog-client.tsx` | Mark as legacy internal runtime console or remove from active product truth                                   |
| `docs/app-complete-audit.md`                               | Correct the Food Catalog and admin price-catalog descriptions to match the real runtime boundary              |

---

## Database Changes

### New Tables

```sql
CREATE TABLE IF NOT EXISTS openclaw.canonical_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id TEXT NOT NULL REFERENCES openclaw.canonical_ingredients(ingredient_id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES openclaw.stores(id) ON DELETE CASCADE,
  observed_on DATE NOT NULL,
  price_type TEXT NOT NULL DEFAULT 'retail'
    CHECK (price_type IN ('retail', 'wholesale', 'commodity', 'farm_direct')),
  best_price_cents INTEGER NOT NULL,
  best_sale_price_cents INTEGER,
  lowest_unit_price_cents INTEGER,
  seen_in_stock BOOLEAN,
  source_store_product_count INTEGER NOT NULL DEFAULT 1,
  source_sync_run_id UUID REFERENCES openclaw.sync_runs(id) ON DELETE SET NULL,
  last_observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ingredient_id, store_id, observed_on, price_type)
);

CREATE INDEX IF NOT EXISTS idx_oc_canonical_price_history_ingredient_date
  ON openclaw.canonical_price_history(ingredient_id, observed_on DESC);

CREATE INDEX IF NOT EXISTS idx_oc_canonical_price_history_store_date
  ON openclaw.canonical_price_history(store_id, observed_on DESC);
```

### New Columns on Existing Tables

```sql
ALTER TABLE openclaw.sync_runs
  ADD COLUMN IF NOT EXISTS local_latest_artifact_path TEXT,
  ADD COLUMN IF NOT EXISTS local_snapshot_artifact_path TEXT,
  ADD COLUMN IF NOT EXISTS local_artifact_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS local_backup_written_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS local_backup_pruned_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_oc_sync_runs_finished_at
  ON openclaw.sync_runs(finished_at DESC)
  WHERE finished_at IS NOT NULL;
```

### Migration Notes

- Migration filename must be checked against existing files in `database/migrations/` before creation; `20260403000004_...` is the next expected timestamp after `20260403000003_allow_draft_to_paid_transition.sql`.
- All changes stay additive. No DROP, TRUNCATE, or destructive backfill is allowed without explicit developer approval.
- `openclaw.canonical_price_history` is intentionally daily-grain, not full-row-per-pull archival. The raw full SQLite archival lives on disk in `data/openclaw-backups/`; PostgreSQL only needs the queryable history required by chef-facing surfaces.
- The pull job must write backup artifact metadata into `openclaw.sync_runs` only after both the latest copy and the timestamped snapshot have been written successfully on the PC.

---

## Data Model

The architecture after this spec has four layers:

1. **Pi upstream collector**
   - The Raspberry Pi keeps scraping, discovering sources, and writing the upstream SQLite database.
   - This spec does not redesign the Pi's crawler/discovery logic. It preserves the Pi as the producer.

2. **PC raw mirror artifacts**
   - Every successful pull writes two artifacts on the PC:
     - one stable latest file: `data/openclaw-backups/openclaw-latest.db`
     - one immutable timestamped snapshot: `data/openclaw-backups/openclaw-<timestamp>.db`
   - These artifacts are the local disaster-recovery copy of the raw upstream dataset.
   - Backup creation is mandatory. If the PC cannot persist these files, the pull is not successful.

3. **PC queryable local mirror**
   - The pull pipeline continues syncing current catalog data into local PostgreSQL `openclaw.*` tables such as `chains`, `stores`, `products`, `store_products`, `canonical_ingredients`, and `sync_runs`.
   - The new `openclaw.canonical_price_history` table gives the website a local time-series source for spark lines, cost deltas, weekly briefing, price watch alerts, and related intelligence surfaces.

4. **ChefFlow request-time read contract**
   - Chef-facing pages and components read only local PostgreSQL and local mirror metadata.
   - No `app/(chef)` route, no `components/pricing/*` interaction, and no chef-safe server action may require request-time Pi access to render or refresh pricing data.
   - Admin/debug/runtime tooling may still have separate Pi-facing paths, but those paths are not allowed to define chef-facing product truth.

Key entity relationships:

- `openclaw.chains -> openclaw.stores -> openclaw.store_products -> openclaw.products`
- `openclaw.canonical_ingredients` maps the normalized ingredient space the chef-facing catalog/search layer works in
- `openclaw.canonical_price_history` stores per-day per-store best observed prices for canonical ingredients
- `openclaw.sync_runs` stores the last pull timing plus artifact metadata for the PC-resident raw mirror files

Key constraints:

- `openclaw.store_products` remains the current-state table for live mirrored product availability and price rows.
- `openclaw.canonical_price_history` is the local historical layer; do not repurpose `ingredient_price_history` as the catalog history source for Food Catalog spark lines.
- `openclaw.sync_runs.finished_at` and `local_backup_written_at` are the authoritative timestamps for local mirror freshness, not live Pi pings.

---

## Server Actions

_List every server action with its signature, auth requirement, and behavior._

| Action                                     | Auth            | Input                                     | Output                                                                                                                                                                        | Side Effects                         |
| ------------------------------------------ | --------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `getOpenClawRefreshStatus()`               | `requireChef()` | none                                      | `{ localSyncStartedAt, localSyncFinishedAt, localBackupWrittenAt, latestStoreCatalogedAt, latestStorePriceSeenAt, latestArtifactPath, snapshotArtifactPath, artifactSha256 }` | None                                 |
| `getPriceHistory(ingredientId, days?)`     | `requireChef()` | `{ ingredientId: string, days?: number }` | `PriceHistory` built from `openclaw.canonical_price_history`                                                                                                                  | None                                 |
| `getPriceDrops(limit?)`                    | `requireChef()` | `{ limit?: number }`                      | Local drop list from local history deltas                                                                                                                                     | None                                 |
| `getPriceFreshness()`                      | `requireChef()` | none                                      | Local freshness counts derived from `openclaw.store_products.last_seen_at`                                                                                                    | None                                 |
| `getStockSummary()`                        | `requireChef()` | none                                      | Local stock summary from `openclaw.store_products.in_stock`                                                                                                                   | None                                 |
| `getShoppingOptimization(items)`           | `requireChef()` | `{ items: string[] }`                     | Cheapest local multi-store and single-store plans                                                                                                                             | None                                 |
| `getStoreScorecard(items)`                 | `requireChef()` | `{ items: string[] }`                     | Local per-store ranking for supplied ingredient names                                                                                                                         | None                                 |
| `getCostImpact(items, days?)`              | `requireChef()` | `{ items: string[], days?: number }`      | Local cost delta summary from current mirror vs local history                                                                                                                 | None                                 |
| `getPriceIntelligenceSummary()`            | `requireChef()` | none                                      | Consolidated local summary used by dashboard alert cards                                                                                                                      | None                                 |
| `refreshCartPrices(cartId)`                | `requireChef()` | `{ cartId: string }`                      | `{ success, updated, error? }` using local catalog detail data                                                                                                                | Updates cart item prices in local DB |
| `getUpcomingEventShoppingPlan(daysAhead?)` | `requireChef()` | `{ daysAhead?: number }`                  | Event shopping plan with local optimizer and local store ranking                                                                                                              | None                                 |
| `getWeeklyPriceBriefing()`                 | `requireChef()` | none                                      | Weekly local price briefing with drops/spikes/basket movement                                                                                                                 | None                                 |
| `getCurrentSales(stores?)`                 | `requireChef()` | `{ stores?: string[] }`                   | Local current sale items from mirrored sale/current price fields                                                                                                              | None                                 |
| `getSalesByCategory(category, stores?)`    | `requireChef()` | `{ category: string, stores?: string[] }` | Local filtered sale list                                                                                                                                                      | None                                 |
| `getAvailableOpenClawStores()`             | `requireChef()` | none                                      | Store display names from local `openclaw.stores/chains`                                                                                                                       | None                                 |

Runtime behavior outside server actions:

- `scripts/openclaw-pull/pull.mjs` becomes the source of truth for:
  - downloading the Pi SQLite,
  - validating it,
  - writing the PC latest+snapshot artifacts,
  - syncing PostgreSQL current-state tables,
  - upserting daily local canonical price history,
  - and recording artifact metadata in `openclaw.sync_runs`.

---

## UI / Component Spec

_Describe what the user sees. Be specific: layout, components, states._

### Page Layout

- **Food Catalog (`/culinary/price-catalog`)**
  - Keep the existing stat cards and catalog browser structure.
  - The explanatory copy must say the page is using the local ChefFlow mirror, not the Raspberry Pi.
  - The refresh/status surface must describe only local mirror freshness and local backup truth.
  - Expanded ingredient rows must continue showing per-store prices and spark lines, but the history data must come from local PostgreSQL.

- **Chef-facing pricing widgets and dashboards**
  - Cost Impact, Shopping Optimizer, Store Scorecard, Event Shopping Planner, Weekly Briefing, Sales, and Price Watch must preserve their current interaction patterns.
  - Any helper text or error copy implying "live Pi" or "reach the price engine" must be rewritten to local-mirror language.

- **Admin price catalog**
  - The active `/admin/price-catalog` route already redirects to `/culinary/price-catalog` and should stay out of the chef-facing runtime story.
  - If `price-catalog-client.tsx` is retained, it must be clearly treated as a legacy internal runtime console, not as an active page that defines product truth.

### States

- **Loading:** Existing loading skeletons/spinners stay intact. No chef-facing loading message may claim it is connecting to the Pi.
- **Empty:** If the local mirror has no synced catalog rows yet, show an honest "local catalog mirror not populated yet" empty state, not fake zeros and not a Pi error.
- **Error:** If the local PostgreSQL mirror or artifact metadata is unavailable, show local-mirror error language such as `Local catalog mirror unavailable right now.` Do not suggest that the user should check whether the Pi is online.
- **Populated:** Show current mirrored counts, local freshness timestamps, local price history, local optimizer outputs, and normal browse/search/cart interactions without Pi-oriented copy.

### Interactions

- Catalog search/filter/detail interactions stay the same from the chef's perspective.
- Expanding a catalog ingredient must fetch local detail plus local historical points in one request sequence.
- Refresh Cart Prices must use the local mirror. It cannot fall back to a Pi endpoint.
- Shopping Optimizer, Store Scorecard, Event Shopping Planner, Weekly Briefing, Sales, and Price Watch remain user-triggered or page-load-driven reads, but all of those reads must stay local.
- Status surfaces remain read-only. This spec does not add a manual "sync now" control for chefs.

---

## Edge Cases and Error Handling

_List anything that could go wrong and what the correct behavior is._

| Scenario                                        | Correct Behavior                                                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Pi download succeeds but PC backup write fails  | Abort the pull, mark the sync run as failed/incomplete, and do not claim the local mirror is current                                          |
| Backup writes succeed but PostgreSQL sync fails | Keep the raw latest+snapshot artifacts on disk; record the failure so the next run can recover                                                |
| Local history table has no rows yet             | Food Catalog spark lines and cost-delta widgets show empty/no-history states, not Pi fallback                                                 |
| Local mirror is stale                           | Show last successful local pull and last observed data timestamps honestly; do not ping the Pi from the page                                  |
| Pi is offline during a chef page request        | Chef-facing surfaces still render from the last local mirror state                                                                            |
| Store name/source registry changes upstream     | Local store picker and store-preferences pages continue reading local `openclaw.stores/chains`; next successful pull refreshes the local list |
| Legacy admin Pi console file remains in repo    | It must not be routable as the active product surface or reused as proof of current architecture                                              |

---

## Verification Steps

_How does the builder agent confirm this works? Be specific._

1. Run the new migration and confirm `openclaw.sync_runs` has the new artifact metadata columns and `openclaw.canonical_price_history` exists.
2. Run the OpenClaw pull job against the real Pi or a valid local fixture.
3. Verify `data/openclaw-backups/openclaw-latest.db` exists on disk after the run.
4. Verify a timestamped snapshot file appears under `data/openclaw-backups/`.
5. Verify the newest `openclaw.sync_runs` row has `finished_at`, `local_backup_written_at`, `local_latest_artifact_path`, `local_snapshot_artifact_path`, and `local_artifact_sha256` populated.
6. Open `/culinary/price-catalog` and confirm the page copy and status surface describe a local mirror, not the Pi.
7. Expand a catalog ingredient and verify the spark line still renders using local data.
8. Use Refresh Cart Prices and verify it succeeds with the Pi intentionally unreachable.
9. Open the pricing/dashboard surfaces backed by `price-intelligence-actions.ts`, `event-shopping-actions.ts`, `weekly-briefing-actions.ts`, `sale-calendar-actions.ts`, and `price-watch-actions.ts`; confirm they still render from local data with the Pi unreachable.
10. Open `/settings/store-preferences` and `/culinary/costing/sales` and confirm store lists still populate from local mirrored store data.
11. Confirm the active `/admin/price-catalog` route behavior still matches the intended redirect/internal-only story and the audit doc reflects reality.
12. Run `npm run typecheck:app`.
13. Run `npm run build -- --no-lint`.

---

## Out of Scope

_What does this spec explicitly NOT cover? Prevents scope creep._

- Rewriting Pi-side scrapers, crawler breadth/depth heuristics, or source-discovery strategy
- Vendor import bridge work in `lib/openclaw/vendor-import-actions.ts`
- Receipt scanning and ingredient image enrichment bridge work in `lib/ingredients/*`
- Admin-only or cron-only Pi host diagnostics beyond keeping them from defining chef-facing product truth
- Any promise that the Pi has already achieved nationwide or exhaustive source coverage

---

## Notes for Builder Agent

_Anything else the builder needs to know: gotchas, patterns to follow, files to reference for similar implementations._

- Treat this as a mixed `runtime-owned` + `bridge-owned` + `website-owned` contract change. The website promise changes, but the pull pipeline and local mirror data model are the foundation. Read `docs/research/builder-docket-runtime-ownership-map-2026-04-03.md` before implementation.
- Do not use `lib/openclaw/sync.ts` or direct `OPENCLAW_API` fetches from chef-facing request paths after this spec lands. If a helper still needs Pi access, it belongs in runtime/admin/bridge scope and must not be on a chef page codepath.
- Do not "solve" missing local history by keeping a hidden Pi fallback in `getPriceHistory()`.
- The raw latest SQLite copy on the PC is not the same thing as the query mirror in PostgreSQL. Both are required:
  - raw latest+snapshot files for recovery and provenance
  - PostgreSQL mirror for fast request-time reads
- Prefer repo-relative artifact paths in database rows even if the config resolves to an absolute local directory on disk.
- Update `docs/app-complete-audit.md` because the current admin price catalog description still says the page connects to the Raspberry Pi, while the route now redirects.

---

## Spec Validation (Planner Gate Evidence)

### 1. What exists today that this touches?

- The Food Catalog page already imports local catalog stats, local store catalog stats, and a refresh-status action, then renders `OpenClawRefreshStatus` with `variant="local-mirror"`. `app/(chef)/culinary/price-catalog/page.tsx:2-5,41-45,84`
- The Food Catalog copy already says searches and price detail reads stay on the machine running the site instead of reaching upstream at request time. `app/(chef)/culinary/price-catalog/page.tsx:52-56`
- The catalog browser still loads local catalog search/detail/category/store actions, but it also calls `getPriceHistory()` from `price-intelligence-actions.ts` when an item is expanded. `app/(chef)/culinary/price-catalog/catalog-browser.tsx:4-15,166-178,200-203,294-297`
- `lib/openclaw/catalog-actions.ts` has already been rewritten to declare that request-time reads must stay on the local mirror and that the website reads the PC-resident copy. `lib/openclaw/catalog-actions.ts:3-10`
- `lib/openclaw/price-intelligence-actions.ts` still states that it calls the Pi API directly and hardcodes `OPENCLAW_API`. `lib/openclaw/price-intelligence-actions.ts:3-12`
- `getPriceHistory()` still fetches Pi `/api/prices/history/...` at request time. `lib/openclaw/price-intelligence-actions.ts:318-332`
- `refreshCartPrices()` still fetches Pi ingredient detail rows at request time. `lib/openclaw/cart-actions.ts:335-367`
- `getOpenClawRefreshStatus()` still imports `getOpenClawStatsInternal()` from `lib/openclaw/sync.ts` and returns `piLastScrapeAt` / `piReachable`. `lib/openclaw/refresh-status-actions.ts:17,20-25,50,65-70`
- The pull config already defines `backupDir` and `openclaw-latest.db` under `data/openclaw-backups`. `scripts/openclaw-pull/config.mjs:17-24`
- `scripts/openclaw-pull/pull.mjs` already defines `persistLocalMirror(...)`, but the main pull flow still writes only `.openclaw-temp/openclaw-latest.db` before opening SQLite. `scripts/openclaw-pull/pull.mjs:39-68,198-226`
- `.gitignore` ignores `.openclaw-temp/` and generic `backups/`, but not `data/openclaw-backups/`. `.gitignore:137-139,235`
- The local mirror schema already exists in PostgreSQL:
  - `openclaw.stores.last_cataloged_at` `database/migrations/20260401000119_openclaw_inventory_schema.sql:23-41`
  - `openclaw.products.image_url` `database/migrations/20260401000119_openclaw_inventory_schema.sql:63-77`
  - `openclaw.store_products.sale_price_cents`, `last_seen_at`, `source` `database/migrations/20260401000119_openclaw_inventory_schema.sql:85-98`
  - `openclaw.sync_runs.started_at/finished_at/sqlite_size_bytes` `database/migrations/20260401000119_openclaw_inventory_schema.sql:127-141`
  - `openclaw.canonical_ingredients` `database/migrations/20260401000150_canonical_ingredients.sql:5-20`
  - `openclaw.store_products.price_per_standard_unit_cents` `database/migrations/20260401000140_data_completeness_engine.sql:122-126`
  - `openclaw.store_products.price_type` and `openclaw.stores.store_type` `database/migrations/20260401000151_price_type_and_source_manifest.sql:5-23`
- Chef-facing pricing surfaces outside Food Catalog still depend on Pi-backed OpenClaw actions:
  - Dashboard alerts call `getPriceIntelligenceSummary()` `app/(chef)/dashboard/_sections/alerts-cards.tsx:14,57-74`
  - Costing page mounts `CostImpact`, `StoreScorecard`, `ShoppingOptimizer`, and `EventShoppingPlanner` `app/(chef)/culinary/costing/page.tsx:184-209`
  - `CostImpact` imports `getCostImpact()` from `price-intelligence-actions.ts` `components/pricing/cost-impact.tsx:8-13,26-35`
  - `ShoppingOptimizer` imports `getShoppingOptimization()` and currently says it calls the Pi endpoint in the file header `components/pricing/shopping-optimizer.tsx:3-16,30-39`
  - `EventShoppingPlanner` imports `getUpcomingEventShoppingPlan()` and its header says it runs the Pi optimizer `components/pricing/event-shopping-planner.tsx:3-17`
  - `getUpcomingEventShoppingPlan()` still POSTs to Pi optimizer and scorecard endpoints `lib/openclaw/event-shopping-actions.ts:3-12,205-227`
  - Dashboard weekly briefing still uses Pi cost-impact fetches `lib/openclaw/weekly-briefing-actions.ts:13-15,133-142`
  - Costing sales pages still use Pi-backed sale calendar and Pi-backed available store list `app/(chef)/culinary/costing/sales/page.tsx:3-5,14-19`, `lib/openclaw/sale-calendar-actions.ts:3-13,68-85`, `lib/openclaw/store-preference-actions.ts:11-18,38-50`
  - Price watch alerts still fetch Pi lookup batches `lib/openclaw/price-watch-actions.ts:13,146,166-191`
- The active `/admin/price-catalog` route redirects to `/culinary/price-catalog`, but the legacy client still contains `Connecting to Pi...`, `Pi status`, and `Cannot reach the price engine ... Check that the Pi is on`. `app/(admin)/admin/price-catalog/page.tsx:1-8`, `app/(admin)/admin/price-catalog/price-catalog-client.tsx:5-13,132-153`
- The app audit is stale: it still describes the admin price catalog as an OpenClaw dashboard that connects to the Raspberry Pi. `docs/app-complete-audit.md:1786-1788`

### 2. What exactly changes?

- Finish the PC-side artifact contract so the pull job always writes:
  - a durable latest SQLite copy,
  - a timestamped snapshot,
  - artifact metadata into `openclaw.sync_runs`,
  - and a local daily canonical price history table.
- Remove request-time Pi reads from every chef-facing OpenClaw pricing path in scope:
  - Food Catalog history and cart refresh
  - dashboard price-intelligence summary and weekly briefing
  - costing price change/store ranking/shopping optimization/event shopping planner
  - costing sales pages and store-preferences store registry reads
  - price watch alerts
- Keep `lib/openclaw/catalog-actions.ts` as the local read source of truth and reuse it or its underlying queries where appropriate.
- Make chef-facing refresh/status surfaces local-only and truthful.
- Keep the admin redirect as the active route behavior and stop treating the legacy Pi client as product truth.
- Update the app audit to reflect the real route/runtime story.

### 3. What assumptions are you making?

| Assumption                                                                                                       | Verified?                    | Evidence                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The intended architecture is Pi collector -> PC mirror -> ChefFlow reads local                                   | Verified                     | `docs/specs/openclaw-inventory-evolution.md:31-34,44-51`                                                                                                                                                                                                                                                                 |
| The Food Catalog request-time catalog search/detail layer has already been moved local                           | Verified                     | `app/(chef)/culinary/price-catalog/page.tsx:41-45`, `lib/openclaw/catalog-actions.ts:3-10`                                                                                                                                                                                                                               |
| The pull pipeline already has a partially implemented local backup design                                        | Verified                     | `scripts/openclaw-pull/config.mjs:17-24`, `scripts/openclaw-pull/pull.mjs:39-68`                                                                                                                                                                                                                                         |
| A builder could treat the current pull as complete and miss the unfinished artifact wiring                       | Verified                     | `scripts/openclaw-pull/pull.mjs:198-226` shows the main path never calls `persistLocalMirror(...)`                                                                                                                                                                                                                       |
| All chef-facing price intelligence can be served from local data if the builder adds a local daily history table | Verified enough for planning | Current-state local tables and existing local optimizer helper already exist; missing piece is local history materialization. `database/migrations/20260401000119_openclaw_inventory_schema.sql:23-141`, `database/migrations/20260401000150_canonical_ingredients.sql:5-20`, `lib/openclaw/catalog-actions.ts:924-1023` |
| The website should not require request-time Pi access to satisfy the developer's intent                          | Verified                     | User signal plus existing local-mirror direction in `lib/openclaw/catalog-actions.ts:8-9` and `app/(chef)/culinary/price-catalog/page.tsx:54-55`                                                                                                                                                                         |
| The repo already verifies exhaustive source-discovery breadth/depth on the Pi                                    | Unverified                   | `docs/specs/openclaw-inventory-evolution.md:3,9,735-741,948` still marks Pi-side phases and uncertainties separately                                                                                                                                                                                                     |

### 4. Where will this most likely break?

1. A builder may finish the backup directory feature but still leave `.openclaw-temp/openclaw-latest.db` as the only file the pipeline truly depends on, which keeps the durable PC backup contract half-finished. `scripts/openclaw-pull/pull.mjs:198-226`, `scripts/openclaw-pull/config.mjs:17-24`
2. A builder may localize Food Catalog search but miss the expanded history and cart refresh paths, leaving hidden Pi request-time calls behind. `app/(chef)/culinary/price-catalog/catalog-browser.tsx:294-297`, `lib/openclaw/cart-actions.ts:357-367`
3. A builder may fix Food Catalog only and forget the other chef-facing pricing surfaces still using the same Pi-backed module family. `app/(chef)/dashboard/_sections/alerts-cards.tsx:14,57-74`, `app/(chef)/culinary/costing/page.tsx:190-208`, `lib/openclaw/event-shopping-actions.ts:205-227`, `lib/openclaw/weekly-briefing-actions.ts:133-142`, `lib/openclaw/sale-calendar-actions.ts:68-85`, `lib/openclaw/price-watch-actions.ts:166-191`
4. A builder may keep the status surface dependent on live Pi stats because `refresh-status-actions.ts` already exposes `piLastScrapeAt`. That would violate the local-only request-time contract. `lib/openclaw/refresh-status-actions.ts:17,20-25,50,65-70`
5. A builder may trust the stale admin audit or legacy client and build around Pi messaging that is no longer the active route behavior. `app/(admin)/admin/price-catalog/page.tsx:7-8`, `app/(admin)/admin/price-catalog/price-catalog-client.tsx:132-153`, `docs/app-complete-audit.md:1786-1788`

### 5. What is underspecified?

- The repo does not yet define the exact local-query implementation for all intelligence helpers after Pi removal. This spec resolves that by requiring local PostgreSQL reads plus `openclaw.canonical_price_history`, not hidden Pi fallbacks.
- The repo does not currently store backup artifact metadata in PostgreSQL, so the exact field names are new in this spec.
- The repo does not define one canonical user-facing phrase for stale local mirror state. This spec resolves that by banning Pi-facing copy and requiring local-mirror wording.
- The developer's broader goal of endless source discovery and anti-rescan behavior is real, but this spec narrows to the mirror/backup/request-time contract so a builder can complete one coherent slice.

### 6. What dependencies or prerequisites exist?

- Existing OpenClaw inventory schema and canonical ingredient schema must already be present. `database/migrations/20260401000119_openclaw_inventory_schema.sql:5-141`, `database/migrations/20260401000150_canonical_ingredients.sql:5-20`
- The pull runtime already exists and is the right place to materialize artifacts plus local price history. `scripts/openclaw-pull/config.mjs:1-25`, `scripts/openclaw-pull/pull.mjs:198-235`
- Existing local optimizer logic already exists in `getShoppingOptimizationAdmin(...)` and should be reused/adapted rather than rebuilt from scratch. `lib/openclaw/catalog-actions.ts:924-1023`
- Active build baseline is green, so this is safe to plan on top of. `docs/build-state.md:17-27`

### 7. What existing logic could this conflict with?

- `lib/openclaw/sync.ts` is still the bridge-owned Pi sync layer and should not be casually deleted; chef-facing request paths simply must stop depending on it. `lib/openclaw/sync.ts:26,94-188,533-540`
- Vendor import remains a Pi bridge flow and is intentionally out of scope. `lib/openclaw/vendor-import-actions.ts:48-95,152-167`
- `app/api/openclaw/image/route.ts` is an image proxy bridge path, not the catalog/read contract itself. `app/api/openclaw/image/route.ts:6-12`
- The admin price catalog legacy client still exists; removing or relocating it must not break the current redirect behavior. `app/(admin)/admin/price-catalog/page.tsx:7-8`, `app/(admin)/admin/price-catalog/price-catalog-client.tsx:19-30`

### 8. What is the end-to-end data flow?

1. The Pi keeps scraping and writing its upstream SQLite database. `docs/specs/openclaw-inventory-evolution.md:31-34`
2. The PC pull job downloads that SQLite over HTTP. `scripts/openclaw-pull/pull.mjs:200-209`
3. The PC validates the file and writes:
   - `.openclaw-temp/openclaw-latest.db` for in-run staging,
   - `data/openclaw-backups/openclaw-latest.db` as the durable current raw mirror,
   - `data/openclaw-backups/openclaw-<timestamp>.db` as the immutable snapshot. `scripts/openclaw-pull/config.mjs:17-24`, `scripts/openclaw-pull/pull.mjs:39-68`
4. The PC syncs current-state rows into local PostgreSQL `openclaw.*` tables and upserts local daily canonical price history.
5. `openclaw.sync_runs` records both sync timing and backup artifact metadata.
6. Chef-facing pages request only local PostgreSQL/server actions.
7. If the Pi goes offline after the last successful pull, the website continues reading the local mirror and local history tables.

### 9. What is the correct implementation order?

1. Add the migration for `openclaw.canonical_price_history` and `openclaw.sync_runs` artifact metadata columns.
2. Finish the pull pipeline artifact contract in `scripts/openclaw-pull/pull.mjs` and `.gitignore`.
3. Make the durable PC latest SQLite copy the authoritative raw artifact for downstream sync helpers.
4. Materialize local daily canonical price history during each successful pull.
5. Rewrite `refresh-status-actions.ts` to local-only status reads.
6. Rewrite `price-intelligence-actions.ts` to local-only queries.
7. Rewrite `cart-actions.ts`, `event-shopping-actions.ts`, `weekly-briefing-actions.ts`, `sale-calendar-actions.ts`, `price-watch-actions.ts`, and `store-preference-actions.ts` to use the local mirror.
8. Clean up chef-facing copy/status surfaces and stale admin/audit descriptions.
9. Verify the entire chef-facing pricing surface still works with the Pi intentionally unreachable.

### 10. What are the exact success criteria?

- A successful pull always leaves behind both a latest raw SQLite mirror and an immutable timestamped snapshot on the PC.
- `openclaw.sync_runs` records artifact metadata for the successful pull.
- Food Catalog search, detail, spark-line history, and cart refresh all work without request-time Pi access.
- Dashboard price-intelligence summary, costing price widgets, weekly briefing, event shopping planner, sales, and price-watch alerts all work without request-time Pi access.
- Chef-facing status surfaces describe the local mirror only.
- No active chef-facing page says it is connecting to, loading from, or depending on the Raspberry Pi.
- The active `/admin/price-catalog` route story and the app audit agree with reality.

### 11. What are the non-negotiable constraints?

- The Raspberry Pi remains the upstream collector. This spec does not demote or replace the Pi scraper runtime. `docs/specs/openclaw-inventory-evolution.md:31-34`
- The website cannot use request-time Pi fetches for chef-facing catalog/pricing reads.
- Backup persistence on the PC is mandatory for a successful pull.
- No destructive migration or deletion of mirrored data.
- No fake live-sync wording and no chef-facing suggestion that the page should check whether the Pi is online.

### 12. What should NOT be touched?

- Pi-side scraper code and host operations outside the PC pull/mirror contract
- Vendor import bridge endpoints
- Receipt scan/image enrichment bridge code
- `app/api/cron/*` sync triggers except where a builder must keep them compatible with the new local contract
- Public image proxy routing

### 13. Is this the simplest complete version?

Yes.

The simplest complete version is:

- one additive migration,
- one completed pull artifact contract,
- one local history table,
- and a sweep of chef-facing OpenClaw read actions so they all use the same local source of truth.

Anything smaller leaves hidden Pi dependencies behind. Anything larger, such as redesigning the Pi crawler/discovery system in the same pass, turns this into a different project.

### 14. If implemented exactly as written, what would still be wrong?

The upstream acquisition engine would still have open work around breadth/depth expansion and source discovery. This spec makes the website and PC mirror truthful and resilient, but it does not by itself prove that the Pi has solved nationwide or exhaustive source coverage. The repo already separates that broader runtime evolution into Pi-side phases and open uncertainties. `docs/specs/openclaw-inventory-evolution.md:3,9,735-741,948`, `database/migrations/20260401000151_price_type_and_source_manifest.sql:25-32`

### What would a builder get wrong building this as written?

1. Treating the current partial backup code as "done" and never wiring artifact persistence into the actual pull success path. `scripts/openclaw-pull/pull.mjs:39-68,198-226`
2. Fixing Food Catalog copy while leaving `getPriceHistory()` and `refreshCartPrices()` Pi-backed. `app/(chef)/culinary/price-catalog/catalog-browser.tsx:294-297`, `lib/openclaw/price-intelligence-actions.ts:318-332`, `lib/openclaw/cart-actions.ts:357-367`
3. Rewriting only `price-intelligence-actions.ts` and forgetting the other chef-facing Pi-backed modules that live outside that file. `lib/openclaw/event-shopping-actions.ts:205-227`, `lib/openclaw/weekly-briefing-actions.ts:133-142`, `lib/openclaw/sale-calendar-actions.ts:68-85`, `lib/openclaw/price-watch-actions.ts:166-191`, `lib/openclaw/store-preference-actions.ts:38-50`
4. Keeping `refresh-status-actions.ts` dependent on `getOpenClawStatsInternal()` because it looks like "just status". That still violates the local-only website contract. `lib/openclaw/refresh-status-actions.ts:17,50,65-70`
5. Building against the stale admin description in the audit or the legacy Pi client instead of the active redirect and local catalog contract. `app/(admin)/admin/price-catalog/page.tsx:7-8`, `app/(admin)/admin/price-catalog/price-catalog-client.tsx:132-153`, `docs/app-complete-audit.md:1786-1788`
6. Trying to reuse `ingredient_price_history` as the Food Catalog spark-line source and accidentally blending tenant ingredient history with global mirrored catalog history. `database/migrations/20260401000061_ingredient_price_history.sql:1-18`, `lib/openclaw/sync.ts:279-280,390-416`

### Is anything assumed but not verified?

Yes.

- The broader source-discovery ambition is not verified by current repo code. The inventory-evolution spec still marks Pi-side phases and uncertainties separately. `docs/specs/openclaw-inventory-evolution.md:3,9,735-741,948`
- The exact local SQL implementation for every intelligence helper is not already written; this spec defines the contract, but the builder still has to implement the queries over the existing mirror plus the new local history table.
- The current repo does not prove whether the dashboard/costing/weekly briefing product language already has every local-only error state needed; those strings will need a builder pass during implementation.
- The pull artifact directory already exists in config, but the repo does not verify it is currently ignored by git or populated in production runs. `.gitignore:137-139,235`, `scripts/openclaw-pull/config.mjs:17-24`, `scripts/openclaw-pull/pull.mjs:39-68`

---

## Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

This spec is production-ready for the PC-local mirror and website read-source contract.

The remaining uncertainty is explicitly fenced off: source-discovery breadth/depth on the Pi is a separate runtime concern, and the exact SQL helpers still need to be implemented. But the architecture, file scope, migration plan, implementation order, and builder failure modes are clear enough to execute cleanly without guessing.
