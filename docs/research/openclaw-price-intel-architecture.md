# Research: OpenClaw Price Intelligence System - Full Architecture

> **Date:** 2026-03-29
> **Question:** What is the full geographic scope, store coverage, and architecture of the OpenClaw price-intel system on the Raspberry Pi?
> **Status:** complete

## Summary

OpenClaw Price Intelligence is a SQLite-backed food price aggregation system running on a Raspberry Pi at `10.0.0.177`. It scrapes prices from 43 registered sources (30+ stores, 3 government APIs, 2 wholesale distributors) across the **Haverhill, MA** metro area, with one secondary region in **Portland, ME** (Whole Foods only). The database currently holds **11,084 canonical ingredients**, **8,745 current prices**, and **25,339 price change records**. An HTTP sync API on port 8081 serves data to ChefFlow via nightly cron sync.

## Geographic Scope

### Primary Region: Haverhill, MA (01835)

Every scraper is anchored to **zip code 01835** (Haverhill, MA) or the nearby Methuen, MA area (01844). This is the developer's home location. All store-level location IDs reference Haverhill or Methuen.

### Secondary Region: Portland, ME (04101)

The Whole Foods scraper (`scraper-wholefoodsapfresh.mjs`) is the only multi-region scraper. It scrapes two zip codes:

- `01835` - Haverhill, MA (source: `whole-foods-haverhill-ma`)
- `04101` - Portland, ME (source: `whole-foods-portland-me`)

### States Represented in source_registry

| State | Source Count |
| ----- | ------------ |
| MA    | 39           |
| ME    | 1            |

There is **no coverage** outside MA/ME. No other states, no other zip codes. The system is hyperlocal to northeastern Massachusetts.

### Specific Store Locations Referenced

