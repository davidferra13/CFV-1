# OpenClaw Data Pipeline

## Overview

OpenClaw is ChefFlow's price intelligence system running on a Raspberry Pi (10.0.0.177).
It maintains a comprehensive food catalog of ~9,270 items with live retail prices from 18+ local stores.

The ChefFlow codebase contains a local mirror of key OpenClaw files in `.openclaw-build/`.
The Pi has additional services not mirrored locally (see "Files on Pi" for the full list).

## Architecture

```text
Raspberry Pi (10.0.0.177, user: davidferra, SSH alias: pi)
  ├── SQLite database (WAL mode)
  │   ├── canonical_ingredients (9,270 items)
  │   ├── current_prices (1,014+ prices, growing daily)
  │   ├── price_changes (historical tracking)
  │   ├── price_trends (7d/30d/90d analytics)
  │   ├── price_monthly_summary (aggregated by aggregator.mjs)
  │   └── price_anomalies (spike/drop detection)
  ├── Scrapers (cron, various schedules)
  │   ├── scraper-flipp.mjs       (VACUUM mode - all 18 stores via Flipp API)
  │   ├── scraper-government.mjs  (BLS CPI + FRED wholesale indexes)
  │   ├── scraper-wholesale.mjs   (Restaurant Depot/Sysco/US Foods catalogs)
  │   ├── scraper-hannaford.mjs   (Puppeteer - hannaford.com)
  │   ├── scraper-stopsandshop.mjs (Puppeteer - S&S + Shaw's)
  │   ├── scraper-instacart.mjs   (Puppeteer - Market Basket via Instacart)
  │   ├── scraper-wholefoodsapfresh.mjs (Puppeteer - Amazon Fresh/WF)
  │   ├── scraper-flyers.mjs      (weekly sale flyer extraction)
  │   └── import-usda-csv.mjs     (one-time catalog import)
  ├── Processing
  │   ├── cross-match.mjs         (links Flipp auto-slugs to canonical entries)
  │   ├── aggregator.mjs          (trends, anomalies, monthly summaries)
  │   ├── receipt-processor.mjs   (Tesseract OCR, port 8082, systemd)
  │   └── watchdog.mjs            (health checks, auto-restart)
  ├── Sync API (port 8081, systemd)
  │   └── sync-api.mjs            (REST API with smart lookup)
  └── sync-to-chefflow.mjs        (triggers ChefFlow price sync at 11 PM)
```

## Data Sources

| Source                   | Type                    | Items       | Frequency          | Notes                        |
| ------------------------ | ----------------------- | ----------- | ------------------ | ---------------------------- |
| Flipp API                | Retail flyer prices     | ~1,300/week | Nightly 3 AM       | 18 local stores, VACUUM mode |
| USDA FoodData Central    | Food catalog            | 8,246 items | One-time import    | Foundation + SR Legacy       |
| Manual catalog           | Chef-focused items      | 785 items   | As needed          | Cuts, grades, specialties    |
| BLS/FRED                 | Government indexes      | 9 series    | Weekly Monday 2 AM | Northeast regional prices    |
| Hannaford                | Direct catalog scrape   | varies      | Not yet scheduled  | Puppeteer, JS-rendered       |
| Stop & Shop/Shaw's       | Direct catalog scrape   | varies      | Not yet scheduled  | Puppeteer, Ahold Delhaize    |
| Instacart                | Proxy for Market Basket | varies      | Not yet scheduled  | 15-20% markup adjusted       |
| Amazon Fresh/Whole Foods | Direct catalog scrape   | varies      | Not yet scheduled  | Location: Haverhill MA 01835 |
| Receipt scanning         | Tesseract OCR           | per receipt | On-demand + batch  | Highest confidence tier      |

## Stores Tracked (18 via Flipp + direct scrapers)

**Primary grocery:** Shaw's, Stop & Shop, ALDI, Big Y, Wegman's, Market Basket\*
**Big box:** Walmart, Target
**Wholesale:** Costco, Sam's Club, Restaurant Depot
**Pharmacy:** CVS, Walgreens
**Discount:** Family Dollar, Dollar General, Ocean State Job Lot
**Direct scrape targets (not yet scheduled):** Hannaford, Whole Foods, Amazon Fresh

\*Market Basket's Flipp flyer is image-based (0 structured items). Instacart proxy scraper and receipt scanning are the paths for this store.

## How It Works

### Flipp VACUUM Scraper

The Flipp scraper runs in "vacuum" mode: 302 search terms (full alphabet + food categories),
pagination up to 600 items per term, across all 18 merchants. Two-layer food filter:

