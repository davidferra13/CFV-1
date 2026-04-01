# Research: OpenClaw Refresh Cadence and Status Surface

## Origin Context

The developer wants a plain answer to a practical question: when should they expect the numbers on Store Prices and Food Catalog to change?

Cleaned signal from the conversation:

- The developer keeps revisiting the store prices page and the food catalog page expecting movement, but often sees the same numbers.
- They know the underlying OpenClaw data does replenish, but they do not have a trustworthy signal telling them when to expect it.
- They want a simple badge or status symbol that makes the refresh rhythm obvious instead of making them guess.
- The reason this matters now is that the OpenClaw catalog and database are growing, which makes "nothing changed" more ambiguous unless the UI explains whether the data is stale, unchanged, or simply not refreshed yet.

## Summary

The chef-facing OpenClaw surfaces do not currently auto-refresh in the browser. `/prices` server-renders local PostgreSQL mirror stats, and the client only re-fetches when the chef actively searches for stores or changes filters on a store inventory page. `app/(chef)/prices/page.tsx:46-49`, `app/(chef)/prices/prices-client.tsx:67-87`, `app/(chef)/prices/store/[storeId]/store-inventory-browser.tsx:55-81`

The Food Catalog page is currently mixed. Its header stats come from `getStoreCatalogStats()` against local PostgreSQL, but the catalog browser itself fetches Pi APIs directly with `cache: 'no-store'`. That means the page header and the results grid are not describing the same pipeline. `app/(chef)/culinary/price-catalog/page.tsx:25-26,65`, `lib/openclaw/store-catalog-actions.ts:79-138`, `app/(chef)/culinary/price-catalog/catalog-browser.tsx:166-178,183-245,296-299`, `lib/openclaw/catalog-actions.ts:309-445`

The repo does not contain one canonical refresh schedule that a chef-facing countdown could safely promise. Current sources conflict: `/prices` says "updated daily," the local pull script says Windows Scheduled Task hourly, the cron routes describe nightly sync triggers, and newer pipeline docs describe multiple daily collection rounds. `app/(chef)/prices/page.tsx:57-60`, `scripts/openclaw-pull/pull.mjs:12-13`, `app/api/cron/price-sync/route.ts:5-11`, `app/api/cron/openclaw-sync/route.ts:9-12`, `docs/openclaw-data-pipeline.md:294-305`, `docs/openclaw-price-intelligence.md:50-67,73`, `docs/food-catalog-pipeline-update.md:12,24-31`

The correct product move is therefore not an exact "next refresh in 1h 52m" promise. The correct v1 is a truthful status surface that tells the chef:

- which pipeline this page is showing,
- the last known upstream scrape and/or local mirror pull,
- whether the page updates automatically or only on reload/search,
- and whether freshness is known or unknown.

## Detailed Findings

### 1. Store Prices is a local mirror, not a live polling page

`/prices` requires a chef and loads `getStoreCatalogStats()` plus chain data on the server before rendering. There is no browser polling or `router.refresh()` path on the page. `app/(chef)/prices/page.tsx:46-49`

The subtitle currently says the database is "updated daily by OpenClaw," which overstates certainty compared with the rest of the codebase. `app/(chef)/prices/page.tsx:57-60`

The "Last Sync" stat card is driven by `stats.lastSync`, and that value comes from `SELECT started_at FROM openclaw.sync_runs ORDER BY started_at DESC LIMIT 1`. That is the latest local pull start time, not a next-refresh estimate and not a Pi scrape ETA. `app/(chef)/prices/page.tsx:92-99`, `lib/openclaw/store-catalog-actions.ts:79-138`

The ZIP search experience is user-triggered only. The client calls `getNearbyStores()` inside `handleSearch()`. No interval, subscription, or background refresh exists. `app/(chef)/prices/prices-client.tsx:67-87`

### 2. Store inventory already has per-record freshness, but no page-level cadence status

Store cards on `/prices` already expose `last_cataloged_at` from `openclaw.stores` and color it with a small freshness indicator. `app/(chef)/prices/prices-client.tsx:176-206`, `lib/openclaw/store-catalog-actions.ts:159-207`

The store inventory page similarly colors each product row using `last_seen_at`, and new product data only loads when the chef filters, searches, or paginates. `app/(chef)/prices/store/[storeId]/store-inventory-browser.tsx:21-37,55-81,145-149,206`, `lib/openclaw/store-catalog-actions.ts:209-290`

This means the system already has useful freshness primitives, but only at the store-card and row level. It does not answer the higher-level question "when should I expect this whole page to change?"

### 3. Food Catalog is split between local mirror stats and direct Pi results

The Food Catalog page loads `getStoreCatalogStats()` and shows `synced {timeAgo(stats.lastSync)}` in the header. `app/(chef)/culinary/price-catalog/page.tsx:25-26,65`

