# OpenClaw Data Pipeline

## Overview

OpenClaw is ChefFlow's price intelligence system running on a Raspberry Pi (10.0.0.177).
It maintains a comprehensive food catalog of ~10,000 items with live retail prices from local stores.

## Architecture

```
Raspberry Pi (10.0.0.177)
  ├── SQLite database (WAL mode)
  │   ├── canonical_ingredients (9,772 items)
  │   ├── current_prices (1,047+ prices, growing daily)
  │   ├── price_changes (historical tracking)
  │   └── price_trends (7d/30d/90d analytics)
  ├── Scrapers (cron, nightly)
  │   ├── scraper-flipp.mjs (VACUUM mode - exhaustive retail prices)
  │   ├── scraper-government.mjs (BLS/FRED index prices)
  │   └── import-usda-csv.mjs (one-time catalog import)
  └── sync-to-chefflow.mjs (triggers ChefFlow price sync at 11 PM)
```

## Data Sources

| Source                | Type                | Items       | Frequency       | Notes                     |
| --------------------- | ------------------- | ----------- | --------------- | ------------------------- |
| Flipp API             | Retail flyer prices | ~1,300/week | Nightly         | 18 local stores           |
| USDA FoodData Central | Food catalog        | 8,246 items | One-time import | Foundation + SR Legacy    |
| Manual catalog        | Chef-focused items  | 785 items   | As needed       | Cuts, grades, specialties |
| BLS/FRED              | Government indexes  | 9 series    | Weekly          | Northeast regional prices |

## Stores Tracked (18)

**Primary grocery:** Shaw's, Stop & Shop, ALDI, Big Y, Wegman's, Market Basket\*
**Big box:** Walmart, Target
**Wholesale:** Costco, Sam's Club, Restaurant Depot
**Pharmacy:** CVS, Walgreens
**Discount:** Family Dollar, Dollar General, Ocean State Job Lot

\*Market Basket's Flipp flyer is image-based (0 structured items). Receipt scanning is the primary path.

## How It Works

### Flipp VACUUM Scraper

The Flipp scraper runs in "vacuum" mode: 302 search terms (full alphabet + food categories),
pagination up to 600 items per term, across all 18 merchants. Two-layer food filter:

1. Blacklist: rejects non-food items (cosmetics, electronics, furniture, pet products)
2. Whitelist: requires at least one food indicator (ingredients, brands, cooking terms)

Items matching keyword rules get canonical IDs (e.g., `chicken-breast-boneless-skinless`).
Unmatched food items get auto-generated slug IDs (e.g., `kraft-aioli`).

### USDA Catalog

8,246 Foundation Foods and SR Legacy items from USDA FoodData Central provide the
comprehensive catalog. These are canonical food items (not branded products). The catalog
ensures we have entries for virtually every food ingredient. Prices fill in over time as
Flipp flyers cycle through items.

### ChefFlow Sync

At 11 PM nightly (after scraping), `sync-to-chefflow.mjs` calls the ChefFlow
`/api/cron/price-sync` endpoint with a Bearer token. ChefFlow pulls prices and
updates ingredient costs in its database.

## Price Coverage

Price coverage starts at ~8% and grows over time as flyers cycle. After a few months
of daily scraping, coverage should reach 20-30% for actively sold items. Government
index data provides broad category averages for items without specific retail prices.

## Category Distribution

| Category  | Items |
| --------- | ----- |
| Pantry    | 2,126 |
| Produce   | 1,761 |
| Grains    | 1,011 |
| Beef      | 784   |
| Pork      | 537   |
| Lamb/Game | 420   |
| Poultry   | 418   |
| Beverages | 383   |
| Dairy     | 373   |
| Seafood   | 330   |
| Oils      | 241   |
| Spices    | 114   |
| Herbs     | 20    |
| Eggs      | 6     |

## Files on Pi

```
~/openclaw-prices/
  ├── config/.env (CHEFFLOW_URL, CRON_SECRET)
  ├── data/prices.db (SQLite, WAL mode)
  ├── data/usda-cache/food_category.csv
  ├── lib/
  │   ├── db.mjs
  │   ├── normalize-rules.mjs (keyword rules + two-layer food filter)
  │   └── scrape-utils.mjs
  └── services/
      ├── scraper-flipp.mjs (VACUUM mode - nightly)
      ├── scraper-government.mjs (BLS/FRED - nightly)
      ├── scraper-usda-bulk.mjs (comprehensive catalog - one-time)
      ├── import-usda-csv.mjs (USDA CSV import - one-time)
      ├── sync-to-chefflow.mjs (ChefFlow sync trigger - nightly)
      └── clean-nonfood.mjs (utility - remove non-food leaks)
```

## Cron Schedule (Pi)

```
0 22 * * * cd ~/openclaw-prices && node services/scraper-flipp.mjs >> logs/flipp.log 2>&1
30 22 * * * cd ~/openclaw-prices && node services/scraper-government.mjs >> logs/government.log 2>&1
0 23 * * * cd ~/openclaw-prices && node services/sync-to-chefflow.mjs >> logs/sync.log 2>&1
```
