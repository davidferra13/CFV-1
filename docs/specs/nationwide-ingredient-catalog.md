# Spec: Nationwide Ingredient Catalog (Phase A - Dictionary Expansion)

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** none (Phase B specs will depend on this)
> **Estimated complexity:** medium (3-8 files)
> **Created:** 2026-03-30
> **Built by:** not started

---

## What This Does (Plain English)

After this is built, ChefFlow's ingredient dictionary grows from ~500 items to ~6,000+ items covering every food ingredient available in American commerce. The source is the USDA SR Legacy database (7,793 generic foods, public domain, free CSV), filtered and collapsed into chef-relevant canonical ingredients. Every item has a clean name, aliases for search, a category, and a USDA identifier linking it to the government's nutrition database.

This is Phase A: the dictionary only. No new UI, no pricing changes, no sync changes. The dictionary is the foundation that Phase B builds on (catalog browser, geographic pricing, OpenClaw accuracy cron).

---

## Why It Matters

A chef should be able to look up any ingredient and get a price. The foundation is a complete A-Z list. Today we have 500 system ingredients; the USDA has 7,793 cataloged. Without the complete list, chefs searching for "galangal" or "duck confit" or "black garlic" find nothing. With it, every ingredient exists in the system, ready to be priced.

---

## Files to Create

| File                                                                     | Purpose                                                                                                                                                           |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/import-usda-sr-legacy.mjs`                                      | Import script: downloads SR Legacy CSV, parses, filters, collapses variants, maps categories, deduplicates against existing data, upserts into system_ingredients |
| `scripts/data/usda-category-mapping.json`                                | Mapping table: USDA food_category_id -> ingredient_category enum, with item-level overrides for ambiguous groups                                                  |
| `scripts/data/usda-excluded-groups.json`                                 | List of USDA food group IDs to exclude (baby foods, fast foods, restaurant foods, etc.)                                                                           |
| `scripts/data/supplemental-ingredients.json`                             | ~500 ethnic/specialty ingredients not in SR Legacy (gochujang, za'atar, galangal, etc.)                                                                           |
| `database/migrations/20260401000137_system_ingredients_usda_columns.sql` | Migration: add usda_fdc_id, usda_ndb_number, usda_food_group, slug, aliases columns                                                                               |

---

## Files to Modify

| File                      | What to Change                                                        |
| ------------------------- | --------------------------------------------------------------------- |
| `lib/db/schema/schema.ts` | Will be auto-regenerated after migration via `drizzle-kit introspect` |
| `types/database.ts`       | Will be auto-regenerated after migration via `drizzle-kit introspect` |

---

## Database Changes

### New Columns on `system_ingredients`

```sql
-- USDA identifiers for linking to FoodData Central
ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS usda_fdc_id INTEGER,
  ADD COLUMN IF NOT EXISTS usda_ndb_number INTEGER,
  ADD COLUMN IF NOT EXISTS usda_food_group TEXT;

-- Search and deduplication support
ALTER TABLE system_ingredients
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';

-- Unique constraints for idempotent imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_ingredients_slug
  ON system_ingredients(slug) WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_ingredients_fdc_id
  ON system_ingredients(usda_fdc_id) WHERE usda_fdc_id IS NOT NULL;

-- GIN index on aliases for array search
CREATE INDEX IF NOT EXISTS idx_system_ingredients_aliases
  ON system_ingredients USING GIN(aliases);