| Store            | Location                          | Source                                              |
| ---------------- | --------------------------------- | --------------------------------------------------- |
| Target           | Methuen, MA (#1290)               | `scraper-target.mjs`, store ID `1290`, zip `01844`  |
| Walmart          | Methuen, MA (#2153)               | `scraper-walmart.mjs`, store ID `2153`, zip `01844` |
| Whole Foods      | Haverhill, MA                     | `scraper-wholefoodsapfresh.mjs`, zip `01835`        |
| Whole Foods      | Portland, ME                      | `scraper-wholefoodsapfresh.mjs`, zip `04101`        |
| Stop & Shop      | New England (regional)            | `scraper-stopsandshop.mjs`, no specific store ID    |
| Shaw's           | New England (regional)            | `scraper-stopsandshop.mjs`, no specific store ID    |
| Flipp stores     | All scoped to postal code `01835` | `scraper-flipp.mjs`                                 |
| Instacart stores | Session set to zip `01835`        | `scraper-instacart-bulk.mjs`                        |

## Store Coverage (43 Registered Sources)

### By Scraping Method

| Method           | Description                                | Sources                                       |
| ---------------- | ------------------------------------------ | --------------------------------------------- |
| Flipp API        | Digital circulars/flyers via Flipp.com API | 18 stores                                     |
| Instacart (bulk) | Puppeteer + GraphQL, 250+ search terms     | 8 stores                                      |
| Direct website   | Puppeteer scraping of store websites       | Stop & Shop, Shaw's, Whole Foods (x2)         |
| API direct       | HTTP API without browser                   | Target (Redsky API)                           |
| SSR extract      | Parse Next.js `__NEXT_DATA__` from HTML    | Walmart                                       |
| Government API   | BLS, FRED, USDA                            | 3 sources                                     |
| Catalog index    | Product name indexing only (no prices)     | Restaurant Depot, Sysco                       |
| Weekly flyer     | Separate flyer scraper                     | Aldi, Hannaford, Market Basket, Price Chopper |

### Retail Grocery Stores (via Flipp, postal code 01835)

| Store                  | Merchant ID | Chain          | Tier   |
| ---------------------- | ----------- | -------------- | ------ |
| Market Basket          | 5814        | market-basket  | retail |
| Demoulas Market Basket | 3533        | market-basket  | retail |
| Shaw's                 | 2454        | shaws          | retail |
| Stop & Shop            | 2393        | stop-and-shop  | retail |
| ALDI                   | 2353        | aldi           | retail |
| Big Y                  | 2483        | big-y          | retail |
| Wegman's               | 2527        | wegmans        | retail |
| McKinnon's             | 3871        | mckinnons      | retail |
| Walmart                | 2175        | walmart        | retail |
| Target                 | 2040        | target         | retail |
| CVS Pharmacy           | 2264        | cvs            | retail |
| Walgreens              | 2460        | walgreens      | retail |
| Family Dollar          | 2150        | family-dollar  | retail |
| Dollar General         | 2063        | dollar-general | retail |
| Ocean State Job Lot    | 3056        | ocean-state    | retail |

### Wholesale/Club Stores (via Flipp)

| Store            | Merchant ID | Tier      |
| ---------------- | ----------- | --------- |
| Costco           | 2519        | wholesale |
| Sam's Club       | 3341        | wholesale |
| Restaurant Depot | 4440        | wholesale |

### Instacart Stores (8 stores, alternating odd/even days)

**Odd days:** Market Basket, Hannaford, Aldi, Stop & Shop (max 2000 products each)
**Even days:** Shaw's, Costco, BJ's, Whole Foods (max 2000 products each)

Each store has a configured Instacart markup percentage that gets subtracted to estimate real in-store prices:

- Market Basket: 15%
- Hannaford: 12%
- Aldi: 18%
- Stop & Shop: 15%
- Shaw's: 15%
- Costco: 20%
- BJ's: 18%
- Whole Foods: 10%

### Government Data Sources

| Source                       | Data                                                        | Region                         | Frequency            |
| ---------------------------- | ----------------------------------------------------------- | ------------------------------ | -------------------- |
| BLS Average Prices (APU02xx) | ~40 food item prices                                        | Northeast urban (APU02 prefix) | Weekly (Monday 2 AM) |
| FRED (St. Louis Fed)         | 7 CPI series (food at home, meats, eggs, dairy, fruits/veg) | National                       | Weekly               |
| BLS PPI (wholesale)          | 11 Producer Price Index series                              | National                       | Wednesday            |
| USDA AMS                     | Food price outlook                                          | National (wholesale tier)      | Not actively fetched |

**BLS series prefix `APU02` = Northeast urban region.** This is specifically the Northeast U.S. Census region, not just MA.

### Direct Website Scrapers

| Store                              | Method                            | Frequency        |
| ---------------------------------- | --------------------------------- | ---------------- |
| Target (Methuen)                   | Redsky API (HTTP, no auth)        | Daily 6 AM       |
| Walmart (Methuen)                  | HTML SSR extraction               | Daily 6:30 AM    |
| Whole Foods (Haverhill + Portland) | Puppeteer/Amazon ALM platform     | Daily 5 AM       |
| Stop & Shop (New England)          | Puppeteer/Ahold Delhaize platform | Tue/Thu/Sat 7 AM |
| Shaw's (New England)               | Puppeteer/Ahold Delhaize platform | Tue/Thu/Sat 7 AM |

## Database Schema

### Core Tables

**`source_registry`** - 43 entries. Every store/API that provides price data. Key columns: `source_id`, `name`, `type`, `chain_id`, `city`, `state`, `zip`, `lat`, `lon`, `scrape_method`, `pricing_tier` (retail/wholesale), `status` (active/stale), `instacart_markup_pct`.

**`canonical_ingredients`** - 11,084 entries. Master ingredient list. Key columns: `ingredient_id` (slug), `name`, `category`, `standard_unit`. Enrichment columns: `off_image_url`, `off_barcode`, `off_nutrition_json` (from Open Food Facts).

**`ingredient_variants`** - Variant forms of ingredients (e.g., "organic chicken breast" is a variant of "chicken breast").

**`current_prices`** - 8,745 entries. Latest known price per product per source. Composite key: `{source_id}:{canonical_ingredient_id}:{variant_id}`. Key columns: `price_cents`, `price_unit`, `price_per_standard_unit_cents`, `price_type` (regular/sale), `pricing_tier`, `confidence`, `in_stock`, `image_url`, `location_id`, `instacart_markup_applied_pct`.

**`price_changes`** - 25,339 entries. Immutable log of every price change with `change_pct`.

**`normalization_map`** - 10,891 entries. Cache of raw product name to canonical ingredient mappings. Avoids re-processing known names.

### Aggregation Tables (created by aggregator.mjs)

**`price_monthly_summary`** - Compressed summaries of price changes older than 90 days. Stores avg/min/max per ingredient per source per month.

**`price_trends`** - Computed trends: 7d/30d/90d averages, change percentages, cheapest/most expensive source per ingredient.

**`price_anomalies`** - Flags for price spikes (>25%) or drops (>25%).

### Current Data Distribution

| Pricing Tier | Count |
| ------------ | ----- |
| Retail       | 8,623 |
| Wholesale    | 122   |

| Confidence Level    | Count | Source                   |
| ------------------- | ----- | ------------------------ |
| instacart_catalog   | 7,364 | Instacart bulk scraper   |
| flyer_scrape        | 1,126 | Flipp API                |
| direct_scrape       | 138   | Whole Foods, Stop & Shop |
| api_direct          | 107   | Target Redsky API        |
| government_baseline | 9     | BLS average prices       |
| ssr_extract         | 1     | Walmart HTML             |

| Category      | Ingredients | Prices |
| ------------- | ----------- | ------ |
| uncategorized | 2,517       | 2,270  |
| grains        | 1,015       | 1,549  |
| pantry        | 2,145       | 1,477  |
| produce       | 1,765       | 1,046  |
| beverages     | 384         | 952    |
| dairy         | 373         | 520    |
| pork          | 538         | 417    |
| seafood       | 333         | 177    |
| spices        | 115         | 108    |
| poultry       | 420         | 65     |
| beef          | 787         | 65     |
| herbs         | 20          | 38     |
| oils          | 241         | 23     |
| eggs          | 6           | 14     |

## Cron Schedule (Full Pipeline)

| Time            | Service                                                  | Frequency     |
| --------------- | -------------------------------------------------------- | ------------- |
| 2:00 AM         | Government data (BLS, FRED, USDA)                        | Weekly Monday |
| 3:00 AM         | Flipp API (all 18 stores in one run)                     | Daily         |
| 4:00 AM         | Cross-match round 1                                      | Daily         |
| 5:00 AM         | Whole Foods (Haverhill + Portland)                       | Daily         |
| 6:00 AM         | Target Redsky API                                        | Daily         |
| 6:30 AM         | Walmart HTTP scraper                                     | Daily         |
| 7:00 AM         | Stop & Shop + Shaw's                                     | Tue/Thu/Sat   |
| 7:30 AM         | Instacart bulk (odd days: MB, Hannaford, Aldi, S&S)      | Alternating   |
| 7:30 AM         | Instacart bulk (even days: Shaw's, Costco, BJ's, WF)     | Alternating   |
| 9:00 AM         | Cross-match round 2                                      | Daily         |
| 9:30 AM         | Wholesale catalog + BLS PPI                              | Wednesday     |
| 10:00 AM        | Aggregator (trends, aging, anomaly detection)            | Daily         |
| 12:00 PM        | Open Food Facts enrichment (images, barcodes, nutrition) | Sunday        |
| 11:00 PM        | ChefFlow price sync (nightly push)                       | Daily         |
| Every 15 min    | Watchdog                                                 | Continuous    |
| Every 30 min    | Receipt processor (batch mode)                           | Continuous    |
| Sunday midnight | Log rotation (truncate >10MB logs)                       | Weekly        |

## Sync API (Port 8081)

The sync API is a raw Node.js HTTP server (`services/sync-api.mjs`) running as a systemd service. It exposes:

| Endpoint                                    | Purpose                                          |
| ------------------------------------------- | ------------------------------------------------ |
| `GET /health`                               | Health check                                     |
| `GET /api/stats`                            | Database summary stats                           |
| `GET /api/sync/database`                    | Download raw SQLite file                         |
| `GET /api/prices?tier=&ingredient=&source=` | Query current prices with filters                |
| `GET /api/prices/ingredient/:id`            | All prices for one ingredient across all sources |
| `GET /api/sources`                          | List all registered sources                      |
| `GET /api/categories`                       | List all ingredient categories                   |
| `GET /api/stats/category-coverage`          | Category-level coverage stats                    |
| `GET /api/ingredients/detail/:id`           | Full ingredient detail with all store prices     |
| `GET /api/changes?limit=`                   | Recent price changes                             |
| `GET /api/lookup?q=`                        | Smart ingredient lookup with best price          |
| `POST /api/lookup/batch`                    | Batch lookup for multiple ingredients            |
| `POST /api/receipt/upload`                  | Upload receipt image for processing              |
| `GET /api/receipt/:id/status`               | Check receipt processing status                  |

### ChefFlow Sync Flow

1. Nightly at 11 PM, `sync-to-chefflow.mjs` sends a `GET` to `http://10.0.0.100:3100/api/cron/price-sync` with Bearer token `SaltyPhish7!`
2. ChefFlow's price-sync cron endpoint pulls data from Pi's sync API
3. Matches OpenClaw canonical ingredients to ChefFlow's ingredient records
4. Updates ChefFlow's price data

## Systemd Services (Always Running)

| Service                      | File                          | Purpose                                                   |
| ---------------------------- | ----------------------------- | --------------------------------------------------------- |
| `openclaw-sync-api`          | Port 8081 HTTP server         | Serves price data to ChefFlow and browsers                |
| `openclaw-receipt-processor` | Server mode receipt processor | Accepts receipt uploads and processes them asynchronously |

## Architecture Diagram

```
                    INTERNET
                       |
    +------------------+-------------------+
    |                  |                   |
 Flipp API     Target Redsky      Instacart.com
 (18 stores)    (HTTP only)     (Puppeteer + GraphQL)
    |                  |                   |
    +--------+---------+---+---------------+
             |             |
         Walmart SSR   Whole Foods    Stop & Shop / Shaw's
         (HTML parse)  (Puppeteer)    (Puppeteer)
             |             |                |
             +------+------+----------------+
                    |
              RASPBERRY PI (10.0.0.177)
              ~/openclaw-prices/
                    |
            +-------+-------+
            |               |
      SQLite DB        Sync API (:8081)
      prices.db             |
            |               |
   +--------+--------+     |
   |        |        |     |
 cross-   aggreg-  enrich- |
 match    ator     er(OFF) |
                           |
                     ChefFlow (10.0.0.100:3100)
                     /api/cron/price-sync
                     (nightly at 11 PM)
```

## Normalization Pipeline

1. **Raw product name** comes from scraper (e.g., "365 Organic Boneless Skinless Chicken Breast")
2. **Brand stripping** removes known brand prefixes (cross-match.mjs has 40+ brands)
3. **Abbreviation expansion** converts receipt shorthand (e.g., "BNLS SKNLS CHKN BRST")
4. **Rule-based matching** checks ~200+ keyword patterns in `normalize-rules.mjs`
5. **Fuzzy token overlap** (cross-match fallback) if rules miss
6. **Auto-categorization** (Flipp scraper only): creates new canonical ingredients for unmatched items with category "uncategorized"
7. **Results cached** in `normalization_map` table to avoid re-processing

## Key Configuration

### API Keys (config/.env)

- **BLS API**: `576bf61b...` (free, 500 queries/day on v2)
- **FRED API**: `b1042b07...` (free, unlimited)
- **USDA API**: `SecRCaht...` (free, via data.gov)
- **ChefFlow sync**: URL `http://10.0.0.100:3100`, secret `SaltyPhish7!`

### Search Terms (config/search-terms.json)

250+ food search terms organized into 13 categories: produce_fruit, produce_vegetable, fresh_herbs, meat_poultry, seafood, dairy_eggs, pantry_grain, pantry_canned, oil_vinegar_sauce, spices, baking, nuts_dried, frozen, beverage, tofu_plant.

Used by the Instacart bulk scraper. The Flipp scraper has its own embedded 200+ term list that includes alphabet crawl (a-z).

## Gaps and Unknowns

1. **Many Instacart sources show `last_scraped_at: null`** - the Instacart bulk scraper may be failing silently or sessions are expiring before data lands. Only `hannaford-instacart` has a scrape timestamp.
2. **Government sources also show null scrape timestamps** - the BLS/FRED/USDA scraper may not have run recently, or it does not update the timestamp.
3. **Target and Walmart direct scrapers show null scrape timestamps** - despite being scheduled daily. Either they have not run since the source_registry was recreated, or they are failing.
4. **7,364 of 8,745 prices (84%) come from Instacart** - the direct store scrapers contribute relatively little. If Instacart blocks the scraper, coverage drops dramatically.
5. **No geographic expansion beyond Haverhill/Methuen** - the system is designed for one chef in one location. Expanding to other regions would require per-region config.
6. **2,517 uncategorized ingredients** - the Flipp vacuum scraper stores items that do not match normalization rules. These are real food items but lack proper categorization.
7. **Poultry and beef have low price counts (65 each)** despite having hundreds of canonical ingredients. The normalization pipeline may be too strict for these categories, or the raw names from scrapers are not matching the patterns.

## Recommendations

1. **Fix scraper timestamps** (quick fix) - Several scrapers likely work but do not update `last_scraped_at`. Check logs: `~/openclaw-prices/logs/scraper-*.log`.
2. **Investigate Instacart scraper health** (quick fix) - Most sources show null. Check `logs/scraper-instacart.log` for session/rate-limit failures.
3. **Categorize uncategorized ingredients** (needs a spec) - 2,517 items in "uncategorized". A batch job could use keyword matching to assign categories.
4. **Expand geographic scope** (needs a spec) - To serve chefs beyond Haverhill, the system needs per-chef zip code configuration and multi-region scraping.
5. **Reduce Instacart dependency** (needs discussion) - 84% of prices come from one source. If Instacart changes their API or blocks scrapers, the system loses most data. More direct-store scrapers would diversify.
