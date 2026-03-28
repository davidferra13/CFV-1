# OpenClaw Price Intelligence System

Built: 2026-03-28

## What It Is

A comprehensive food price intelligence system running on the Raspberry Pi (10.0.0.177) that scrapes grocery stores, wholesale distributors, government databases, and processes receipts to build a living food price database for New England.

This database feeds ChefFlow's costing engine so chefs can cost menus with real, current market prices without manual entry.

## Architecture

```
Raspberry Pi (10.0.0.177)
  ~/openclaw-prices/
    lib/
      db.mjs              - SQLite database layer (WAL mode)
      normalize-rules.mjs - Product name normalization (150+ rules)
      scrape-utils.mjs    - Puppeteer helpers, rate limiting, UA rotation
    services/
      scraper-government.mjs      - BLS, FRED, USDA government data
      scraper-hannaford.mjs       - Hannaford.com direct scrape
      scraper-instacart.mjs       - Market Basket, Aldi, Costco, BJ's via Instacart
      scraper-stopsandshop.mjs    - Stop & Shop + Shaw's (Ahold Delhaize)
      scraper-wholefoodsapfresh.mjs - Whole Foods + Amazon Fresh
      scraper-flyers.mjs          - Weekly sale flyers (all stores)
      scraper-wholesale.mjs       - Wholesale catalogs + BLS PPI data
      receipt-processor.mjs       - Tesseract OCR receipt scanning (port 8082)
      aggregator.mjs              - Trends, aging, anomaly detection
      watchdog.mjs                - Service monitoring + auto-restart
      sync-api.mjs                - HTTP API + dashboard (port 8081)
    data/
      prices.db           - SQLite database (the gold)
      receipts/            - Drop receipt images here
      receipts-processed/  - Successfully processed receipts
      receipts-failed/     - Failed OCR receipts
    config/
      .env                - API keys (BLS, FRED, USDA)
    logs/                 - All service logs
    systemd/              - Service definitions + setup script

ChefFlow (PC)
  lib/openclaw/sync.ts                          - Server actions to pull from Pi
  app/(admin)/admin/price-catalog/page.tsx       - Admin UI for price management
  app/(admin)/admin/price-catalog/price-catalog-client.tsx - Client component
```

## Data Sources

| Source                         | Method        | Frequency               | Confidence Tier     | Status                |
| ------------------------------ | ------------- | ----------------------- | ------------------- | --------------------- |
| BLS Average Prices (Northeast) | API           | Weekly (Mon 2AM)        | government_baseline | 9 of 42 series active |
| FRED CPI Data                  | API           | Weekly (Mon 2AM)        | government_baseline | 5 of 7 series active  |
| USDA ERS                       | API           | Weekly (Mon 2AM)        | government_baseline | Active                |
| Stop & Shop                    | Flipp API     | Daily (3AM)             | flyer_scrape        | ~39 prices            |
| Shaw's                         | Flipp API     | Daily (3AM)             | flyer_scrape        | ~42 prices            |
| ALDI                           | Flipp API     | Daily (3AM)             | flyer_scrape        | ~11 prices            |
| Costco                         | Flipp API     | Daily (3AM)             | flyer_scrape        | ~11 prices            |
| Demoulas Market Basket         | Flipp API     | Daily (3AM)             | flyer_scrape        | Sparse (seasonal)     |
| Market Basket                  | Flipp API     | Daily (3AM)             | flyer_scrape        | Sparse (seasonal)     |
| Hannaford                      | Flipp API     | Daily (3AM)             | flyer_scrape        | Sparse (seasonal)     |
| Whole Foods                    | Flipp API     | Daily (3AM)             | flyer_scrape        | Sparse (seasonal)     |
| BJ's                           | Flipp API     | Daily (3AM)             | flyer_scrape        | Sparse (seasonal)     |
| Price Chopper                  | Flipp API     | Daily (3AM)             | flyer_scrape        | Sparse (seasonal)     |
| Trader Joe's                   | Flipp API     | Daily (3AM)             | flyer_scrape        | Sparse (seasonal)     |
| Receipt Upload                 | Tesseract OCR | On upload + every 30min | exact_receipt       | Active                |
| Wholesale PPI                  | BLS API       | Weekly (Wed 9AM)        | government_baseline | Active                |

**Architecture note:** The Flipp scraper searches once per food term (63 terms = 63 API calls) and routes items to the correct store based on `item.merchant_id`. ecom_items are skipped (unreliable merchant attribution). Some stores have sparse Flipp flyer data for the 01835 postal code but coverage varies by week.

