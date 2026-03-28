# OpenClaw v2 - Price Intelligence Engine Changelog

## What was built (2026-03-28)

### Pi API New Endpoints

| Endpoint                      | Method | Purpose                                                                                             |
| ----------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `/api/prices/enriched`        | POST   | Enriched price lookup with normalized units, all stores, trends. Used by ChefFlow nightly sync.     |
| `/api/catalog/suggest`        | POST   | Feedback loop for unmatched ingredient names. Grows the catalog automatically.                      |
| `/api/optimize/shopping-list` | POST   | Shopping optimizer. Given ingredients, returns cheapest single-store and optimal multi-store split. |
| `/api/alerts/price-drops`     | GET    | Price drop alerts. Finds ingredients with significant recent price decreases.                       |
| `/api/freshness`              | GET    | Price freshness report. Shows how many prices are current vs stale.                                 |

### Scraper Improvements

- **Deep Scraper v2** (`scripts/openclaw-deep-scraper.mjs`):
  - Auto-discovers each store's actual category tree (no hardcoded slugs)
  - Adaptive scrolling (keeps going until no new products appear)
  - 400+ search terms (up from 80)
  - Category-specific Instacart markup adjustment (produce 25%, meat 12%, pantry 8%, etc.)
  - 14 stores (added Price Chopper, Big Y, Trader Joe's, Target, Restaurant Depot)
  - Smart search terms pulled from Pi's canonical ingredient database
  - Improved unit detection (parses size field, handles weight pricing)

- **Remaining Stores Scraper** (`scripts/openclaw-scrape-remaining.mjs`):
  - Crash-safe incremental flush every 500 products
  - Faster scroll timing for throughput

### ChefFlow Integration

- **Middleware fix:** Added `/api/cron` to `API_SKIP_AUTH_PREFIXES` so the nightly sync cron can reach the price-sync endpoint.
- **Receipt OCR** (`lib/ai/receipt-ocr.ts`): Ollama vision model extracts line items from grocery receipt photos. Highest-confidence price source (tier 1).
- **Receipt import actions** (`lib/ingredients/receipt-scan-actions.ts`): Server actions to scan receipts and import confirmed prices to both ChefFlow PostgreSQL and Pi.
- **Sync enhanced** (linter update): Now writes ALL store prices per ingredient to price history (not just the best), and deduplicates by store+date.

### Scheduled Re-Scraping

- `scripts/openclaw-scheduled-scrape.bat`: Windows Task Scheduler batch file for Monday + Thursday at 2 AM.

### Current Data (growing)

As of 2026-03-28 16:37 UTC:

- 5,387 current prices
- 12,979 canonical ingredients
- 10,071 price changes logged
- Scraper still running through remaining stores

### Architecture

```
[Instacart Pages] --Playwright--> [Windows Scraper] --HTTP--> [Pi SQLite :8081]
                                                                    |
[ChefFlow PostgreSQL] <--nightly sync-- [Pi /api/prices/enriched]   |
                                                                    |
[Recipe Costing] <-- 8-tier resolve chain <-- [ingredient prices]   |
                                                                    |
[Receipt Photos] --Ollama OCR--> [ingredient_price_history]         |
                                  (also pushed to Pi) -------->----/
```