But the catalog browser mounts by fetching categories, stores, and preferred stores, then performs searches and detail loads through Pi-backed actions such as `searchCatalogV2()`, `getCatalogDetail()`, and `getCatalogCategories()`. Those actions call Pi endpoints with `cache: 'no-store'`. `app/(chef)/culinary/price-catalog/catalog-browser.tsx:166-178,183-245,283-299`, `lib/openclaw/catalog-actions.ts:309-445`

As a result, the current "synced X ago" copy on `/culinary/price-catalog` is not page-truthful. It describes the local mirror action the header used, not the direct Pi-backed results the chef is browsing.

### 4. Existing freshness/status surfaces are adjacent, but not reusable as-is

`components/pricing/freshness-dot.tsx` expresses generic 7-day / 30-day age buckets. It is useful for row-level freshness, but it is not enough for a page-level "refresh cadence" surface because it does not explain pipeline source or refresh mechanics. `components/pricing/freshness-dot.tsx:8-27`

The admin price catalog already shows Pi-facing health information, including `Last scrape` and `Pi status`, but that surface is admin-only and intentionally uses admin auth. `app/(admin)/admin/price-catalog/page.tsx:8-10`, `app/(admin)/admin/price-catalog/price-catalog-client.tsx:40-44,139-147`

There is also a cron-auth-gated sentinel endpoint that exposes sync status, but it reads `ingredient_price_history`, not the chef-facing store catalog mirror, and it is not suitable to call directly from chef UI. `app/api/sentinel/sync-status/route.ts:6-42`

### 5. The cadence source of truth is currently inconsistent

The local pull service explicitly documents "Windows Scheduled Task (hourly)." `scripts/openclaw-pull/pull.mjs:12-13`

The legacy and unified cron routes both describe nightly cartridge sync scripts. `app/api/cron/price-sync/route.ts:5-11`, `app/api/cron/openclaw-sync/route.ts:5-12`

The Pi pipeline documentation says ChefFlow sync happens daily at 11 PM after other scrapers, while newer pipeline-update notes describe rotating Instacart runs twice daily plus other direct scrapers and daily Flipp. `docs/openclaw-data-pipeline.md:294-305`, `docs/openclaw-price-intelligence.md:50-67,73`, `docs/food-catalog-pipeline-update.md:12,24-31`

Taken together, the repo supports "variable cadence with multiple layers" much more strongly than it supports one exact next-refresh promise.

## Gaps

1. There is no chef-facing shared action that returns both local mirror freshness and Pi scrape freshness in one truthful shape. The local mirror logic lives in `lib/openclaw/store-catalog-actions.ts`, while Pi scrape stats live in `lib/openclaw/sync.ts`. `lib/openclaw/store-catalog-actions.ts:79-138`, `lib/openclaw/sync.ts:94-112`

2. There is no canonical, verified schedule configuration in the repo that a chef-facing countdown can rely on. The script comments, route comments, page copy, and docs disagree. `app/(chef)/prices/page.tsx:57-60`, `scripts/openclaw-pull/pull.mjs:12-13`, `app/api/cron/price-sync/route.ts:5-11`, `docs/openclaw-data-pipeline.md:294-305`, `docs/food-catalog-pipeline-update.md:12,24-31`

3. The Food Catalog header currently suggests one freshness story while the grid is driven by another pipeline. That mismatch needs correction before any status badge is added. `app/(chef)/culinary/price-catalog/page.tsx:25-26,65`, `lib/openclaw/catalog-actions.ts:309-445`

## Recommendations

1. Build a chef-safe refresh-status action that combines:
   - latest local pull start/finish from `openclaw.sync_runs`,
   - latest `openclaw.stores.last_cataloged_at`,
   - latest `openclaw.store_products.last_seen_at`,
   - and Pi `lastScrapeAt` via `getOpenClawStatsInternal()`. `database/migrations/20260401000119_openclaw_inventory_schema.sql:36,95,128-141`, `lib/openclaw/sync.ts:94-104`

2. Add a shared refresh-status component to `/prices` and `/culinary/price-catalog` that explicitly says the page does not auto-refresh. On `/prices`, label the local mirror timing. On `/culinary/price-catalog`, label the Pi scrape timing. `app/(chef)/prices/page.tsx:46-49,92-99`, `app/(chef)/culinary/price-catalog/page.tsx:25-26,65`

3. Remove or relabel misleading copy:
   - replace "updated daily by OpenClaw" on `/prices`,
   - replace the Food Catalog `synced ...` crumb that currently points at local mirror data. `app/(chef)/prices/page.tsx:57-60`, `app/(chef)/culinary/price-catalog/page.tsx:65`

4. Do not ship an exact "next refresh at" countdown until the scheduling source of truth is canonicalized in code or config. The repo does not currently verify one. `scripts/openclaw-pull/pull.mjs:12-13`, `docs/openclaw-data-pipeline.md:294-305`, `docs/food-catalog-pipeline-update.md:12,24-31`
