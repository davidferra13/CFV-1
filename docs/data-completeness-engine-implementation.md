# OpenCLAW Data Completeness Engine - Implementation Notes

> **Date:** 2026-03-30
> **Spec:** `docs/specs/openclaw-data-completeness-engine.md`
> **Migration:** `database/migrations/20260401000140_data_completeness_engine.sql`

## What Was Built

11 phases (A through K) implementing the full data completeness pipeline for OpenCLAW.

### Files Created

| File                                            | Phase | Purpose                                            |
| ----------------------------------------------- | ----- | -------------------------------------------------- |
| `lib/openclaw/polish-job.ts`                    | B     | Orchestrates all enrichment steps (10 steps total) |
| `lib/openclaw/nutrition-enricher.ts`            | B     | Deterministic USDA linking (no AI)                 |
| `app/api/cron/openclaw-polish/route.ts`         | B     | Daily cron endpoint for polish job                 |
| `lib/pricing/resolve-price.ts` (modified)       | C     | Added `effectiveConfidence` + decay function       |
| `lib/openclaw/coverage-health.ts`               | D     | Coverage health report (tenant-scoped)             |
| `components/pricing/coverage-health-widget.tsx` | D     | Dashboard widget (admin only)                      |
| `lib/openclaw/region-config.ts`                 | E     | Geographic region configuration (4 regions)        |
| `lib/openclaw/refresh-schedule.ts`              | F     | Adaptive refresh cadences by volatility band       |
| `scripts/import-usda-portions.mjs`              | G     | USDA portion data import (14,449 records)          |
| `scripts/import-usda-retention.mjs`             | G     | Retention factors + yield + scaling flags          |
| `lib/openclaw/sale-cycle-detector.ts`           | H     | Sale cycle detection + prediction                  |
| `lib/openclaw/substitute-mapper.ts`             | I     | Ingredient substitute mapping (top 3)              |
| `lib/openclaw/package-optimizer.ts`             | I     | Package size best-value computation                |
| `lib/openclaw/trend-forecaster.ts`              | J     | Linear regression price forecasting                |
| `lib/openclaw/flyer-archiver.ts`                | K     | Historical flyer price archiving                   |

### Files Modified

| File                            | What Changed                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `lib/pricing/resolve-price.ts`  | Added `effectiveConfidence` field, `decayConfidence()`, `withDecay()` helper |
| `lib/openclaw/sync.ts`          | Added Step 9: non-blocking post-sync polish job trigger                      |
| `app/(chef)/dashboard/page.tsx` | Added admin-gated Coverage Health widget section                             |

### Database Changes (Migration 20260401000140)

**5 New Tables:**

- `ingredient_portions` - USDA portion measures per system ingredient
- `cooking_retention_factors` - Cooking yield by food group + method
- `ingredient_sale_cycles` - Predicted sale cycles per ingredient per store
- `ingredient_substitutes` - Top substitute recommendations
- `openclaw.flyer_archive` - Historical flyer price snapshots

**12+ New Columns** across `ingredients`, `chefs`, `system_ingredients`, `ingredient_price_history`, `openclaw.store_products`

**6+ New Indexes** for performance

All changes are additive (IF NOT EXISTS). No drops, no renames.

## Key Design Decisions

1. **Formula over AI everywhere.** Nutrition linking uses deterministic name matching. Sale cycles use statistical analysis. Forecasting uses linear regression. No LLM calls.

2. **Backward-compatible `effectiveConfidence`.** The existing `confidence` field stays untouched. New `effectiveConfidence` is computed at read time via decay function. All existing consumers unaffected.

3. **Non-blocking polish job.** Every step is wrapped in try/catch. If one fails, others continue. The main sync operation is never blocked.

4. **Region config is pure data.** Adding a region = one line in `REGIONS[]` array. No code changes, no migrations.

## Post-Build Steps Required

1. **Apply migration:** `drizzle-kit push` (after backup)
2. **Run USDA portion import:** `node scripts/import-usda-portions.mjs`
3. **Run USDA retention import:** `node scripts/import-usda-retention.mjs`
4. **Run initial polish job:** via dashboard admin action or `/api/cron/openclaw-polish`
5. **Verify coverage widget:** navigate to `/dashboard` as admin

## Phase E Note (Geographic Parameterization)

The region config (`region-config.ts`) is created with 4 regions. The spec calls for replacing 23+ hardcoded instances across Pi-side `.mjs` files and frontend components. The config is ready, but the actual replacement of hardcoded values in `prices-client.tsx`, `store-aisle-browser.tsx`, and Pi-side scripts needs a follow-up pass. Those files need to import from `region-config.ts` instead of using inline coordinates.
