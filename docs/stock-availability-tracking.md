# Stock/Availability Tracking

## What was added

End-to-end stock availability tracking across the entire OpenClaw pipeline: scraper, Pi database, Pi API, and ChefFlow UI.

## How it works

### 1. Scraper captures stock status

The deep scraper (`scripts/openclaw-deep-scraper.mjs`) now extracts availability from Instacart's GraphQL API responses. The `detectStockStatus()` function checks multiple fields:

- `item.availabilityStatus` (out_of_stock, unavailable)
- `item.isAvailable` (boolean)
- `item.outOfStock` (boolean)
- `item.inventoryStatus` (out_of_stock)
- `item.price.viewSection.trackingProperties.out_of_stock`
- `item.badge.text` / `item.label` (text matching)

Items that appear in results with a price but no negative indicators are marked as in-stock (default: true). This is accurate because Instacart generally only shows available products.

### 2. Pi database stores stock status

- `current_prices.in_stock` column (INTEGER, 0 or 1, default 1)
- Indexed for fast stock queries (`idx_cp_stock`)
- Updated on every price upsert (new, changed, or unchanged confirmation)
- Migration is additive and safe to re-run (`migrateSchema()` in `db.mjs`)

### 3. Pi API exposes stock data

Two new endpoints:

| Endpoint                     | Method | Returns                                                 |
| ---------------------------- | ------ | ------------------------------------------------------- |
| `/api/stock/summary`         | GET    | Total counts, availability %, top 50 out-of-stock items |
| `/api/stock/ingredient/{id}` | GET    | Per-store availability for a specific ingredient        |

Existing endpoints updated to include `in_stock`:

- `/api/prices/enriched` - each store price now includes `in_stock: boolean`
- Shopping optimizer now excludes out-of-stock items from calculations

### 4. ChefFlow UI surfaces stock alerts

- `getStockSummary()` server action in `lib/openclaw/price-intelligence-actions.ts`
- Dashboard "Stock Alerts" card shows count of out-of-stock items with the first affected item/store
- Only appears when there are actual out-of-stock items (non-blocking)

## Files changed

| File                                              | Change                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `.openclaw-build/lib/db.mjs`                      | Added `in_stock` column, migration, updated `upsertPrice` and `getStats` |
| `.openclaw-build/services/sync-api.mjs`           | Added stock endpoints, updated batch import, enriched, and optimizer     |
| `scripts/openclaw-deep-scraper.mjs`               | Added `detectStockStatus()`, passes `inStock` through flush pipeline     |
| `lib/openclaw/price-intelligence-actions.ts`      | Added `StockSummary` type and `getStockSummary()` action                 |
| `app/(chef)/dashboard/_sections/alerts-cards.tsx` | Added Stock Alerts stat card                                             |

## Non-blocking

All stock-related Pi calls are wrapped in try/catch with graceful fallbacks. If the Pi is offline or hasn't been updated yet, the dashboard card simply doesn't render.
