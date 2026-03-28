# OpenClaw V2 Unified Pricing: Implementation Report

**Date:** 2026-03-28
**Spec:** `docs/specs/openclaw-v2-unified-pricing.md`
**Status:** Built (migration pending approval)

---

## What Changed

Unified three disconnected pricing systems (OpenClaw scraping, API quotes, manual receipts) into a single 7-tier resolution chain with full source attribution, confidence scoring, and freshness tracking.

## Files Created

| File                                                                 | Purpose                                                                                               |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `.openclaw-build/services/backup-db.mjs`                             | Nightly Pi SQLite backup (keeps 7 days, SCPs to ChefFlow)                                             |
| `.openclaw-build/lib/unit-normalization.mjs`                         | Category-aware unit standardization (proteins per-lb, eggs per-dozen, etc.)                           |
| `.openclaw-build/services/cross-match.mjs`                           | Cross-store price matching service                                                                    |
| `.openclaw-build/services/scraper-instacart-bulk.mjs`                | Bulk Instacart scraper                                                                                |
| `database/migrations/20260401000109_ingredient_price_enrichment.sql` | New columns + indexes for enriched pricing                                                            |
| `lib/pricing/resolve-price.ts`                                       | 7-tier price resolution chain (receipt > scrape > flyer > instacart > government > historical > none) |
| `components/pricing/price-badge.tsx`                                 | Unified price display: price/unit, store, freshness, confidence dots                                  |
| `data/openclaw-backups/`                                             | Directory for Pi database backups                                                                     |

## Files Modified

| File                                         | Change                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `lib/openclaw/sync.ts`                       | Complete V2 rewrite: enriched endpoint, granular sources, confidence, trends, catalog feedback loop |
| `.openclaw-build/lib/smart-lookup.mjs`       | Added `smartLookupEnriched()` for full-context price lookups                                        |
| `.openclaw-build/services/sync-api.mjs`      | Added `POST /api/prices/enriched` and `POST /api/catalog/suggest` endpoints                         |
| `.openclaw-build/services/scraper-flipp.mjs` | Integrated unit normalization into scrape pipeline                                                  |
| `.openclaw-build/services/watchdog.mjs`      | Added hung scraper killer (protects Pi's 1GB RAM)                                                   |
| `docs/specs/openclaw-v2-unified-pricing.md`  | Status: draft -> built                                                                              |

## Architecture Highlights

**7-Tier Resolution Chain** (`resolve-price.ts`):

1. Receipt (confidence 0.95) - chef's actual purchase
2. Direct scrape (0.85) - store website price
3. Flyer/circular (0.70) - weekly flyer price
4. Instacart (0.60) - adjusted delivery prices
5. Government/USDA (0.40) - regional baseline
6. Historical average (0.50) - chef's own purchase history
7. None - honest "no price data" state

**Granular Source Values**: `openclaw_flyer`, `openclaw_scrape`, `openclaw_instacart`, `openclaw_government`, `openclaw_receipt` (exact-match indexed queries, not LIKE patterns).

**Catalog Feedback Loop**: Unmatched chef ingredient names get pushed back to Pi via `POST /api/catalog/suggest`, growing the catalog automatically.

**Design Decisions**:

- `resolvePrice()` reads local PostgreSQL only, never calls the Pi (instant, <50ms)
- OpenClaw history rows excluded from `average_price_cents` (chef's actual purchase average stays pure)
- Government data already NE-regional; no additional multiplier applied
- All prices in integer cents, rounding only at display time

## Pending Actions

1. **Migration approval required**: `20260401000109_ingredient_price_enrichment.sql` adds columns to `ingredients` and index to `ingredient_price_history`. Additive only, no data loss risk. Needs explicit `drizzle-kit push` approval.
2. **Schema regeneration**: After migration, regenerate `types/database.ts` and Drizzle schema.
3. **Pi deployment**: SCP `.openclaw-build/` files to Pi, restart sync-api, configure crontab.
4. **Phase 5 (Cloud normalization)**: Blocked on policy approval for Claude Haiku usage ($0.18/month estimate).
5. **UI integration**: Existing components (`menu-cost-sidebar.tsx`, `price-alerts-widget.tsx`, `true-cost-breakdown.tsx`) can adopt `PriceBadge` and `resolvePricesBatch()`.

## Build Verification

- `npx tsc --noEmit --skipLibCheck`: zero errors in new/modified files
- `npx next build --no-lint`: clean exit