1. Blacklist: rejects non-food items (cosmetics, electronics, furniture, pet products)
2. Whitelist: requires at least one food indicator (ingredients, brands, cooking terms)

Items matching keyword rules get canonical IDs (e.g., `chicken-breast-boneless-skinless`).
Unmatched food items get auto-generated slug IDs (e.g., `kraft-aioli`).

### Cross-Matcher (runs daily at 4 AM after Flipp)

The cross-matcher (`cross-match.mjs`) links Flipp-priced items stored under auto-generated slug IDs
back to proper canonical ingredient entries. 217 matching rules cover beef, poultry, pork, lamb,
seafood, dairy, produce, pantry, grains, frozen, beverages, snacks, deli, and baking.

**This must run after every Flipp scrape**, otherwise new items accumulate as orphaned auto-slugs
that the smart lookup and ChefFlow sync can't find.

### Smart Lookup

The smart lookup system (`lib/smart-lookup.mjs`) resolves natural-language queries like "chicken breast"
or "butter" to the correct canonical ingredient with price priority. Features:

- **Common aliases**: 250+ mappings (e.g., "butter" -> butter-unsalted, "milk" -> milk-whole, "eggs" -> eggs-large)
- **Price priority**: priced items always rank above unpriced catalog entries
- **Fuzzy matching**: exact match > starts-with > slug match > word boundary
- **API endpoint**: `GET /api/lookup?q=chicken+breast` on port 8081
- **Batch endpoint**: `POST /api/lookup/batch` with `{ items: [...] }`

**Lookup accuracy (2026-03-28 test)**: 78% of 74 common dinner items resolve to a priced ingredient
immediately. 100% found in catalog. Remaining 22% awaiting first Flipp flyer appearance.

### USDA Catalog

8,246 Foundation Foods and SR Legacy items from USDA FoodData Central provide the
comprehensive catalog. These are canonical food items (not branded products). The catalog
ensures we have entries for virtually every food ingredient. Prices fill in over time as
Flipp flyers cycle through items.

### Aggregator (runs daily at 10 AM)

Computes 7d/30d/90d price trends, flags anomalies (sudden spikes/drops), compresses old
price_changes into monthly summaries, and marks stale sources (no update in 30+ days).

### Receipt Processor (always running, port 8082)

Tesseract OCR-based receipt scanning. Runs as a systemd service (`openclaw-receipt-processor`).
Two modes: HTTP upload (`POST /upload` with multipart image) and file watcher on `~/openclaw-prices/data/receipts/`.
Receipt prices are the highest confidence tier (`exact_receipt`).

### Watchdog (runs every 15 min)

Monitors sync-api health, receipt-processor status, database integrity, disk space, scraper
freshness (via last_scraped_at), and database growth. Auto-restarts services via systemd when down.

### ChefFlow Sync (Smart Lookup v2)

At 11 PM nightly (after scraping), `sync-to-chefflow.mjs` calls the ChefFlow
`/api/cron/price-sync` endpoint with a Bearer token. ChefFlow then:

1. Loads all its ingredient names from the database
2. Sends them in batches to OpenClaw's `POST /api/lookup/batch` endpoint
3. Smart lookup resolves each name using 250+ aliases and price priority
4. Updates `ingredients.last_price_cents` for each match
5. Filters out wholesale bulk prices (over $50/each) to avoid distortion

**ChefFlow-side code:** `lib/openclaw/sync.ts` (syncCore function)
**Cron endpoint:** `app/api/cron/price-sync/route.ts`
**Auth:** Bearer token verified by `lib/auth/cron-auth.ts`

## Deployment

### How to deploy changes to the Pi

```bash
# SSH alias "pi" is configured in ~/.ssh/config
# Pi user: davidferra, path: ~/openclaw-prices/

# Deploy a single file
scp ".openclaw-build/lib/smart-lookup.mjs" pi:~/openclaw-prices/lib/smart-lookup.mjs

# Deploy a service
scp ".openclaw-build/services/cross-match.mjs" pi:~/openclaw-prices/services/cross-match.mjs

# Restart sync-api after deploying changes to it
ssh pi "pkill -f 'node.*sync-api'; sleep 1; cd ~/openclaw-prices && nohup node services/sync-api.mjs >> logs/sync-api.log 2>&1 &"
```

**Important:** The sync-api currently runs via manual nohup (not systemd). If the Pi reboots,
it must be restarted manually. Systemd .service files exist in `~/openclaw-prices/systemd/`
but are not yet installed. The receipt-processor IS managed by systemd.

### Environment variables (Pi: ~/openclaw-prices/config/.env)

