# Spec: OpenClaw Scraper Enrichment (Images, Stock, Location Granularity, New Sources)

> **Status:** in-progress (Phases 1, 2, 4, 5a, 5b complete. Phase 3, 5d, 5e, 5g, 5h remaining.)
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (12+ files on Pi)
> **Created:** 2026-03-29
> **Built by:** Claude Code session 2026-03-29
> **Research:** `docs/research/openclaw-every-backdoor-recon.md`

---

## What This Does (Plain English)

Upgrades the OpenClaw price-intel scrapers on the Raspberry Pi to capture three critical missing data points: product image URLs, real-time stock/availability status, and store-location-level granularity. After this is built, every item in the catalog can show a product photo, display whether it's currently in stock, and be filtered by specific store location (e.g., "Market Basket Haverhill" vs "Market Basket Lowell") instead of just chain name.

---

## Why It Matters

The catalog is unusable as a real shopping tool without images (chefs need to see what they're buying), stock status (showing everything as "available" is a lie), and location awareness (chefs shop at specific stores, not chains). These three gaps are the difference between a developer's database and a chef's shopping experience.

---

## Scope: Pi-Side Only (with one sync exception)

This spec covers changes to the OpenClaw price-intel codebase on the Raspberry Pi (`~/openclaw-prices/`). The one exception: the sync pipeline (`sync-to-chefflow.mjs` and `sync-api.mjs`) must be updated to pass through the new columns so ChefFlow can consume them. The ChefFlow catalog UI itself is a separate spec (`catalog-ux-overhaul`).

---

## Completed (Deployed 2026-03-29)

Everything below is live on Pi. Do not rebuild.

### Phase 1: Image URL Capture - DONE

**Schema deployed:**

- `image_url TEXT DEFAULT NULL` added to `current_prices`
- `location_id TEXT DEFAULT NULL` added to `current_prices`
- `off_image_url`, `off_barcode`, `off_nutrition_json` added to `canonical_ingredients`
- All via migration in `db.mjs` `migrateSchema()` function

**`upsertPrice()` updated:**

- Accepts `imageUrl` parameter
- INSERT includes `image_url` column
- UPDATE uses `image_url = COALESCE(?, image_url)` (preserves existing if new value is null)

**Scrapers patched for image capture:**

| Scraper                      | Image source                                                                                   | Status                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- |
| `scraper-instacart-bulk.mjs` | `obj.imageUrl`, `obj.image`, `obj.thumbnailUrl`, `viewSection.itemImage.url` from GraphQL walk | Done                                   |
| `scraper-walmart.mjs`        | `item.imageInfo.thumbnailUrl` or `item.imageInfo.url` from `__NEXT_DATA__` SSR JSON            | Done                                   |
| `scraper-stopsandshop.mjs`   | `img` element `src` from Puppeteer product card                                                | Done, `imageUrl` passed to upsertPrice |
| `scraper-target.mjs`         | Not yet patched (Redsky API has image URLs, needs extraction)                                  | TODO                                   |
| `scraper-flipp.mjs`          | Not yet patched (flyer clipping images available)                                              | TODO                                   |

**Image storage strategy:** URLs only (not downloaded images). CDN-hosted images keep the Pi database small. If CDN URLs expire, the UI shows a fallback placeholder. If expiry becomes a problem, a future phase can download and cache locally.

**Image fallback chain (for ChefFlow UI to implement):**

1. `current_prices.image_url` (store-specific product photo from scraper)
2. `canonical_ingredients.off_image_url` (generic product photo from Open Food Facts)
3. Placeholder image

### Phase 4: Expanded Search Terms - DONE

- Created `config/search-terms.json` with 499 terms across 15 categories (produce_fruit, produce_vegetable, fresh_herbs, meat_poultry, seafood, dairy_eggs, pantry_grain, pantry_canned, oil_vinegar_sauce, spices, baking, nuts_dried, frozen, beverage, tofu_plant)
- `scraper-instacart-bulk.mjs` patched: `loadSearchTerms()` reads from config file at startup, falls back to 33-term hardcoded array if file missing
- Confirmed: scraper loads all 499 terms on startup

### Phase 5a: Open Food Facts Enricher - DONE

- Created `services/enricher-openfoodfacts.mjs`
- Searches OFF by ingredient name via `/cgi/search.pl` endpoint
- Stores: `off_image_url`, `off_barcode`, `off_nutrition_json` (energy_kcal, fat, carbs, protein, fiber, sodium per 100g)
- Rate limited to ~85 req/min (700ms delay between requests)
- Stops after 10 consecutive errors (resilient to temporary API outages)
- Marks checked-but-not-found ingredients with `off_image_url = 'none'`

**Known issue: OFF returns 503 as of 2026-03-29.** The enricher handles this gracefully (stops after 10 errors). It will succeed on the next cron run when OFF recovers. However, there's a bug: if OFF is down for the entire run, all 11K ingredients get marked `'none'` and are never re-checked. See Phase 5a-fix below.

### Phase 5b: Instacart Expansion - DONE

Shaw's was already in the STORES array. Hannaford was already in STORES but not scheduled in cron. Both now resolved:

- Shaw's: in even-day Instacart rotation
- Hannaford: added to odd-day Instacart rotation
- `--max` increased from 300 to 2000 per store
- Search terms: 80 -> 499 (via Phase 4)

### Crontab v4 - DEPLOYED

20 active cron jobs. Key changes from v3:

- Instacart `--max=2000` (was 300)
- Hannaford added to odd-day Instacart rotation
- `scraper-walmart.mjs` added daily at 6:30 AM (existed but was never scheduled)
- `scraper-stopsandshop.mjs` added Tue/Thu/Sat at 7 AM (existed but was never scheduled)
- `enricher-openfoodfacts.mjs` added Sundays at 12 PM

---

## Remaining Work

### Phase 5a-fix: OFF Enricher Retry Logic (quick fix)

**Problem:** The enricher marks items `off_image_url = 'none'` when not found, which is also what happens when OFF is unreachable (503). If OFF is down for a full run, thousands of ingredients get permanently marked as "no match" when they were never actually checked.

**Fix:**

- Distinguish between "OFF confirmed no results" (`'none'`) and "OFF was unreachable" (leave `NULL`)
- Only set `'none'` when the API returned 200 with zero matching products
- On non-200 responses or network errors, skip the ingredient (leave `NULL` for retry next week)
- The current `markChecked` statement already handles the `'none'` case; just don't call it on API failures

**Files:** `services/enricher-openfoodfacts.mjs` (lines 106-114, the error handling block)

### Phase 2: Stock/Availability Capture

**Schema:** The `in_stock` column already exists on `current_prices` (0=out, 1=in). No schema change needed. Currently defaults to 1 everywhere (a lie).

**Scraper changes:**

| Scraper                      | How to detect stock                                                                                                                                        | Effort |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `scraper-instacart-bulk.mjs` | GraphQL: check `available`, `in_stock`, `out_of_stock` fields in the JSON walk. Puppeteer: check for "Out of stock" badge or disabled "Add to cart" button | Medium |
| `scraper-walmart.mjs`        | `__NEXT_DATA__` SSR JSON includes `availabilityStatusV2` or `availabilityStatus` on items. Extract and map to boolean                                      | Low    |
| `scraper-stopsandshop.mjs`   | Puppeteer: check for "Out of Stock" badge or "Unavailable" text on product card                                                                            | Low    |
| `scraper-target.mjs`         | Redsky API includes `available_to_promise_quantity` field. `> 0` = in stock                                                                                | Low    |
| `scraper-flipp.mjs`          | Flyer items are inherently "available this week." Set `inStock: 1` for active flyers. When flyer expires, don't set to 0 (let staleness rule handle it)    | Skip   |
| Government scrapers          | N/A (regional averages, no stock concept). Leave default                                                                                                   | Skip   |

**Staleness rule (add to `watchdog.mjs`):**

- If `last_confirmed_at` is older than 7 days AND source is a direct scraper (not government), set `in_stock = 0`
- Rationale: if we haven't confirmed an item exists in over a week, we should not claim it's available
- The next successful scrape resets it to 1
- Government/wholesale sources exempt (they report monthly/quarterly)

### Phase 3: Store-Location Granularity

**Schema:** `location_id` column already exists on `current_prices` (added in Phase 1 migration). Needs to be populated.

**The hard part (Instacart):** Instacart determines store location via cookies and geolocation, not URL parameters. Switching locations requires:

1. Set a new delivery address in the Instacart session (Puppeteer interaction)
2. Re-scrape with the new location context
3. Each location = a new Puppeteer session = ~2-5 min setup overhead per location

This means 3 locations x 4 stores = 12 sessions per odd/even day, significantly increasing scrape time. Current single-location runs take ~30-60 min per rotation. Multi-location could push to 2-3 hours.

**Mitigation:** Start with just 2 locations (Haverhill + one other in Merrimack Valley). Expand only after confirming time/load is acceptable.

**Location registry:** Create `config/locations.json`:

```json
{
  "regions": [
    {
      "name": "Merrimack Valley",
      "zip_codes": ["01835", "01830", "01844"],
      "priority": 1
    },
    {
      "name": "Greater Boston",
      "zip_codes": ["02101", "02134"],
      "priority": 2
    },
    {
      "name": "Southern NH",
      "zip_codes": ["03103", "03060"],
      "priority": 2
    }
  ],
  "stores": {
    "market-basket": {
      "chain": "Market Basket",
      "instacart_slug": "market-basket",
      "locations": [
        { "name": "Market Basket Haverhill", "zip": "01835", "location_id": "mb-haverhill" },
        { "name": "Market Basket Methuen", "zip": "01844", "location_id": "mb-methuen" }
      ]
    }
  }
}
```

**Scraper changes:**

- `scraper-instacart-bulk.mjs`: Add `--location=01835` CLI flag. For each store, set delivery address to the target zip before scraping. Tag all prices with `location_id`. Register separate `source_registry` entries per location (e.g., "market-basket-haverhill-instacart").
- `scraper-flipp.mjs`: Cycle through zip codes from `locations.json`. Register sources per location.
- `scraper-walmart.mjs`: Already store-specific (store #2153 Methuen). Add `location_id` to upsertPrice call using existing store info.
- `scraper-target.mjs`: Already store-specific (#1290 Methuen). Add `location_id` similarly.

**Sync API changes:**

- `/api/ingredients?location=haverhill` returns prices for that location
- `/api/ingredients?store=market-basket&location=haverhill` combined filter
- No location filter = all locations aggregated, cheapest price shown (backward compatible)

### Phase 5d: Target Multi-Store Expansion

Update `scraper-target.mjs`:

- Currently hard-coded to store #1290 (Methuen)
- Add store IDs for: Salem NH, Tewksbury, North Andover, Nashua NH
- Use Target's store locator API to discover IDs by zip: `https://redsky.target.com/redsky_aggregations/v1/web/nearby_stores_v1?zip={zip}`
- Same Redsky API, loop through stores
- Tag with `location_id`
- Estimated gain: +500-1K items (mostly location-specific availability data)

### Phase 5e: Trader Joe's Scraper (NEW)

New script: `scraper-traderjoes.mjs`

- TJ's website (`traderjoes.com/home/products/category/...`) serves product catalog
- 403s basic HTTP requests; needs Puppeteer with stealth plugin
- Reference: github.com/jackgisel/traderjoeapi for endpoint patterns
- Capture: product name, price, SKU, image URL, category
- TJ's doesn't do store-specific pricing (uniform national pricing), so one run covers all NE locations
- Run weekly (TJ's inventory is stable, rotates seasonally)
- Schedule: Wednesday 8 AM (light day in current cron)
- Estimated gain: +1K-2K exclusive TJ's items not available elsewhere

### Phase 5g: Open Grocery Database Import (UPC cross-referencing)

One-time script: `import-open-grocery-db.mjs`

- Download from grocery.com/open-grocery-database-project/ (7MB XLS)
- 100K+ UPC-to-product mappings
- Create `upc_registry` table: `upc TEXT PRIMARY KEY, brand TEXT, product_name TEXT, category TEXT`
- Cross-reference with existing products by UPC (from OFF barcodes, Walmart, Target) to deduplicate across stores
- Enables: "this $3.99 item at Walmart is the same as this $4.29 item at Stop & Shop"

### Phase 5h: USDA FoodData Central Enrichment

New script: `enricher-usda-fdc.mjs`

- API: `https://api.nal.usda.gov/fdc/v1/` (free, API key required, sign up at fdc.nal.usda.gov)
- 400K+ branded food products with UPCs, detailed nutrition, ingredient lists
- Cross-reference by UPC or fuzzy name match against `canonical_ingredients`
- Store nutrition data in `off_nutrition_json` (supplement/replace OFF data where USDA is more complete)
- Run monthly (USDA data updates quarterly)

---

## Sync Pipeline Update (Required for ChefFlow to consume new data)

The nightly sync (`sync-to-chefflow.mjs`) and the sync API (`sync-api.mjs` on port 8081) need to pass through the new columns. Without this, ChefFlow can't display images, stock status, or location data even though the Pi has it.

**`sync-api.mjs` changes:**

- `/api/ingredients` response must include `image_url`, `in_stock`, `location_id` from `current_prices`
- `/api/ingredients` response must include `off_image_url`, `off_barcode`, `off_nutrition_json` from `canonical_ingredients`
- Add location filter support: `?location=haverhill`
- Add stock filter: `?in_stock=1` (default: show all, let ChefFlow decide display)

**`sync-to-chefflow.mjs` changes:**

- Include new columns in the nightly sync payload
- ChefFlow's `/api/cron/price-sync` endpoint must accept and store them (this is a ChefFlow-side change, noted here for completeness)

---

## Data Quality Safeguards

### Image URL Validation

- Before storing an image URL, verify it starts with `https://` and is from a known CDN domain (instacart, walmart, target, openfoodfacts, etc.)
- Reject data: URIs, blob: URIs, SVG placeholders, and tracking pixels (< 100 bytes)
- If a stored URL returns 404 on consecutive scraper runs, clear it

### Stock Status Accuracy

- Never set `in_stock = 0` based on a single failed scrape (could be transient)
- Require 2 consecutive "not found" scrapes before marking out of stock
- Government/wholesale sources never get stock status changes (they report averages)

### Rollback Plan

- If a scraper starts returning garbage data (wrong images, corrupted prices), the watchdog should detect anomalous change rates (>50% of a source's prices changing in one run = suspicious)
- Existing anomaly detection in `aggregator.mjs` already flags unusual price swings
- Emergency: disable a scraper by commenting it out of crontab, not by deleting the script

---

## Verification Steps

### Already Verified (2026-03-29)

1. All 5 new columns exist in SQLite schema (confirmed via PRAGMA table_info)
2. `scraper-instacart-bulk.mjs` loads 499 search terms from config (confirmed via import test)
3. All modified scrapers pass `node --check` syntax validation
4. Crontab v4 installed with 20 active jobs

### Needs Verification (next scraper run)

1. Run Instacart bulk scraper manually for one store (`--max=10`), verify `image_url` is populated on new price records
2. Run Walmart scraper manually, verify `image_url` from `__NEXT_DATA__` is captured
3. Run OFF enricher manually when API recovers from 503, verify `off_image_url` populated on canonical_ingredients
4. Verify sync-api returns new columns in API responses
5. Check Pi load after a full expanded scraper run stays under 0.5

### After Phase 2

6. Verify `in_stock = 0` for known out-of-stock items (check against Instacart website)
7. Run `watchdog.mjs`, verify staleness rule marks old items out of stock

### After Phase 3

8. Verify location-specific source entries appear in `source_registry`
9. Verify same product at two locations has two separate price records with different `location_id`

---

## Current Crontab v4 (Live on Pi)

```
# OpenClaw Price Intelligence - Scraper Schedule v4
# Updated 2026-03-29

# Government data - Weekly Monday 2 AM
0 2 * * 1     scraper-government.mjs

# Flipp API - Daily 3 AM
0 3 * * *     scraper-flipp.mjs

# Cross-match round 1 - Daily 4 AM
0 4 * * *     cross-match.mjs

# Whole Foods - Daily 5 AM
0 5 * * *     scraper-wholefoodsapfresh.mjs

# Target Redsky - Daily 6 AM
0 6 * * *     scraper-target.mjs

# Walmart HTTP - Daily 6:30 AM
30 6 * * *    scraper-walmart.mjs

# Stop & Shop + Shaws direct - Tue/Thu/Sat 7 AM
0 7 * * 2,4,6 scraper-stopsandshop.mjs

# Instacart Bulk - Odd days: Market Basket + Hannaford + Aldi + Stop & Shop (max=2000)
30 7 1-31/2 * * scraper-instacart-bulk.mjs --stores=market-basket,hannaford,aldi,stop-and-shop --max=2000

# Instacart Bulk - Even days: Shaws + Costco + BJs + Whole Foods (max=2000)
30 7 2-30/2 * * scraper-instacart-bulk.mjs --stores=shaws,costco,bjs-wholesale-club,whole-foods --max=2000

# Cross-match round 2 - Daily 9 AM
0 9 * * *     cross-match.mjs

# Wholesale - Wednesday 9:30 AM
30 9 * * 3    scraper-wholesale.mjs

# Aggregator - Daily 10 AM
0 10 * * *    aggregator.mjs

# OFF Enrichment - Sunday 12 PM
0 12 * * 0    enricher-openfoodfacts.mjs

# Watchdog - Every 15 min
*/15 * * * *  watchdog.mjs

# Receipt processing - Every 30 min
*/30 * * * *  receipt-processor.mjs batch

# ChefFlow sync - 11 PM
0 23 * * *    sync-to-chefflow.mjs

# Log rotation - Sunday midnight
0 0 * * 0     log rotation
```

### Future Cron Additions (after remaining phases built)

| Phase | Script                   | Schedule           | Notes                    |
| ----- | ------------------------ | ------------------ | ------------------------ |
| 5e    | `scraper-traderjoes.mjs` | Wednesday 8 AM     | Weekly, stable inventory |
| 5h    | `enricher-usda-fdc.mjs`  | 1st of month, 2 AM | Monthly, enrichment only |

---

## Out of Scope

- ChefFlow catalog UI changes (separate spec: `catalog-ux-overhaul`)
- Wholesale distributor APIs (requires paid membership accounts)
- Specialty/ethnic store scrapers (requires physical store visits for API recon)
- Image downloading/caching (URLs only for now)
- Receipt scanning improvements (existing system works, separate scope)
- Anomaly backlog cleanup (23K unacked anomalies, separate task)
- Costco direct scrape (Akamai bot protection, extremely high failure risk)
- Market Basket direct scrape (no e-commerce site, Instacart only)

---

## Notes for Builder Agent

- All work is on the Pi via SSH (`ssh pi`). The vault snapshot on F: drive is reference only.
- Test scrapers manually before updating cron: `cd ~/openclaw-prices && node services/scraper-instacart-bulk.mjs --stores=market-basket --max=10`
- The Pi has 78GB free storage and 6.3GB available RAM. No resource constraints.
- Current Pi load is 0.07. We have massive headroom.
- `db.mjs` is the single source of truth for schema and upsert logic. All column migrations live in `migrateSchema()`.
- After all changes, run a vault snapshot: `bash F:/OpenClaw-Vault/swap.sh snapshot`
- Do NOT modify cron jobs without running the new scrapers manually first to confirm they work.
- Read `docs/research/openclaw-every-backdoor-recon.md` for full context on every data source.
- The Walmart API (developer.walmartlabs.com) was in the original spec but is NOT needed. The existing `scraper-walmart.mjs` uses HTTP SSR parsing and works. Only pursue the official API if the HTML scraper gets blocked.
- For Trader Joe's: reference open-source repos (github.com/jackgisel/traderjoeapi). TJ's blocks non-browser requests. Use Puppeteer with stealth plugin.
- The `scraper-instacart.mjs` (original, non-bulk) still exists but is superseded by `scraper-instacart-bulk.mjs`. Don't patch the old one.
