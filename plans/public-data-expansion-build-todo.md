# Public Data Expansion Build TODO

Owner: `Public data + directory + ops intelligence`
Last updated: `2026-03-10`
Goal: Finish using publicly available data and assets to make the site materially smarter, richer, and more trustworthy.

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## Scope rules

- [x] Use official or openly licensed sources where possible.
- [x] Prefer durable stored snapshots over throwaway live fetches.
- [x] Track provenance, freshness, and licensing.
- [x] Do not scrape closed-platform reviews or listings (`Yelp`, `Google Reviews`, `Airbnb`, `Take a Chef`).
- [ ] Do not ship public-media ingestion until attribution and license handling are fully built.

## What is already done

- [x] Research memo for public/open sources.
- [x] Base public-data adapters for `USDA`, `openFDA`, `Census`, `NWS`, `AirNow`, `Open Food Facts`.
- [x] Write-through public-data store and sync layer.
- [x] Durable schema for reference tables, weather snapshots, recall snapshots, and source logs.
- [x] Ingredient enrichment now uses stored-or-fresh public data.
- [x] Geocoding/location normalization now uses stored-or-fresh public data.
- [x] Weather risk now uses stored-or-fresh public data.
- [x] Recall cron now persists recall snapshots before notifications.
- [x] Weather cron now persists weather snapshots.
- [x] Ingredient refresh cron now backfills stale ingredient enrichment.
- [x] Admin public-data health page exists.

## Execution order

1. Finish data coverage.
2. Finish product wiring.
3. Finish public asset ingestion.
4. Finish admin controls and override tools.
5. Finish QA and rollout hardening.

## Phase 1: Finish Data Coverage

- [~] Build persistent public-data foundation.
  - [x] Add migration for public-data tables.
  - [x] Add `lib/public-data/store.ts`.
  - [x] Add `lib/public-data/sync.ts`.
  - [ ] Apply the migration when activation time comes.

### Ingredient and product data

- [x] Persist ingredient enrichment snapshots.
- [ ] Build product-level reference sync, not just ingredient-level sync.
- [ ] Add barcode/product enrichment flow using `Open Food Facts`.
- [ ] Add product image/license handling for `Open Food Facts` records.
- [ ] Add product packaging/unit metadata normalization.
- [ ] Add source-priority rules:
  - `USDA` for nutrition reference
  - `Open Food Facts` for barcode/product packaging
  - `openFDA` for recalls

### Files

- [lib/public-data/usda-fooddata.ts](C:/Users/david/Documents/CFv1/lib/public-data/usda-fooddata.ts)
- [lib/public-data/openfoodfacts.ts](C:/Users/david/Documents/CFv1/lib/public-data/openfoodfacts.ts)
- [lib/public-data/openfda-food.ts](C:/Users/david/Documents/CFv1/lib/public-data/openfda-food.ts)
- [lib/public-data/store.ts](C:/Users/david/Documents/CFv1/lib/public-data/store.ts)
- [lib/public-data/sync.ts](C:/Users/david/Documents/CFv1/lib/public-data/sync.ts)
- `app/api/cron/public-data-products/route.ts` (new)

### Market/price intelligence

- [ ] Add USDA Market News adapter for produce/meat/commodity price references.
- [ ] Create snapshot storage for market price benchmarks by product + region + date.
- [ ] Map ingredients to benchmark categories so costing can compare local prices vs public references.
- [ ] Show “market reference vs your price” deltas in ingredient/costing flows.

### Files

- `lib/public-data/usda-market-news.ts` (new)
- `app/api/cron/public-data-market-prices/route.ts` (new)
- `lib/ingredients/pricing.ts`
- `lib/costing/cascade-engine.ts`
- `supabase/migrations/new_public_market_price_snapshots.sql` (new)

### Geography data

- [x] Add Census geocoder usage.
- [ ] Persist normalized geography for more entities, not only current write paths.
- [ ] Add county/FIPS/state normalization where useful.
- [ ] Add location snapshot reuse for public directory queries and city pages.
- [ ] Add fallback geocoder source logging for `Geocodio` and `Nominatim`.

