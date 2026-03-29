# Research: OpenClaw Price Intelligence Profile - Full Analysis

> **Date:** 2026-03-29
> **Question:** What is the full structure, configuration, and geographic scope of the price-intel profile in the OpenClaw Vault?
> **Status:** complete

## Summary

The price-intel profile is a fully operational food price scraping system running on the Raspberry Pi at `~/openclaw-prices`. It has 14 scrapers targeting 43+ sources, a 24MB SQLite database with 11,084 canonical ingredients and 8,745 current prices, 20 cron-scheduled jobs, and a sync API on port 8081. The geographic scope is exclusively **New England**, centered on **Haverhill, MA (01835)** with secondary coverage of **Portland, ME (04101)**. All store-level scrapers target specific locations in the Merrimack Valley / North Shore MA region.

## Profile Structure

### File Layout (on Pi: `~/openclaw-prices/`)

```
config/.env              - API keys (BLS, FRED, USDA) + ChefFlow sync config
data/prices.db           - SQLite database (~24MB)
data/instacart-session.json - Cached Instacart browser session
data/usda-cache/         - USDA food category CSV cache
data/receipts/           - Receipt upload inbox
data/receipts-processed/ - Processed receipts
data/receipts-failed/    - Failed receipt OCR
lib/db.mjs               - Database layer (schema, upsert, stats)
lib/normalize-rules.mjs  - Product name normalization (34KB, extensive rule set)
lib/scrape-utils.mjs     - Shared scraper utilities (Puppeteer launch, HTTP fetch, rate limiting)
lib/smart-lookup.mjs     - Fuzzy ingredient lookup (17KB)
services/                - 14 scrapers + 4 processing services + sync API
scripts/                 - Diagnostic and test scripts
logs/                    - Scraper logs (watchdog.log is 438KB, the largest)
systemd/                 - Service unit files + setup script
archive/                 - Old debug/fix scripts
```

### Vault Files (on PC: `F:\OpenClaw-Vault\profiles\price-intel\`)

```
profile.json   - Profile metadata and Pi layout config
cron.txt       - Full crontab (20 jobs, schedule v3)
snapshot/      - Last snapshot from Pi (2026-03-29)
  project/     - Complete project files rsync'd from Pi
  services/    - Systemd unit files
```

### Dependencies

```json
{
  "better-sqlite3": "^12.8.0",
  "dotenv": "^17.3.1",
  "node-fetch": "^3.3.2",
  "puppeteer-core": "^24.40.0"
}
```

Minimal. Pure Node.js + SQLite. No LLM needed for scraping (Ollama used only for receipt OCR classification).

## Database Schema

Six tables in `prices.db`:

| Table                   | Purpose                                                   | Key columns                                                                                                                    |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `source_registry`       | Every store/API that provides prices                      | source_id, name, type, chain_id, city, state, zip, lat, lon, scrape_method, pricing_tier, instacart_markup_pct                 |
| `canonical_ingredients` | Master ingredient list (11,084 entries)                   | ingredient_id, name, category, standard_unit                                                                                   |
| `ingredient_variants`   | Variant names per ingredient                              | variant_id, ingredient_id, name, is_default                                                                                    |
| `current_prices`        | Latest known price per product per source (8,745 entries) | source_id, canonical_ingredient_id, price_cents, price_unit, price_per_standard_unit_cents, pricing_tier, confidence, in_stock |
| `price_changes`         | Append-only change log (25,339 entries)                   | old_price_cents, new_price_cents, change_pct, observed_at                                                                      |
| `normalization_map`     | Cached raw-name to canonical-ingredient mappings          | raw_name, canonical_ingredient_id, method, confidence                                                                          |

Data summary from profile.json:

- 11,084 canonical ingredients
- 8,745 current prices
- 43 sources
- 25,339 price changes logged
- 23,118 unacknowledged anomalies

## Geographic Scope

### Primary Region: Haverhill, MA (01835) and Surrounding Merrimack Valley