```

### Migration Notes

- Migration filename: `20260401000137_system_ingredients_usda_columns.sql` (next after 20260401000136)
- All changes are additive (new columns, new indexes)
- No DROP, DELETE, or TRUNCATE
- Existing 500 rows are untouched by this migration (data import is a separate script)
- The `slug` column is nullable to preserve existing rows; new imports will always have a slug

---

## Data Model

### Source Data: USDA SR Legacy CSV

**Download:** `https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip` (5.8 MB)

**Key files used:**

- `food.csv` (7,793 rows): `fdc_id, data_type, description, food_category_id, publication_date`
- `sr_legacy_food.csv` (7,793 rows): `fdc_id, NDB_number`
- `food_category.csv` (25 active groups): `id, code, description`
- `food_portion.csv` (14,449 rows): `fdc_id, modifier, gram_weight`

### USDA Food Groups -> ingredient_category Mapping

The 16-value `ingredient_category` ENUM is NOT expanded. All 25 USDA groups map to existing values:

| USDA Code | USDA Group                                | Maps To     | Notes                                                                                                      |
| --------- | ----------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| 0100      | Dairy and Egg Products (291)              | `dairy`     | Default. Eggs also map here.                                                                               |
| 0200      | Spices and Herbs (63)                     | `spice`     | Default. Fresh herbs get `fresh_herb` via keyword override.                                                |
| 0300      | Baby Foods (345)                          | EXCLUDED    | Not relevant to chefs                                                                                      |
| 0400      | Fats and Oils (216)                       | `oil`       | Default                                                                                                    |
| 0500      | Poultry Products (383)                    | `protein`   | Default                                                                                                    |
| 0600      | Soups, Sauces, and Gravies (254)          | `condiment` | Default. Items containing "soup" get `pantry` override.                                                    |
| 0700      | Sausages and Luncheon Meats (167)         | `protein`   | Default                                                                                                    |
| 0800      | Breakfast Cereals (195)                   | EXCLUDED    | Not relevant to chefs (branded products)                                                                   |
| 0900      | Fruits and Fruit Juices (355)             | `produce`   | Default. Juice items get `beverage` override.                                                              |
| 1000      | Pork Products (336)                       | `protein`   | Default                                                                                                    |
| 1100      | Vegetables and Vegetable Products (814)   | `produce`   | Default. Items containing "canned" get `canned` override. Items containing "frozen" get `frozen` override. |
| 1200      | Nut and Seed Products (137)               | `pantry`    | Default                                                                                                    |
| 1300      | Beef Products (954)                       | `protein`   | Default                                                                                                    |
| 1400      | Beverages (366)                           | `beverage`  | Default. Alcoholic items get `alcohol` override.                                                           |
| 1500      | Finfish and Shellfish Products (264)      | `protein`   | Default                                                                                                    |
| 1600      | Legumes and Legume Products (290)         | `pantry`    | Default. Items containing "fresh" or "raw green" get `produce` override.                                   |
| 1700      | Lamb, Veal, and Game Products (464)       | `protein`   | Default                                                                                                    |
| 1800      | Baked Products (517)                      | `baking`    | Default. Bread items get `pantry` override.                                                                |
| 1900      | Sweets (358)                              | `baking`    | Default. Sugar/honey/syrup get `pantry` override. Candy get `specialty` override.                          |
| 2000      | Cereal Grains and Pasta (181)             | `pantry`    | Default                                                                                                    |
| 2100      | Fast Foods (312)                          | EXCLUDED    | Not relevant to chefs                                                                                      |
| 2200      | Meals, Entrees, and Side Dishes (81)      | EXCLUDED    | Not relevant to chefs (prepared meals)                                                                     |
| 2500      | Snacks (176)                              | EXCLUDED    | Not relevant to chefs (branded snacks)                                                                     |
| 3500      | American Indian/Alaska Native Foods (165) | `specialty` | Default                                                                                                    |
| 3600      | Restaurant Foods (109)                    | EXCLUDED    | Not relevant to chefs (prepared dishes)                                                                    |

**Excluded groups total:** 0300 + 0800 + 2100 + 2200 + 2500 + 3600 = 1,508 items removed

**Item-level keyword overrides** (applied after group-level mapping):

- Description contains "frozen" -> `frozen`
- Description contains "canned" -> `canned`
- Description contains "juice" (in fruit group) -> `beverage`
- Description contains "wine" or "beer" or "liqueur" -> `alcohol`
- Description contains "soup" (in soups group) -> `pantry`
- Description contains "bread" or "roll" or "muffin" (in baked group) -> `pantry`
- Description contains "sugar" or "honey" or "syrup" or "molasses" (in sweets) -> `pantry`
- Description contains "candy" or "chocolate" (in sweets) -> `specialty`
- Description contains "fresh" and is in spices group -> `fresh_herb`

### Variant Collapse Algorithm

SR Legacy has extreme granularity for proteins (954 beef items alone). The import script collapses variants:

**Step 1: Parse each description into components**

```
Input:  "Beef, chuck, arm pot roast, separable lean and fat, trimmed to 1/8" fat, all grades, cooked, braised"
Parsed: { base: "beef", cut: "chuck arm pot roast", modifiers: ["separable lean and fat", "trimmed to 1/8 fat"], grade: "all grades", state: "cooked", method: "braised" }
```

**Step 2: Generate canonical key**

```
Key: "beef-chuck-arm-pot-roast" (base + cut, slugified)
```

**Step 3: Group by canonical key, keep the best representative**
Priority: `raw` > no cooking state > `cooked`
If multiple raw variants exist (different fat trims, grades): keep the most generic one (e.g., "all grades" over "select" or "choice")

**Step 4: Store other variants as aliases**
The canonical item gets aliases from all collapsed variants' descriptions.

**Expected output:** ~3,500-4,500 canonical items from 6,285 (after exclusions)

### Alias Generation

For each canonical item, generate searchable aliases:

1. **Reverse comma format:** "Cheese, cheddar" -> "cheddar cheese"
2. **Strip parenthetical notes:** "Chicken breast (boneless, skinless)" -> "chicken breast"
3. **Strip scientific/technical modifiers:** remove "separable lean and fat", "trimmed to X", "meat only", "all grades"
4. **Common abbreviations:** "extra virgin olive oil" -> ["evoo"], "all-purpose flour" -> ["ap flour"]
5. **Store original USDA description** as an alias for exact-match queries

### Deduplication Against Existing 500 Items

For each imported item, before INSERT:

1. Generate slug from canonical name
2. Check: `SELECT id, name FROM system_ingredients WHERE slug = $1`
3. If exact slug match: UPDATE existing row (add usda_fdc_id, aliases), NEVER overwrite density/allergen/prep data
4. If no exact match: check pg_trgm similarity > 0.6 against all existing names
5. If fuzzy match > 0.6: UPDATE existing row (add usda_fdc_id, aliases), NEVER overwrite enrichment data
6. If no match: INSERT new row

**CRITICAL: The UPDATE must use a column exclusion list:**

```sql
UPDATE system_ingredients SET
  usda_fdc_id = $fdc_id,
  usda_ndb_number = $ndb,
  usda_food_group = $group,
  slug = COALESCE(slug, $slug),
  aliases = COALESCE(aliases, '{}') || $new_aliases
