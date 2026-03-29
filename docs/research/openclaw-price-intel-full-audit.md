# Research: OpenClaw Price Intelligence - Full System Audit

> **Date:** 2026-03-29
> **Question:** What is the current state of OpenClaw's price intelligence system, what are the gaps, and what needs to happen to achieve the vision of a complete, accurate, chef-friendly ingredient catalog for all of New England?
> **Status:** complete

## Summary

OpenClaw's price-intel cartridge is a functional 43-source scraping system producing ~11K ingredients and ~8.7K priced items from New England stores. The architecture is sound (SQLite on Pi, nightly sync to ChefFlow, real-time API for browsing). However, it covers roughly 25-35% of actual purchasable inventory, has no product images, no real stock/availability data, and operates at chain-level only (not store-location level). The ChefFlow catalog UI is feature-rich but filters like a developer tool, not a chef's shopping experience. The Pi is massively underutilized (0.07 load average).

## Detailed Findings

### 1. Database Schema and Architecture

**Pi-side (SQLite: prices.db, ~24MB)**

- `source_registry` - 43 sources with full address/geo columns (lat, lon, city, state, zip) but geo data is sparse: `F:\OpenClaw-Vault\profiles\price-intel\snapshot\project\lib\db.mjs:36-64`
- `canonical_ingredients` - 11,084 ingredients with category and standard_unit: `db.mjs:67-73`
- `ingredient_variants` - variant tracking (e.g., organic vs conventional): `db.mjs:76-82`
- `current_prices` - 8,745 priced items with `in_stock` column (always 1, never populated): `db.mjs:85-109`
- `price_changes` - 25,339 historical price change records: `db.mjs:116-128`
- `normalization_map` - raw name to canonical ingredient mapping: `db.mjs:134-143`
- `price_monthly_summary` - monthly rollups (avg, min, max)
- `price_trends` - 7d/30d/90d averages
- `price_anomalies` - 23,118 unacknowledged anomalies (spikes/drops >25%)

**ChefFlow-side (PostgreSQL)**

- `ingredients` table has `last_price_cents`, `last_price_source`, `last_price_store`, `last_price_confidence` columns synced from Pi
- `ingredient_price_history` table stores historical prices with source='openclaw'
- `shopping_carts` / `shopping_cart_items` tables exist but are disconnected from events

### 2. Scraper Coverage (43 Sources, 8 Methods)

