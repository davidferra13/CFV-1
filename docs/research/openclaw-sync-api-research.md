# Research: OpenClaw Sync API and Data Export Capabilities

> **Date:** 2026-03-29
> **Question:** What does the Pi-side sync API expose, how does data currently move from Pi to PC, and what are the capacity/schema details?
> **Status:** complete

## Summary

The Pi runs a 1,337-line HTTP API (`services/sync-api.mjs`) on port 8081 with 20+ endpoints, serving price intelligence data from a 24 MB SQLite database (28 MB with WAL). Data flows in one direction nightly: the Pi's `sync-to-chefflow.mjs` cron script (11 PM) calls ChefFlow's `/api/cron/price-sync` endpoint, triggering ChefFlow to pull enriched prices back from the Pi via `/api/prices/enriched`. The PC can also pull data on demand via the same API. There is no authentication on the sync API itself; it relies on LAN-only access.

## Detailed Findings

### 1. Sync API Endpoints (Full Inventory)

**File:** `~/openclaw-prices/services/sync-api.mjs` (1,337 lines, running as PID 487481)

| Method | Endpoint                       | Purpose                                        | Pagination                             | Max Items             |
| ------ | ------------------------------ | ---------------------------------------------- | -------------------------------------- | --------------------- |
| GET    | `/health`                      | Health check                                   | No                                     | 1                     |
| GET    | `/api/stats`                   | Database statistics (counts, last scrape time) | No                                     | 1                     |
| GET    | `/api/sync/database`           | **Download entire SQLite file as binary**      | No                                     | Entire DB (~24 MB)    |
| GET    | `/api/prices`                  | All current prices with filters                | `?limit=N` (default 500)               | 500 max per request   |
| GET    | `/api/prices/ingredient/{id}`  | All prices for one ingredient                  | No                                     | Unbounded             |
| GET    | `/api/prices/history/{id}`     | Price change history for sparklines            | `?days=N` (default 90)                 | Unbounded             |
| POST   | `/api/prices/enriched`         | **Primary sync endpoint** (V2+)                | No                                     | 500 items per batch   |
| POST   | `/api/prices/batch`            | Import prices from Windows scraper             | No                                     | Unbounded             |
| POST   | `/api/prices/cost-impact`      | Which of your ingredients changed price        | No                                     | 200 items max         |
| GET    | `/api/sources`                 | All 43 sources in registry                     | No                                     | Unbounded             |
| GET    | `/api/categories`              | Distinct ingredient categories                 | No                                     | Unbounded             |
| GET    | `/api/stats/category-coverage` | Per-category price coverage                    | No                                     | Unbounded             |
| GET    | `/api/ingredients`             | Full ingredient catalog with filtering         | `?limit=N&page=N` + cursor (`?after=`) | 500 max per page      |
| GET    | `/api/ingredients/detail/{id}` | Full detail for one ingredient                 | No                                     | Unbounded             |
| GET    | `/api/changes`                 | Recent price changes                           | `?limit=N` (default 50)                | Unbounded             |
| GET    | `/api/lookup?q=`               | Smart single-ingredient lookup                 | No                                     | 1                     |
| POST   | `/api/lookup/batch`            | Batch smart lookup                             | No                                     | 200 items max         |
| POST   | `/api/catalog/suggest`         | Feed back unmatched names (catalog growth)     | No                                     | 500 items max         |
| POST   | `/api/optimize/shopping-list`  | Cheapest store combo for a list                | No                                     | 100 items max         |
| GET    | `/api/alerts/price-drops`      | Price drop alerts                              | `?threshold=N&limit=N`                 | Unbounded             |
| GET    | `/api/freshness`               | Data freshness report                          | No                                     | 1                     |
| GET    | `/api/stock/summary`           | Overall stock availability stats               | No                                     | 50 out-of-stock items |
| GET    | `/api/stock/ingredient/{id}`   | Stock status for one ingredient                | No                                     | Unbounded             |
| POST   | `/api/stores/scorecard`        | Store comparison for your ingredient list      | No                                     | 200 items max         |
| GET    | `/` or `/dashboard`            | HTML status page with recent prices            | No                                     | 25 rows               |