WHERE id = $existing_id
-- NEVER update: weight_to_volume_ratio, cup_weight_grams, tbsp_weight_grams,
--               allergen_tags, common_prep_actions, cost_per_unit_cents
```

### food_portion.csv Integration

For items that have portion data in food_portion.csv:

1. Parse `modifier` field: extract unit keyword (cup, tbsp, medium, large, slice, piece, each)
2. If modifier maps to a count unit AND system_ingredient has no count_weight_grams:
   - Set `count_unit` = parsed unit
   - Set `count_weight_grams` = gram_weight / amount
   - Set `count_notes` = original modifier text
3. Skip items that already have count data (from migration 20260401000136)

---

## Server Actions

None. This is a data import operation run as a script, not a server action.

---

## UI / Component Spec

None. Phase A is dictionary-only. The "Browse Catalog" UI is Phase B.

---

## Edge Cases and Error Handling

| Scenario                                        | Correct Behavior                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| USDA description contains em dashes             | Replace with hyphens during import                                  |
| Duplicate slugs after collapse                  | Append numeric suffix: "chicken-breast-2"                           |
| food_portion modifier is unparseable            | Skip portion data for that item, log warning                        |
| Existing system_ingredient has no slug          | Generate slug from existing name during UPDATE                      |
| Import interrupted mid-way                      | Script is idempotent (ON CONFLICT on slug/fdc_id). Re-run safely.   |
| pg_trgm extension not available                 | Fall back to exact ILIKE matching for dedup (less precise but safe) |
| USDA description exceeds reasonable length      | Truncate to 200 chars for name, store full description in aliases   |
| Supplemental item conflicts with SR Legacy item | SR Legacy wins (has FDC ID), supplemental stored as alias           |

---

## Verification Steps

1. Run migration: verify 5 new columns exist on system_ingredients
2. Run import script: verify output shows items processed, merged, inserted, skipped
3. `SELECT COUNT(*) FROM system_ingredients WHERE is_active = true` >= 5,500
4. `SELECT COUNT(*) FROM system_ingredients WHERE usda_fdc_id IS NOT NULL` >= 4,000
5. `SELECT COUNT(*) FROM system_ingredients WHERE slug IS NULL` = 0 (all items have slugs after import)
6. `SELECT COUNT(*) FROM system_ingredients WHERE aliases IS NULL OR array_length(aliases, 1) = 0` should be small (< 100)
7. `SELECT COUNT(*) FROM system_ingredients WHERE category IS NULL` = 0
8. Verify dedup: `SELECT slug, COUNT(*) FROM system_ingredients GROUP BY slug HAVING COUNT(*) > 1` = 0 rows
9. Verify enrichment preserved: `SELECT COUNT(*) FROM system_ingredients WHERE weight_to_volume_ratio IS NOT NULL` >= 450 (close to original 500)
10. Search test: query `SELECT name FROM system_ingredients WHERE extensions.similarity(lower(name), 'chicken breast') > 0.3 ORDER BY extensions.similarity(lower(name), 'chicken breast') DESC LIMIT 10` returns < 10 distinct canonical items (not 47 variants)
11. Search test: `SELECT name FROM system_ingredients WHERE 'saffron' = ANY(aliases) OR name ILIKE '%saffron%'` returns result
12. `npx tsc --noEmit --skipLibCheck` exits 0
13. `npx next build --no-lint` exits 0

---

## Out of Scope

- "Browse Catalog" UI for chefs (Phase B)
- Geographic pricing / state-level resolution (Phase B)
- OpenClaw accuracy cron (Phase B)
- Pi sync modifications to include system_ingredients names (Phase B)
- Kroger API integration (Phase B)
- BLS/ERS price data imports (Phase B)
- Wholesale vs retail pricing (Phase B)
- Privacy framework for cross-chef price aggregation (Phase B)
- Expanding the ingredient_category ENUM (not needed for Phase A)

---

## Notes for Builder Agent

1. **Download first, inspect second.** Before writing any import logic, download the SR Legacy zip, extract it, and look at 50 random rows from food.csv. The descriptions are more verbose than expected. "Butter, salted" is clean. "Beef, round, top round roast, boneless, separable lean and fat, trimmed to 0" fat, all grades, raw" is typical.

2. **The variant collapse is the hardest part.** Beef (954), Poultry (383), Pork (336), Lamb/Veal/Game (464) together are 2,137 items that need to become ~200-300 canonical proteins. The collapse algorithm must handle the USDA's consistent format: "Animal, cut/part, modifiers, grade, cooking state."

3. **Test the pg_trgm threshold.** At 500 items, similarity > 0.3 works. At 6,000 items, it may produce too many false positives. Run the search tests in Verification Step 10 and adjust if needed. The threshold change would be in `lib/pricing/ingredient-matching-actions.ts:77`.

4. **The script runs OUTSIDE the app.** It's a standalone Node.js script in `scripts/`, not a server action. It connects to the database directly via `DATABASE_URL`. Use the pattern in `scripts/lib/database.mjs` for the PostgreSQL connection.

5. **Idempotency is mandatory.** The script will be re-run as we refine the mapping tables and add supplemental items. Every operation must use ON CONFLICT or check-before-insert. Running it twice must produce identical results.

6. **Slug generation:** Use `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`. Max length 200 chars.

7. **No em dashes** in any imported name, alias, or description. The USDA data is clean but verify.

8. **Drizzle schema regeneration:** After applying the migration, run `npx drizzle-kit introspect` to regenerate `lib/db/schema/schema.ts` and then regenerate `types/database.ts`. This also fixes the missing count\_\* columns from migration 20260401000136.

9. **Supplemental ingredients format:**

```json
[
  { "name": "Gochujang", "category": "condiment", "subcategory": "korean", "aliases": ["korean chili paste", "red pepper paste"], "unit_type": "weight", "standard_unit": "g" },
  ...
]
```

10. **The import script should produce a summary report:**

```
USDA SR Legacy Import Summary
=============================
Total SR Legacy items:     7,793
Excluded (filtered):       1,508
Pre-collapse:              6,285
Post-collapse (canonical): 4,200
Merged with existing:        380
New items inserted:        3,820
Supplemental items:          500
Final total:               ~6,000
Aliases generated:        18,500
Portion data imported:     3,200
```