| Scraper                    | Sources                                                                                           | Method                       | Coverage Quality                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ |
| Flipp API                  | 17 stores (Market Basket, Shaw's, Stop & Shop, Aldi, Wegmans, Walmart, Target, Costco, CVS, etc.) | Flyer/sale API               | **Flyer items only** - not full catalog. Good for sale prices, useless for "is X in stock" |
| Instacart (original)       | 5 stores (Hannaford, Market Basket, Aldi, Costco, BJ's)                                           | Puppeteer browsing           | Category pages, ~200-500 items per store per run                                           |
| Instacart Bulk             | 8 stores (adds Stop & Shop, Shaw's, Whole Foods)                                                  | GraphQL + Puppeteer fallback | 80 search terms, max 500 items/store. Best source we have                                  |
| Hannaford Direct           | 1                                                                                                 | JS-rendered scrape           | Direct website, decent coverage                                                            |
| Target Redsky API          | 1 (Methuen #1290)                                                                                 | REST API                     | Good structured data, single location only                                                 |
| Government (BLS/FRED/USDA) | 3                                                                                                 | Public APIs                  | Regional averages, monthly updates. Baseline only                                          |
| Wholesale                  | Limited                                                                                           | Flipp-based                  | Flyer prices only for Restaurant Depot, etc.                                               |
| Receipt Processor          | N/A                                                                                               | OCR on uploaded receipts     | Highest accuracy but requires manual input                                                 |

**Critical coverage gaps:**

- Market Basket: flyer + limited Instacart only (~20-30% of inventory)
- Specialty/ethnic stores: zero (H-Mart, Brazilian markets, Italian specialty)
- Farmers markets / local farms: zero
- Restaurant supply (Sysco, US Foods): zero (require dealer accounts)
- Trader Joe's: zero (no public API, not on Instacart)
- Costco: flyer only (Instacart has limited Costco catalog)

### 3. Store-Location Granularity

**Current state: Chain-level only.**

The `source_registry` schema has address, city, state, zip, lat, lon columns (`db.mjs:41-46`) but:

- Flipp scraper uses single postal code 01835 for ALL queries: `scraper-flipp.mjs`
- Instacart scrapers set geolocation to Haverhill (42.7762, -71.0773): `scraper-instacart-bulk.mjs`
- Target hard-coded to store #1290 Methuen: `scraper-target.mjs`
- `current_prices` has no `location_id` column - prices are per source, not per store location

**What's needed:** Each physical store location needs its own `source_registry` entry. Scrapers need to cycle through locations (different zip codes / store IDs) and tag prices to specific locations.

### 4. Product Images

**Current state: Zero image capture anywhere.**

No image URL column in any table. No image download logic in any scraper. The ChefFlow catalog UI has an image placeholder component with fallback but nothing feeds it.

Instacart product pages include image URLs. The Instacart scraper could capture `img[src]` during extraction with minimal code changes. Storage would be ~50-100KB per image, ~500MB-1GB for full catalog. Pi can handle this with external storage.

### 5. Stock/Availability

**Current state: Column exists, never populated.**

`current_prices.in_stock` defaults to 1 (in stock) in every scraper's upsert call. Instacart pages DO show stock status, but the scraper doesn't extract it.

### 6. ChefFlow Catalog UI

**Route:** `/culinary/price-catalog` -> `catalog-browser.tsx` (1,194 lines)

**What works well:**

- 3 view modes (table, grid, store-aisle)
- Price comparison bars in expanded rows
- Trend indicators (rising/falling)
- Shopping cart sidebar
- Infinite scroll with cursor pagination
- Keyboard navigation

**What feels developer-ish (per user feedback):**

- Store dropdown shows source names with tier badges, not friendly store names with logos
- Filtering by "Flipp" or crawler source is exposed - chef doesn't care HOW the data was scraped
- Confidence badges (instacart_adjusted, direct_scrape, government_baseline) are jargon
- No store-location filtering ("Market Basket Haverhill" vs "Market Basket Lowell")
- Category list is flat (14 items) - no hierarchy (Produce > Vegetables > Root vegetables)

**Missing features:**

- No event-to-cart integration (can't say "cost out Saturday's dinner")
- No persistent store preferences per chef
- No price alerts or watchlists
- "Add to My Pantry" button has no feedback (no toast/confirmation)
- Shopping carts are session-only, no auto-save
- No CSV/PDF export of shopping lists

### 7. Data Sync Pipeline

**Pi -> ChefFlow flow:**

1. Pi scrapers run on cron schedule (see crontab in profile)
2. `aggregator.mjs` runs at 10 AM daily - computes trends, anomalies, monthly summaries
3. `sync-to-chefflow.mjs` triggers at 11 PM - calls ChefFlow's `/api/cron/price-sync`
4. ChefFlow pulls enriched prices from Pi's sync-api (port 8081)
5. Matched prices written to `ingredient_price_history`, `ingredients.last_price_cents` updated

**Note:** The catalog browser queries the Pi directly in real-time for browsing. The nightly sync only updates the local `ingredients` table for recipe auto-costing.

### 8. Pi Resource Utilization

- **Load:** 0.07 (essentially idle between cron jobs)
- **Uptime:** 8 days
- **Services:** openclaw-sync-api, openclaw-receipt-processor (both running)
- **Docker:** 4 orphaned claw-swarm containers (now removed)
- **Cron:** 14 jobs (scrapers + processors + watchdog + sync + log rotation)
- **Headroom:** Massive. Could easily run 5-10x more scrapers, add image processing, increase frequency

### 9. Anomaly Backlog

23,118 unacknowledged price anomalies. The anomaly detection system flags price changes >25%, but nothing reviews or acts on them. This is noise that could become signal if surfaced properly (seasonal trends, pricing errors, opportunities).

## Gaps and Unknowns

1. **Market Basket full catalog** - No known public API or e-commerce platform. Cannot determine if an undocumented internal API exists without active probing (which may violate TOS). Receipt scanning is the most reliable path.
2. **Trader Joe's** - Similar situation. No public inventory system. Not on Instacart or any aggregator.
3. **Wholesale distributor APIs** (Sysco, US Foods) - Require authorized dealer accounts. Cannot determine API availability without an active account.
4. **Pi storage capacity** - Unknown. Need to check SD card / external storage size to plan for image storage.
5. **Instacart rate limiting** - The bulk scraper runs every other day with 500-item caps. Unknown how much we can increase before hitting blocks.
6. **Legal/TOS risk** - Scraping at higher volume or frequency could trigger anti-bot measures. No legal review done.

## Recommendations

### Immediate (Pi-side, no spec needed)

1. **Add image URL capture to Instacart scrapers** - Extract `img[src]` during product parsing, store URL in new `image_url` column on `current_prices`. Quick fix.
2. **Add stock status capture to Instacart scrapers** - Extract availability indicator, populate `in_stock` column. Quick fix.
3. **Increase Instacart search terms** - Currently 80 terms. Expand to 200+ to capture more of each store's catalog. Needs a spec.
4. **Clean up 23K anomaly backlog** - Add auto-acknowledge for anomalies older than 30 days, surface recent ones in ChefFlow admin.

### Short-term (needs specs)

5. **Store-location granularity** - Register multiple `source_registry` entries per chain (one per physical location). Cycle scrapers through zip codes. Needs a spec.
6. **ChefFlow catalog UX overhaul** - Redesign filtering to be store-first, location-aware, with friendly names and out-of-stock visual treatment. Needs a spec.
7. **Event-to-cart integration** - Link events/menus to catalog for automatic food costing. Needs a spec.
8. **Expand scraper coverage** - Add Trader Joe's (receipt-based), specialty stores, local farms (manual/community-sourced). Needs a spec.

### Long-term (needs discussion)

9. **Community-sourced pricing** - Let ChefFlow users contribute prices from receipts to fill gaps (especially for stores without APIs).
10. **Wholesale account integration** - If the developer has a Sysco/US Foods account, build an authenticated scraper.
11. **Regional expansion** - Support chefs outside Haverhill area with configurable regions.