### 2. Data Format

All API responses are JSON with `Content-Type: application/json` and `Access-Control-Allow-Origin: *` (wide open CORS). The database download (`/api/sync/database`) returns raw binary (`application/octet-stream`).

**Enriched price response structure (the primary sync format):**

```json
{
  "results": {
    "chicken breast": {
      "canonical_id": "chicken-breast-boneless-skinless",
      "name": "Chicken Breast (Boneless, Skinless)",
      "category": "poultry",
      "best_price": {
        "cents": 349,
        "normalized_cents": 349,
        "normalized_unit": "lb",
        "original_unit": "lb",
        "store": "Market Basket",
        "tier": "retail",
        "pricing_tier": "retail",
        "confirmed_at": "2026-03-29T...",
        "in_stock": true
      },
      "all_prices": [ ... ],
      "trend": { "direction": "down", "change_7d_pct": -5 },
      "price_count": 8
    }
  },
  "lookup_ms": 42,
  "timestamp": "2026-03-29T..."
}
```

### 3. Pagination Capabilities

Most endpoints have no pagination. The two that do:

- **`/api/prices`**: `?limit=N` with a hard max of 500 and no offset/cursor.
- **`/api/ingredients`**: Full pagination support with `?limit=N&page=N` (offset-based, max 500 per page) AND cursor-based via `?after=ingredient_id`. Returns `hasMore`, `nextCursor`, `total`, `pages`.

POST endpoints cap input arrays at 100-500 items (varies by endpoint).

### 4. SQLite Schema (9 tables)

| Table                   | Records | Purpose                                                          |
| ----------------------- | ------- | ---------------------------------------------------------------- |
| `source_registry`       | 43      | Stores/sources (name, type, chain, location, scrape config)      |
| `canonical_ingredients` | 11,084  | Master ingredient catalog (name, category, unit, OFF enrichment) |
| `ingredient_variants`   | 0       | Variant tracking (unused)                                        |
| `current_prices`        | 8,745   | Latest known price per product per source                        |
| `price_changes`         | 25,339  | Historical price change log                                      |
| `normalization_map`     | 10,891  | Raw product name to canonical ingredient mapping                 |
| `price_monthly_summary` | 0       | Monthly aggregates (unpopulated)                                 |
| `price_trends`          | 2,338   | Rolling average trends (7d/30d/90d)                              |
| `price_anomalies`       | 23,118  | Detected price anomalies                                         |

**Key columns on `current_prices`:** `price_cents`, `price_unit`, `pricing_tier`, `confidence`, `in_stock`, `image_url`, `location_id`, `source_url`, `last_confirmed_at`, `last_changed_at`.

**Key columns on `canonical_ingredients`:** `off_image_url`, `off_barcode`, `off_nutrition_json` (Open Food Facts enrichment).

### 5. Data Flow: Pi to ChefFlow

**Nightly push-pull cycle:**

1. **11:00 PM** - Pi cron runs `sync-to-chefflow.mjs`
2. Script reads `CHEFFLOW_URL` (`http://10.0.0.100:3100`) and `CRON_SECRET` from `config/.env`
3. Script calls `GET {CHEFFLOW_URL}/api/cron/price-sync` with `Authorization: Bearer {CRON_SECRET}`
4. ChefFlow's `/api/cron/price-sync` delegates to `syncCartridgeInternal('price-intel')` via the cartridge registry
5. The sync handler (in `lib/openclaw/sync.ts`) calls back to Pi at `http://10.0.0.177:8081/api/prices/enriched` with the chef's ingredient list
6. Pi returns enriched price data; ChefFlow writes it to PostgreSQL

**So the flow is: Pi triggers ChefFlow, then ChefFlow pulls from Pi.** The Pi initiates but the PC does the actual data fetching.

### 6. Existing PC Pull Mechanisms

The PC can pull data from the Pi at any time via:

1. **`/api/sync/database`** - Download the entire 24 MB SQLite file (for offline/backup)
2. **`/api/prices/enriched` (POST)** - Send ingredient names, get back enriched prices with trends
3. **`/api/ingredients?limit=500&page=N`** - Paginate through the full catalog
4. **`/api/lookup/batch` (POST)** - Batch resolve ingredient names to prices
5. **Any GET endpoint** - All data is freely accessible on the LAN

There is **no authentication** on the sync API. Security is LAN-only (10.0.0.x network).

### 7. Disk Usage

| Path                      | Size                                       |
| ------------------------- | ------------------------------------------ |
| `/` (root filesystem)     | 117 GB total, 34 GB used, 78 GB free (31%) |
| `~/openclaw-prices/data/` | 28 MB total                                |
| `prices.db`               | 24 MB                                      |
| `prices.db-wal` (WAL)     | 4.7 MB                                     |
| `prices.db-shm`           | 32 KB                                      |

Disk is not a concern. 78 GB free with a 28 MB database.

### 8. Process Management

- **Sync API** (`services/sync-api.mjs`): Running as a detached background process. NOT managed by systemd or PM2. If the Pi reboots, it will not auto-start. The watchdog (cron every 15 min) checks health but does not seem to auto-restart it.
- **Receipt Processor** (`services/receipt-processor.mjs server`): Also a detached background process (started Mar 28).
- **OpenClaw Gateway**: Managed by systemd user unit (`openclaw-gateway.service`) on port 18789. This is a separate service from the sync API.
- **Watchdog**: Runs every 15 minutes via cron, checks HTTP health of sync-api and receipt-processor, verifies DB integrity and disk space.

### 9. Scraper Schedule

17 cron jobs run daily/weekly:

- Government data (BLS, FRED, USDA): Weekly Monday 2 AM
- FLIPP API: Daily 3 AM
- Cross-match: Daily 4 AM and 9 AM
- Whole Foods: Daily 5 AM
- Target: Daily 6 AM
- Walmart: Daily 6:30 AM
- Stop & Shop/Shaws: Tue/Thu/Sat 7 AM
- Instacart Bulk (alternating store groups): Daily 7:30 AM, max 2000 items
- Wholesale/BLS PPI: Wednesday 9:30 AM
- Aggregator: Daily 10 AM
- Open Food Facts enrichment: Sunday 12 PM
- Receipt processor: Every 30 minutes
- ChefFlow sync: 11 PM nightly

## Gaps and Unknowns

1. **No auth on sync API** - Anyone on the LAN can access all data. No API key, no bearer token.
2. **Sync API has no systemd unit** - If the Pi reboots, the API goes down until someone manually starts it. The watchdog checks health but the auto-restart logic may not work without systemd.
3. **`/api/prices` hard-caps at 500** with no offset/cursor, so you cannot paginate through all 8,745 prices via that endpoint. Use `/api/ingredients` (which has proper pagination) or `/api/sync/database` (full dump) instead.
4. **`price_monthly_summary` table is empty** - The aggregator may not be populating it.
5. **`ingredient_variants` table is empty** - Variant tracking is defined but unused.
6. **CRON_SECRET is in plaintext** in `config/.env` on the Pi: `SaltyPhish7!`.

## Recommendations

1. **Add a systemd unit for sync-api** (quick fix) - Create `~/.config/systemd/user/openclaw-sync-api.service` so it survives reboots. Currently fragile.
2. **Add basic auth to sync API** (quick fix) - Even a simple bearer token check would prevent accidental access from other LAN devices.
3. **The full-database download endpoint is the most efficient bulk sync** (no spec needed) - At 24 MB, downloading the entire SQLite file is trivial and gives ChefFlow the complete dataset without pagination concerns.
4. **The enriched endpoint is the right choice for incremental sync** (no spec needed) - POST your ingredient list, get back exactly what you need with trends and store data.
5. **Consider populating `price_monthly_summary`** (needs investigation) - Aggregator runs daily but this table is empty. May be a bug or just unimplemented.
