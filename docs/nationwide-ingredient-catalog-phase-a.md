# Nationwide Ingredient Catalog - Phase A Complete

> **Date:** 2026-03-30
> **Spec:** `docs/specs/nationwide-ingredient-catalog.md`
> **Commit:** b77b6bda

## What Changed

The `system_ingredients` table grew from 563 items to 5,435 active ingredients covering every food ingredient available in American commerce.

### Data Sources

1. **USDA SR Legacy** (April 2018, public domain): 7,793 foods across 25 food groups. After filtering 6 non-ingredient groups (baby foods, breakfast cereals, fast foods, meals/entrees, snacks, restaurant foods) and collapsing protein variants (e.g., 954 beef items to ~50 canonical cuts), 4,668 canonical ingredients were produced. Of those, 28 merged with existing rows and 4,640 were inserted new.

2. **Supplemental ethnic/specialty ingredients** (318 items across 14 cuisine traditions): Korean, Japanese, Chinese, Thai, Indian, Mexican, Latin American, Italian, French, Middle Eastern, Ethiopian, Caribbean, Southeast Asian, and specialty ingredients not in the USDA dataset. 86 merged with existing or USDA items, 232 inserted new.

### Schema Changes (Migration 20260401000137)

Five new columns on `system_ingredients`:

| Column            | Type    | Purpose                                                                |
| ----------------- | ------- | ---------------------------------------------------------------------- |
| `usda_fdc_id`     | integer | Links to USDA FoodData Central                                         |
| `usda_ndb_number` | integer | Legacy NDB nutrient database number                                    |
| `usda_food_group` | text    | Original USDA food group name                                          |
| `slug`            | text    | URL-safe unique identifier                                             |
| `aliases`         | text[]  | Search aliases (original USDA description, reverse-comma format, etc.) |

Three new indexes: unique on `slug`, unique on `usda_fdc_id`, GIN on `aliases`.

### Files Created

- `scripts/import-usda-sr-legacy.mjs` - Idempotent import pipeline with --dry-run support
- `scripts/data/usda-category-mapping.json` - 19 group defaults + 9 keyword override rules
- `scripts/data/usda-excluded-groups.json` - 6 excluded food group IDs
- `scripts/data/supplemental-ingredients.json` - 318 ethnic/specialty ingredients

### Files Modified

- `lib/db/schema/schema.ts` - Added 8 columns + 3 indexes to systemIngredients
- `types/database.ts` - Added corresponding TypeScript types
- `drizzle.config.ts` - Fixed fallback DB connection string
- `lib/db/index.ts` - Fixed fallback DB connection string

## What's Next (Phase B)

Phase B is not yet spec'd. Planned components:

- Catalog browser UI (search, filter, browse by category)
- Geographic pricing integration (OpenClaw accuracy cron)
- Kroger API, BLS/ERS data imports
- Cross-tenant regional price averages

## Known Issues

- `regional_price_averages` materialized view (migration 136) has no `tenant_id` filter, making it cross-tenant by design. This is intentional for aggregate pricing but should be documented.
- Supplemental list covers 318 items. Could be expanded further for more niche cuisines.