| Variable       | Purpose                                                   |
| -------------- | --------------------------------------------------------- |
| `BLS_API_KEY`  | Bureau of Labor Statistics API (free, 500 queries/day)    |
| `FRED_API_KEY` | Federal Reserve Economic Data API (free, unlimited)       |
| `USDA_API_KEY` | USDA Economic Research Service API (free)                 |
| `CHEFFLOW_URL` | ChefFlow server URL (default: `http://10.0.0.100:3100`)   |
| `CRON_SECRET`  | Bearer token for ChefFlow's /api/cron/price-sync endpoint |

## Known Issues (2026-03-28)

**Price unit inconsistency:** 904 prices stored as "each" vs 108 as "lb". Most items hit the
"each" default in `detectPackageSize()`. A $3.99/each chicken package is not comparable to
$4.49/lb chicken. The sync filters bulk prices over $50, but per-unit normalization is needed.

**Wholesale bulk prices distort "best price":** Costco/Restaurant Depot/Sam's Club case prices
($299 apples, $143 cream cheese, $139 garlic) are real but represent bulk cases, not retail units.
The smart lookup returns cheapest price, which may be a bulk case price.

**Non-food leaks:** The two-layer filter catches most non-food but branded items with food-adjacent
words slip through (e.g., "Ninja Foodi Multi-Cooker"). Periodic cleanup needed.

**Flipp scraper first automated run:** Cron was configured 2026-03-28. First 3 AM run is that night.
Prior data came from manual runs. Verify `logs/scraper-flipp.log` exists after 3 AM to confirm.

**Sync-api not in systemd:** Runs via nohup. Dies on Pi reboot. Service files exist in
`~/openclaw-prices/systemd/` but need `systemctl --user enable openclaw-sync-api`.

**Puppeteer scrapers not scheduled:** Hannaford, Stop & Shop, Instacart, Whole Foods scrapers
exist but have no cron entries. They require Puppeteer/Chrome on the Pi (may not be installed).

## Price Coverage

Price coverage starts at ~8% and grows over time as flyers cycle. After a few months
of daily scraping, coverage should reach 20-30% for actively sold items. Government
index data provides broad category averages for items without specific retail prices.

## Category Distribution

| Category      | Items |
| ------------- | ----- |
| Pantry        | 2,126 |
| Produce       | 1,761 |
| Grains        | 1,011 |
| Beef          | 784   |
| Uncategorized | 762   |
| Pork          | 537   |
| Lamb/Game     | 420   |
| Poultry       | 418   |
| Beverages     | 383   |
| Dairy         | 373   |
| Seafood       | 330   |
| Oils          | 241   |
| Spices        | 114   |
| Herbs         | 20    |
| Eggs          | 6     |

## API Endpoints (port 8081)

| Endpoint                      | Method | Description                                              |
| ----------------------------- | ------ | -------------------------------------------------------- |
| `/api/lookup?q=`              | GET    | Smart lookup with aliases and price priority             |
| `/api/lookup/batch`           | POST   | Batch lookup with JSON body `{ items: [...] }`           |
| `/api/prices`                 | GET    | All current prices (filter: ?ingredient, ?tier, ?source) |
| `/api/prices/ingredient/{id}` | GET    | Price comparison across all stores for one ingredient    |
| `/api/ingredients`            | GET    | Canonical ingredient catalog (?search=)                  |
| `/api/sources`                | GET    | All tracked stores                                       |
| `/api/changes`                | GET    | Recent price changes (?limit=)                           |
| `/api/stats`                  | GET    | Database statistics                                      |
| `/api/sync/database`          | GET    | Download full SQLite database file                       |
| `/health`                     | GET    | Health check                                             |

## Files on Pi