### Files

- [lib/public-data/census-geocoder.ts](C:/Users/david/Documents/CFv1/lib/public-data/census-geocoder.ts)
- [lib/public-data/location-normalization.ts](C:/Users/david/Documents/CFv1/lib/public-data/location-normalization.ts)
- [lib/events/geocoding-actions.ts](C:/Users/david/Documents/CFv1/lib/events/geocoding-actions.ts)
- [lib/food-truck/location-actions.ts](C:/Users/david/Documents/CFv1/lib/food-truck/location-actions.ts)
- [lib/partners/actions.ts](C:/Users/david/Documents/CFv1/lib/partners/actions.ts)
- `lib/directory/actions.ts`

## Phase 2: Finish Product Wiring

### Ingredient and recipe surfaces

- [~] Use public-data enrichment in ingredient CRUD.
- [ ] Use stored ingredient references in nutritional calculator flows.
- [ ] Use product references in inventory/purchase-order flows.
- [ ] Surface recall flags where chefs actually work:
  - recipes
  - ingredients
  - inventory
  - purchase orders
- [ ] Surface allergen provenance and last-updated timestamp in ingredient detail views.

### Files

- [lib/recipes/actions.ts](C:/Users/david/Documents/CFv1/lib/recipes/actions.ts)
- `lib/recipes/nutritional-calculator-actions.ts`
- `lib/inventory/purchase-order-actions.ts`
- `lib/procurement/actions.ts`
- `app/(chef)/culinary/ingredients/[id]/page.tsx` (new or existing detail surface)

### Seasonality

- [~] Improve seasonality from raw guesses to maintained references.
- [ ] Replace remaining static seasonality assumptions with region-aware reference lookups.
- [ ] Add region/state-aware seasonality where geography exists.
- [ ] Optionally combine USDA market signals with seasonality confidence.
- [ ] Show freshness/source details on the seasonal availability page.

### Files

- [app/(chef)/culinary/ingredients/seasonal-availability/page.tsx](C:/Users/david/Documents/CFv1/app/(chef)/culinary/ingredients/seasonal-availability/page.tsx)
- [lib/public-data/seasonality.ts](C:/Users/david/Documents/CFv1/lib/public-data/seasonality.ts)
- `lib/public-data/seasonality-regional.ts` (new)

### Weather and event risk

- [~] Persist weather-risk snapshots.
- [ ] Use weather snapshots in more than the food-truck module.
- [ ] Add event-level risk badges for outdoor/private events using event coordinates.
- [ ] Add risk reasons to event/readiness views.
- [ ] Add stale-data fallback messaging when weather snapshots are old.

### Files

- [lib/public-data/weather-risk.ts](C:/Users/david/Documents/CFv1/lib/public-data/weather-risk.ts)
- [lib/food-truck/weather-demand-actions.ts](C:/Users/david/Documents/CFv1/lib/food-truck/weather-demand-actions.ts)
- [components/food-truck/weather-demand.tsx](C:/Users/david/Documents/CFv1/components/food-truck/weather-demand.tsx)
- `components/events/event-risk-badge.tsx` (new)
- `app/(chef)/events/[id]/page.tsx`

### Directory and search

- [~] Normalize geography in the public chef directory.
- [ ] Use normalized location references in directory filtering, not just free-text states.
- [ ] Add city/ZIP/county-aware coverage pages.
- [ ] Add public SEO pages powered by normalized geography:
  - `/chefs/[state]`
  - `/chefs/[state]/[city]`
- [ ] Add “best for this area” or “serves these cities” panels from normalized partner and chef coverage.

### Files

- [app/(public)/chefs/page.tsx](C:/Users/david/Documents/CFv1/app/(public)/chefs/page.tsx)
- `app/(public)/chefs/[state]/page.tsx` (new)
- `app/(public)/chefs/[state]/[city]/page.tsx` (new)
- `lib/directory/actions.ts`
- `lib/public-data/store.ts`

## Phase 3: Public Assets

### Asset ingestion