Every scraper is configured for the Haverhill, MA area. This is not configurable at runtime; the zip codes and store IDs are hardcoded in each scraper file.

### Store-Level Geographic Targets

| Scraper               | Target Location                          | How Location Is Set                                                              |
| --------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| **Flipp**             | Haverhill, MA 01835                      | `POSTAL_CODE = '01835'` hardcoded                                                |
| **Whole Foods**       | Haverhill, MA 01835 + Portland, ME 04101 | `REGIONS` array with two zip codes                                               |
| **Target**            | Methuen, MA (Store #1290)                | `TARGET_STORE_ID = '1290'` hardcoded                                             |
| **Walmart**           | Methuen, MA (Store #2153)                | `WALMART_STORE_ID = '2153'` hardcoded                                            |
| **Instacart**         | Massachusetts (all 8 stores)             | State set to 'MA' in source_registry; Instacart uses browser geolocation/cookies |
| **Stop & Shop**       | New England (generic)                    | Source ID: `stop-and-shop-new-england`, state: MA                                |
| **Shaw's**            | New England (generic)                    | Source ID: `shaws-new-england`, state: MA                                        |
| **Hannaford**         | New England (generic)                    | Source ID: `hannaford-new-england`, state: MA                                    |
| **Government (BLS)**  | Northeast urban region                   | Series prefix `APU02` = Northeast urban consumers                                |
| **Government (FRED)** | National                                 | Federal Reserve data is national                                                 |
| **Government (USDA)** | National                                 | USDA Agricultural Marketing Service data is national                             |
| **Wholesale**         | Massachusetts / New England              | Restaurant Depot + Sysco New England                                             |
| **Weekly Flyers**     | Massachusetts                            | Market Basket, Hannaford, Aldi, Price Chopper                                    |

### Stores Covered via Flipp API (19 merchants)

All scoped to postal code 01835 (Haverhill, MA):

**Primary grocery:** Market Basket, Demoulas Market Basket, Shaw's, Stop & Shop, Aldi, Big Y, Wegman's, McKinnon's Supermarkets

**Big box:** Walmart, Target

**Wholesale/club:** Costco, Sam's Club, Restaurant Depot

**Pharmacy/convenience:** CVS, Walgreens

**Discount:** Family Dollar, Dollar General, Ocean State Job Lot

### Stores Covered via Instacart (8 stores)

Scraped in two alternating batches (odd/even days):

- **Odd days:** Market Basket, Aldi, Stop & Shop (max 300 products each)
- **Even days:** Shaw's, Costco, BJ's, Whole Foods (max 300 products each)

Each store has a known Instacart markup percentage applied as a correction:

- Market Basket: 15%
- Hannaford: 12%
- Aldi: 18%
- Stop & Shop: 15%
- Shaw's: 15%
- Costco: 20%
- BJ's: 18%
- Whole Foods: 10%

### Whole Foods Multi-Region

The only scraper with explicit multi-region support:

- Region 1: Haverhill, MA (01835)
- Region 2: Portland, ME (04101)

### BLS Northeast Coverage

43 food price series tracked, all using `APU02` prefix (Northeast urban):

- Flour, rice, bread (white + whole wheat), pasta
- Ground beef, chuck roast, round roast, sirloin steak, round steak, stew meat
- Bacon, pork chops, ham, sausage
- Whole chicken, chicken breast (bone-in), chicken legs
- Canned tuna, eggs, milk (whole + 2%), butter
- American cheese, cheddar cheese
- Apples, bananas, oranges, strawberries, grapes, lemons
- Lettuce, tomatoes, broccoli, peppers, potatoes, carrots, celery
- Sugar, peanut butter, coffee

### Wholesale PPI Series

11 Producer Price Index series for wholesale food cost baselines:

- Processed meats, poultry, fish
- Dairy, grain mill products, bakery, sugar, fats/oils
- Fresh fruits, fresh vegetables, frozen foods

## Cron Schedule (20 Jobs)

| Time         | Frequency    | Job                                             |
| ------------ | ------------ | ----------------------------------------------- |
| 2:00 AM      | Weekly (Mon) | Government APIs (BLS, FRED, USDA)               |
| 3:00 AM      | Daily        | Flipp API (all 19 stores)                       |
| 4:00 AM      | Daily        | Cross-match round 1                             |
| 5:00 AM      | Daily        | Whole Foods (Amazon ALM)                        |
| 6:00 AM      | Daily        | Target Redsky API                               |
| 7:30 AM      | Odd days     | Instacart: Market Basket + Aldi + Stop & Shop   |
| 7:30 AM      | Even days    | Instacart: Shaw's + Costco + BJ's + Whole Foods |
| 9:00 AM      | Daily        | Cross-match round 2                             |
| 9:30 AM      | Weekly (Wed) | Wholesale catalog + BLS PPI                     |
| 10:00 AM     | Daily        | Aggregator (trends, aging, anomaly detection)   |
| Every 15 min | Continuous   | Watchdog                                        |
| Every 30 min | Continuous   | Receipt processor (batch)                       |
| 11:00 PM     | Daily        | ChefFlow price sync                             |
| Midnight Sun | Weekly (Sun) | Log rotation                                    |

## Systemd Services

Two persistent services:

1. **openclaw-sync-api** - HTTP API on port 8081 for PC to pull data
2. **openclaw-receipt-processor** - Processes uploaded receipt images

## Sync to ChefFlow

The nightly sync (`sync-to-chefflow.mjs`) pushes price data to ChefFlow at `http://10.0.0.100:3100` using cron secret `SaltyPhish7!`. This feeds the ingredient pricing features in the ChefFlow app.

## Search Term Coverage

Total unique search terms across all scrapers:

| Scraper              | Search Terms                             |
| -------------------- | ---------------------------------------- |
| Flipp                | ~180 (alphabet + food terms)             |
| Instacart            | ~80                                      |
| Target               | ~80                                      |
| Walmart              | ~75                                      |
| Whole Foods          | Category-based (7 categories, paginated) |
| Stop & Shop / Shaw's | Category-based (7 categories each)       |
| Hannaford            | Category-based (7 categories)            |
| Government           | 43 BLS series + FRED series + USDA data  |

The manifest claims 499 total search terms.

## Gaps and Unknowns

1. **No runtime geographic configuration.** Every zip code, store ID, and region is hardcoded in individual scraper files. Expanding to a new region would require duplicating scraper configurations or adding parameterized region support.

2. **Instacart geolocation.** The Instacart scraper doesn't explicitly set a zip code; it relies on cached session cookies and browser geolocation. The actual store location served may vary.

3. **23,118 unacknowledged anomalies.** The anomaly count in the data summary is very high relative to the 8,745 current prices. This likely means the anomaly detection thresholds in the aggregator need tuning.

4. **Receipt processor appears unused.** The receipts directories are all empty in the snapshot. The receipt OCR pipeline exists but has no data flowing through it.

5. **Flyer scraper not in cron.** `scraper-flyers.mjs` exists but is NOT scheduled in the crontab. The Flipp scraper may be covering sale prices already.

6. **Hannaford scraper not in cron.** `scraper-hannaford.mjs` exists but is NOT scheduled. Hannaford prices come via Instacart instead.

## Recommendations

- **Parameterize geography.** If expanding beyond New England, extract zip codes and store IDs into a shared config file rather than hardcoding in each scraper. (Needs a spec)
- **Tune anomaly detection.** 23K anomalies on 8.7K prices suggests the thresholds are too aggressive. (Quick fix)
- **Enable flyer scraper.** Add `scraper-flyers.mjs` to cron for weekly sale price capture, or confirm Flipp already covers this. (Quick fix)
- **Enable Hannaford scraper.** Add to cron or document why Instacart coverage is sufficient. (Quick fix)