**Direct scraping status:** Puppeteer-based scrapers were tested but all major chains (Hannaford, Instacart, Stop & Shop) use aggressive bot detection. The Flipp API is the primary collection method.

**ChefFlow sync:** Runs nightly at 11 PM via Pi cron, calling `GET /api/cron/price-sync` on the ChefFlow server.

## Confidence Tiers (highest to lowest)

1. **exact_receipt** - Scanned from a physical receipt. Exact price paid.
2. **direct_scrape** - Scraped directly from the store's own website.
3. **instacart_adjusted** - Instacart price minus estimated markup (15-20%).
4. **flyer_scrape** - Sale price from weekly circular. Time-limited.
5. **government_baseline** - BLS/USDA averages. Regional, not store-specific.

## Database Schema

- **source_registry** - All price sources (stores, APIs, receipt uploads)
- **canonical_ingredients** - 187 standardized ingredients with IDs
- **ingredient_variants** - Variants (organic, grass-fed, etc.)
- **current_prices** - Latest price per ingredient per source (overwritten)
- **price_changes** - Append-only log of actual price changes
- **normalization_map** - Product name to canonical ingredient mappings
- **price_monthly_summary** - Compressed old data (90+ days)
- **price_trends** - 7d/30d/90d trends per ingredient
- **price_anomalies** - Sudden price spikes/drops (>25%)

## ChefFlow Integration

The sync flow:

1. Admin opens `/admin/price-catalog`
2. Views prices, sources, trends from Pi
3. Clicks "Sync Now" to push prices to ChefFlow
4. `syncPricesToChefFlow()` matches OpenClaw ingredients to ChefFlow ingredients by name
5. Updates `ingredients.last_price_cents` + `ingredients.last_price_date`
6. Triggers `compute_recipe_cost_cents()` cascade -> recipe costs -> menu costs -> event costs

## API Endpoints (Pi, port 8081)

- `GET /health` - Health check
- `GET /api/stats` - Database statistics
- `GET /api/prices?tier=retail&ingredient=chicken&limit=500` - Price list
- `GET /api/prices/ingredient/{id}` - Single ingredient across all sources
- `GET /api/sources` - All registered sources
- `GET /api/changes?limit=50` - Recent price changes
- `GET /api/ingredients?search=chicken` - Canonical ingredient list
- `GET /api/sync/database` - Download raw SQLite file
- `GET /dashboard` - HTML dashboard

## Receipt Upload (Pi, port 8082)

- `POST /upload` - Upload receipt image (multipart or raw)
- `GET /status` - Processor status
- Drop images in `~/openclaw-prices/data/receipts/` for batch processing

## Setup (Fresh Pi)

```bash
# Install dependencies
sudo apt-get install -y chromium-browser tesseract-ocr
cd ~/openclaw-prices && npm install

# Configure API keys in config/.env
# BLS_API_KEY, FRED_API_KEY, USDA_API_KEY

# Install systemd services + cron
sudo bash systemd/setup-services.sh

# Seed database with government data
node services/scraper-government.mjs
```

## Monitoring

The watchdog runs every 15 minutes and checks:

- Sync API health (HTTP)
- Receipt Processor health (HTTP)
- Database integrity (PRAGMA integrity_check)
- Disk space (warn >75%, critical >90%)
- Memory usage
- CPU temperature
- Scraper freshness (warn if stale)
- Auto-restart via systemd

Logs: `~/openclaw-prices/logs/watchdog.log`

## Key Design Decisions

1. **SQLite, not PostgreSQL** - The Pi runs everything locally. SQLite with WAL is crash-safe and needs zero server management.
2. **Two-store architecture** - Current Snapshot (overwritten, fixed size) + Change Log (append-only, only on actual changes). No data duplication.
3. **Instacart markup adjustment** - Market Basket has no online catalog. Instacart prices are 15-20% higher. We track the markup and subtract it.
4. **Rule-based normalization first, AI fallback second** - ~150 keyword rules handle 70%+ of product names. AI (qwen3:8b) is the fallback for unknowns. Cheaper, faster, deterministic.
5. **Data aging** - Changes older than 90 days get compressed into monthly summaries. Keeps the database small forever.
6. **Retail vs wholesale never mixed** - Separate pricing tiers. A chef sees retail OR wholesale prices, never a blend.
