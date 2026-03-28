# OpenClaw V2 Unified Pricing: Implementation Report

**Date:** 2026-03-28
**Spec:** `docs/specs/openclaw-v2-unified-pricing.md`
**Status:** Built + migration applied + consumers wired

---

## What Changed

Unified three disconnected pricing systems (OpenClaw scraping, API quotes, manual receipts) into a single 8-tier resolution chain with full source attribution, confidence scoring, and freshness tracking. Wired the two highest-traffic consumers (menu costing, grocery list generation) to use the new chain.

## Files Created

| File                                                                 | Purpose                                                                                                           |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `.openclaw-build/services/backup-db.mjs`                             | Nightly Pi SQLite backup (keeps 7 days, SCPs to ChefFlow)                                                         |
| `.openclaw-build/lib/unit-normalization.mjs`                         | Category-aware unit standardization (proteins per-lb, eggs per-dozen, etc.)                                       |
| `.openclaw-build/services/cross-match.mjs`                           | Cross-store price matching service                                                                                |
| `.openclaw-build/services/scraper-instacart-bulk.mjs`                | Bulk Instacart scraper                                                                                            |
| `database/migrations/20260401000109_ingredient_price_enrichment.sql` | New columns + indexes for enriched pricing (APPLIED)                                                              |
| `lib/pricing/resolve-price.ts`                                       | 8-tier price resolution chain (receipt > api_quote > scrape > flyer > instacart > government > historical > none) |
| `components/pricing/price-badge.tsx`                                 | Unified price display: price/unit, store, freshness, confidence dots                                              |
| `data/openclaw-backups/`                                             | Directory for Pi database backups                                                                                 |

## Files Modified

| File                                         | Change                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `lib/openclaw/sync.ts`                       | Complete V2 rewrite: enriched endpoint, granular sources, confidence, trends, catalog feedback loop |
| `lib/menus/menu-intelligence-actions.ts`     | Cost breakdown + vendor hints now use `resolvePricesBatch()` instead of `last_price_cents`          |
| `lib/documents/generate-grocery-list.ts`     | Grocery list projected costs now use `resolvePricesBatch()` instead of `last_price_cents`           |
| `lib/ingredients/pricing.ts`                 | `updateIngredientPriceFields` excludes OpenClaw rows from average, sets source attribution          |
| `.openclaw-build/lib/smart-lookup.mjs`       | Added `smartLookupEnriched()` for full-context price lookups                                        |
| `.openclaw-build/services/sync-api.mjs`      | Added `POST /api/prices/enriched` and `POST /api/catalog/suggest` endpoints                         |
| `.openclaw-build/services/scraper-flipp.mjs` | Integrated unit normalization into scrape pipeline                                                  |
| `.openclaw-build/services/watchdog.mjs`      | Added hung scraper killer (protects Pi's 1GB RAM)                                                   |
| `docs/specs/openclaw-v2-unified-pricing.md`  | Status: draft -> built                                                                              |

## Architecture Highlights

**8-Tier Resolution Chain** (`resolve-price.ts`):

1. Receipt (confidence 1.0) - chef's own purchase
2. API Quote (0.75) - Kroger/Spoonacular/MealMe from `grocery_price_quote_items`
3. Direct scrape (0.85) - store website price
4. Flyer/circular (0.70) - weekly flyer price
5. Instacart (0.60) - adjusted delivery prices
6. Government/USDA (0.40) - regional baseline
7. Historical average (0.30) - chef's own purchase history
8. None - honest "no price data" state

**Batch Resolution**: `resolvePricesBatch()` resolves N ingredients in exactly 3 queries (receipts, API quotes, OpenClaw rows), then resolves tier priority in memory. No N+1.

**Granular Source Values**: `openclaw_flyer`, `openclaw_scrape`, `openclaw_instacart`, `openclaw_government`, `openclaw_receipt` (exact-match indexed queries, not LIKE patterns).

**Catalog Feedback Loop**: Unmatched chef ingredient names get pushed back to Pi via `POST /api/catalog/suggest`, growing the catalog automatically.

**Design Decisions**:

- `resolvePrice()` reads local PostgreSQL only, never calls the Pi (instant, <50ms)
- OpenClaw history rows excluded from `average_price_cents` (chef's actual purchase average stays pure)
- Government data already NE-regional; no additional multiplier applied
- All prices in integer cents, rounding only at display time
- Migration backfill correctly identifies manual vs OpenClaw sources from price history

## Issues Fixed (from self-review)

1. **Migration backfill**: No longer blindly marks all prices as `openclaw_legacy`. Now checks the most recent `ingredient_price_history` row to determine actual source.
2. **Missing grocery quotes tier**: Added `grocery_price_quote_items` as Tier 2 (API Quote, confidence 0.75). Reads from Kroger/Spoonacular/MealMe quotes within 30 days.
3. **Average price pollution**: `updateIngredientPriceFields` now filters out `openclaw_*` rows when computing `average_price_cents`, preserving the chef's actual purchase average.
4. **Consumer adoption**: Menu costing and grocery list generation now use `resolvePricesBatch()` instead of reading `last_price_cents` directly.

## Remaining Actions

1. **Pi deployment**: SCP `.openclaw-build/` files to Pi, restart sync-api, configure crontab.
2. **Phase 5 (Cloud normalization)**: Blocked on policy approval for Claude Haiku usage ($0.18/month estimate).
3. **Schema regeneration**: `drizzle-kit pull` hangs on this large schema. New columns work via raw SQL. Can regen when convenient.
4. **Lower-priority consumers**: `lib/grocery/pricing-actions.ts`, `lib/recipes/bulk-price-actions.ts`, `lib/finance/food-cost-actions.ts` still read `last_price_cents` directly. These can be migrated incrementally.

## Build Verification

- `npx tsc --noEmit --skipLibCheck`: zero errors in new/modified files
- `npx next build --no-lint`: clean exit
- Migration applied successfully to local database (backup taken first)
