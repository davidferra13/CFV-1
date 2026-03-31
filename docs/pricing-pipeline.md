# Pricing Pipeline: Product -> Ingredient -> Price

## Quick Start

```bash
# Full sync (pull catalog + normalize + prices + refresh views)
npm run sync

# Individual steps
npm run sync:pull     # Pi SQLite -> openclaw.* tables
npm run sync:prices   # Pi API -> ingredient_price_history

# Audit current state vs targets
npm run sync:audit
```

## Architecture

```
Pi (10.0.0.177:8081)          Local PostgreSQL
  SQLite database        -->  openclaw.stores (414)
  (139MB, updated daily)      openclaw.products (49K+)
                              openclaw.store_products (65K+)

  /api/prices/enriched   -->  ingredient_price_history (1,500+)
  (per-ingredient lookup)     ingredients.last_price_cents

  normalization_map      -->  openclaw.normalization_map (17K+)
  (17K raw->canonical)        ingredient_aliases (75/75)
```

## Data Flow

1. **Pull** (`pull.mjs`): Downloads Pi's SQLite, upserts stores/products/prices into `openclaw.*` schema
2. **Normalize** (`sync-normalization.mjs`): Syncs normalization map, auto-creates ingredient_aliases via pg_trgm similarity
3. **Price Sync** (`run-openclaw-sync.mjs`): Calls Pi's `/api/prices/enriched` for all chef ingredients, writes to `ingredient_price_history`
4. **Refresh Views**: Updates `regional_price_averages` and `category_price_baselines` materialized views

## Price Resolution (10-Tier Fallback)

When the app needs a price for an ingredient, `lib/pricing/resolve-price.ts` tries:

| Tier | Source                         | Confidence | Max Age  |
| ---- | ------------------------------ | ---------- | -------- |
| 1    | Chef's own receipt             | 1.0        | 90 days  |
| 2    | API quote (Kroger/Spoonacular) | 0.75       | 30 days  |
| 2.5  | Wholesale (OpenClaw)           | 0.8        | 30 days  |
| 3    | Direct scrape (OpenClaw)       | 0.85       | 14 days  |
| 4    | Flyer (OpenClaw)               | 0.7        | 14 days  |
| 5    | Instacart (OpenClaw)           | 0.6        | 30 days  |
| 6    | Regional average (2+ stores)   | 0.5        | 60 days  |
| 7    | Government (USDA/BLS)          | 0.4        | No limit |
| 8    | Historical (chef avg)          | 0.3        | No limit |
| 9    | Category baseline (median)     | 0.2        | N/A      |
| 10   | None                           | 0          | N/A      |

Confidence decays with age (step function at 3, 14, 30, 60, 90 days).

## Key Tables

| Table                        | Schema   | Purpose                                   |
| ---------------------------- | -------- | ----------------------------------------- |
| `ingredients`                | public   | Chef's ingredient library (75 items)      |
| `ingredient_price_history`   | public   | All price records by source + date        |
| `ingredient_aliases`         | public   | Chef ingredient -> system_ingredient link |
| `system_ingredients`         | public   | 5,435 curated canonical ingredients       |
| `regional_price_averages`    | public   | Materialized view: cross-store averages   |
| `category_price_baselines`   | public   | Materialized view: category medians       |
| `openclaw.products`          | openclaw | 49K+ product SKUs from Pi                 |
| `openclaw.store_products`    | openclaw | 65K+ store-level prices                   |
| `openclaw.stores`            | openclaw | 414 store locations (NE region)           |
| `openclaw.chains`            | openclaw | 11 retail chains                          |
| `openclaw.normalization_map` | openclaw | 17K+ raw name -> canonical mappings       |

## Bridge View

`openclaw.ingredient_price_bridge` connects everything:

```
ingredients -> (text search) -> openclaw.products -> store_products -> stores -> chains
```

This enables: "For my ingredient 'Chicken Breast', show me prices at every store."

## Current Metrics (2026-03-31)

- Mapping coverage: 100% (75/75 ingredients linked)
- Null results: 0%
- Data freshness: 62% < 24h, 100% < 7d
- Products: 49K (target: 600K, limited by scraping volume)
- Stores: 414 across MA/NH/ME
- Price history: 1,592 rows across 4 OpenClaw sources