- [ ] Add openly licensed editorial/marketing image ingestion pipeline.
- [ ] Support `Openverse`, `Wikimedia Commons`, `Pexels`, and `Unsplash` with explicit source labels.
- [ ] Track asset license, attribution text, source URL, photographer/creator, and usage restrictions.
- [ ] Add storage table for public media assets.
- [ ] Add “approved for use” workflow before assets appear on public pages.

### Files

- `lib/public-assets/openverse.ts` (new)
- `lib/public-assets/wikimedia.ts` (new)
- `lib/public-assets/pexels.ts` (new)
- `lib/public-assets/unsplash.ts` (new)
- `lib/public-assets/store.ts` (new)
- `supabase/migrations/new_public_media_assets.sql` (new)
- `app/api/cron/public-media-refresh/route.ts` (new)

### Product usage of public assets

- [ ] Replace generic/placeholder marketing art with approved public assets where brand-appropriate.
- [ ] Add public-asset slots to city pages, ingredient pages, and editorial surfaces.
- [ ] Never use public-asset ingestion for fake testimonials or fake customer proof.

### Files

- `app/(public)/page.tsx`
- `app/(public)/chefs/page.tsx`
- `app/(public)/chefs/[state]/[city]/page.tsx`
- `components/marketing/*`

## Phase 4: Admin Controls and Overrides

- [~] Add public-data health dashboard.
- [ ] Add manual refresh buttons by domain:
  - ingredients
  - products
  - locations
  - weather
  - recalls
- [ ] Add bad-match override tools.
- [ ] Add merge/unlink controls for public product references.
- [ ] Add stale-record cleanup tools.
- [ ] Add asset approval/rejection UI with attribution preview.

### Files

- [app/(admin)/admin/system/public-data/page.tsx](C:/Users/david/Documents/CFv1/app/(admin)/admin/system/public-data/page.tsx)
- [lib/admin/public-data.ts](C:/Users/david/Documents/CFv1/lib/admin/public-data.ts)
- `app/(admin)/admin/system/public-data/actions.ts` (new)
- `components/admin/public-data/*` (new)

## Phase 5: QA and Hardening

- [x] Add initial unit coverage for public-data store helpers.
- [ ] Add unit tests for product sync and market-price adapters.
- [ ] Add integration tests for:
  - ingredient refresh cron
  - recall snapshot cron
  - weather snapshot cron
  - directory using normalized location data
- [ ] Add failure-mode tests for missing API keys and upstream outages.
- [ ] Add migration verification coverage for new tables.
- [ ] Add analytics around enrichment coverage and stale-data rates.

### Files

- [tests/unit/public-data.store.test.ts](C:/Users/david/Documents/CFv1/tests/unit/public-data.store.test.ts)
- `tests/unit/public-data.products.test.ts` (new)
- `tests/integration/public-data-crons.test.ts` (new)
- `tests/e2e/public-directory-location.spec.ts` (new)

## Exact remaining build checklist

- [ ] Product sync cron for `Open Food Facts`.
- [ ] Market price sync cron for USDA Market News.
- [ ] Event risk badges on chef event pages.
- [ ] Ingredient detail UI with public-data provenance.
- [ ] Recall warnings in ingredient/inventory/procurement flows.
- [ ] Region-aware seasonality, not just generic produce seasonality.
- [ ] Directory pages by normalized city/state.
- [ ] Public media asset ingestion and approval flow.
- [ ] Admin refresh/override actions.
- [ ] Test coverage for all new crons and adapter failure paths.

## Definition of done

- [ ] Ingredients show real public-data enrichment with source and freshness.
- [ ] Product/barcode records can be enriched from public sources.
- [ ] Weather and recall data are stored and reused across the app.
- [ ] Directory/search pages are geography-normalized, not loose free text.
- [ ] Public assets can be ingested and used with license/attribution tracking.
- [ ] Admins can inspect, refresh, and override public-data matches.
- [ ] No important public-data feature depends on closed-platform scraping.

## Not part of this TODO right now

- [ ] Commit the work
- [ ] Deploy the work
- [ ] Run the migration in production

Those are activation steps later. This TODO is only for finishing the build scope.