```text
~/openclaw-prices/
  ├── config/
  │   └── .env                          (API keys, ChefFlow URL, CRON_SECRET)
  ├── data/
  │   ├── prices.db                     (SQLite, WAL mode - THE database)
  │   ├── usda-cache/food_category.csv  (USDA category mapping)
  │   ├── receipts/                     (incoming receipt images)
  │   ├── receipts-processed/           (OCR'd receipts)
  │   └── receipts-failed/              (failed OCR attempts)
  ├── lib/
  │   ├── db.mjs                        (SQLite connection, schema, upsertPrice)
  │   ├── normalize-rules.mjs           (keyword rules + two-layer food filter)
  │   ├── smart-lookup.mjs              (alias-aware, price-prioritized search)
  │   └── scrape-utils.mjs              (HTTP fetch, rate limiting, Puppeteer helpers)
  ├── scripts/
  │   ├── check-stats.mjs               (database stats + lookup test)
  │   ├── diagnose-gaps.mjs             (find priced items not linked to catalog)
  │   └── test-smart-lookup.mjs          (74-item dinner planning test)
  ├── services/
  │   ├── scraper-flipp.mjs             (Flipp VACUUM mode - daily 3 AM)
  │   ├── scraper-government.mjs        (BLS/FRED - Monday 2 AM)
  │   ├── scraper-wholesale.mjs         (wholesale catalogs - Wednesday 9 AM)
  │   ├── scraper-hannaford.mjs         (Puppeteer - not yet scheduled)
  │   ├── scraper-stopsandshop.mjs      (Puppeteer S&S+Shaw's - not yet scheduled)
  │   ├── scraper-instacart.mjs         (Puppeteer Market Basket - not yet scheduled)
  │   ├── scraper-wholefoodsapfresh.mjs (Puppeteer WF/Amazon - not yet scheduled)
  │   ├── scraper-flyers.mjs            (weekly sale flyers - not yet scheduled)
  │   ├── scraper-usda-bulk.mjs         (comprehensive catalog - one-time)
  │   ├── scraper-usda.mjs              (USDA API scraper - limited by rate limits)
  │   ├── import-usda-csv.mjs           (USDA CSV import - one-time)
  │   ├── cross-match.mjs               (Flipp slug -> canonical linking - daily 4 AM)
  │   ├── aggregator.mjs                (trends/anomalies/summaries - daily 10 AM)
  │   ├── receipt-processor.mjs          (OCR receipt scanning - systemd, port 8082)
  │   ├── watchdog.mjs                   (health monitoring - every 15 min)
  │   ├── sync-api.mjs                   (REST API server - always running, port 8081)
  │   ├── sync-to-chefflow.mjs           (ChefFlow sync trigger - daily 11 PM)
  │   ├── clean-nonfood.mjs              (utility - isFoodItem filter cleanup)
  │   └── clean-nonfood-v2.mjs           (utility - pattern-based cleanup)
  ├── systemd/
  │   ├── openclaw-sync-api.service      (NOT installed - sync-api runs via nohup)
  │   ├── openclaw-receipt-processor.service (installed and active)
  │   └── setup-services.sh              (installer script)
  ├── dashboard/                          (web dashboard assets)
  ├── logs/                               (all cron output)
  └── node_modules/                       (better-sqlite3, etc.)
```

### Local mirror (.openclaw-build/)

The ChefFlow repo contains `.openclaw-build/` with copies of the core files we actively develop.
**This is NOT the complete Pi.** The Pi has additional services (Puppeteer scrapers, aggregator,
watchdog, receipt-processor) that were created in earlier sessions and are not mirrored here.

When editing OpenClaw code: edit in `.openclaw-build/`, then `scp` to the Pi.

## Cron Schedule (Pi)

```text
0 2  * * 1    scraper-government.mjs    (BLS/FRED - Monday 2 AM)
0 3  * * *    scraper-flipp.mjs         (Flipp VACUUM - daily 3 AM)
0 4  * * *    cross-match.mjs           (link new items to catalog - daily 4 AM)
0 9  * * 3    scraper-wholesale.mjs     (wholesale index - Wednesday 9 AM)
0 10 * * *    aggregator.mjs            (trends/anomalies - daily 10 AM)
*/15 * * * *  watchdog.mjs              (health checks - every 15 min)
*/30 * * * *  receipt-processor.mjs     (pending receipts - every 30 min)
0 23 * * *    sync-to-chefflow.mjs      (ChefFlow price sync - daily 11 PM)
```

**Not yet scheduled:** scraper-hannaford, scraper-stopsandshop, scraper-instacart,
scraper-wholefoodsapfresh, scraper-flyers (all require Puppeteer on Pi).

## ChefFlow Integration Points

| ChefFlow File                      | Purpose                                                   |
| ---------------------------------- | --------------------------------------------------------- |
| `lib/openclaw/sync.ts`             | Server action: sync prices from Pi via smart lookup batch |
| `app/api/cron/price-sync/route.ts` | Cron endpoint called by Pi nightly                        |
| `lib/auth/cron-auth.ts`            | Bearer token verification for cron routes                 |
| `app/(admin)/admin/price-catalog/` | Admin UI: browse prices, trigger manual sync              |
| `lib/grocery/pricing-actions.ts`   | Uses `lastPriceCents` as fallback when API sources fail   |
| `OPENCLAW_API_URL` env var         | Pi URL (default: `http://10.0.0.177:8081`)                |
