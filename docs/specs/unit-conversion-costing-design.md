# Unit Conversion in Recipe Costing - Design Doc

> **Status:** DRAFT
> **Priority:** CRITICAL (Q1 from menu-costing-interrogation.md)
> **Problem:** `compute_recipe_cost_cents` does `quantity * last_price_cents` with zero unit conversion. Recipe "2 lbs butter" with price "$0.50/oz" produces $1.00 instead of $16.00.

---

## Current State

### What exists

1. **`lib/units/conversion-engine.ts`** - Full unit conversion engine:
   - `normalizeUnit(unit)` - "lbs" -> "lb", "ounces" -> "oz", etc.
   - `convertQuantity(qty, from, to)` - same-type conversions (weight-to-weight, volume-to-volume)
   - `convertWithDensity(qty, from, to, density)` - cross-type (volume-to-weight) using g/mL density
   - `computeIngredientCost(qty, recipeUnit, costPerUnitCents, costUnit, density)` - THE function that should be used but isn't

2. **`lib/costing/knowledge.ts`** - Conversion factors (WEIGHT_CONVERSIONS, VOLUME_CONVERSIONS)

3. **Database columns already present:**
   - `recipe_ingredients.unit` - the unit the recipe uses (e.g., "lbs")
   - `ingredients.price_unit` - the unit the price is stored in (e.g., "oz")
   - `ingredients.last_price_cents` - price per price_unit
   - `ingredients.cost_per_unit_cents` - another price field (sometimes populated)
   - `ingredients.density_g_per_ml` - density for cross-type conversion (nullable)

### What's broken

`compute_recipe_cost_cents` (SQL function, Layer 4 migration line 841):

```sql
CASE
  WHEN i.last_price_cents IS NOT NULL THEN
    (ri.quantity * i.last_price_cents)::INTEGER
  ELSE 0
END
```

This multiplies recipe quantity by price-per-unit with NO conversion. If `ri.unit = 'lb'` and `i.price_unit = 'oz'`, the math is wrong by the conversion factor (16x for lb-to-oz).

### Why it hasn't blown up yet

Most chef recipe entries use the same unit for both recipe and price (e.g., "2 lbs butter" priced as "$X/lb"). The mismatch only shows when:

- Prices come from OpenClaw (often per-oz for weight items)
- Chef enters recipe in cups but price is per-lb
- Bulk items priced per-kg but recipe uses grams

---

## Proposed Solution

### Option A: Application-level computation (RECOMMENDED)

Replace the SQL function with an application-side cost calculator that uses `computeIngredientCost` from the conversion engine.

**Pros:**

- Uses the existing, tested conversion engine
- Density-aware (handles volume-to-weight)
- Unit alias normalization already built
- Easy to test and debug
- Can log conversion failures per-ingredient

**Cons:**

- `recipe_cost_summary` and `menu_cost_summary` views currently call `compute_recipe_cost_cents` in SQL. Would need to either (a) precompute and store costs, or (b) replace views with materialized tables refreshed by triggers/actions.

**Implementation steps:**

1. Add `computeRecipeCostApplication(recipeId)` server function that walks `recipe_ingredients`, calls `computeIngredientCost` for each, sums
2. Store computed cost in `recipes.total_cost_cents` (already exists) via a refresh action
3. Update `recipe_cost_summary` view to use `r.total_cost_cents` (already does via COALESCE)
4. Add a trigger or server action hook: when ingredient prices change, mark affected recipes as "cost stale"
5. Add a `recipes.cost_computed_at` timestamp to detect staleness
6. Batch refresh on menu open (if any recipe is stale, recompute)

### Option B: SQL-level conversion function

Create a `convert_unit(qty, from_unit, to_unit)` SQL function with a lookup table.

**Pros:**

- Views keep working without architectural change
- Single point of truth in database

**Cons:**

- Duplicates the conversion logic already in TypeScript
- No density support (volume-to-weight) without a density column join
- Harder to maintain two conversion systems in sync
- Unit alias normalization harder in SQL

### Option C: Hybrid - precompute `computed_cost_cents` per recipe_ingredient

Add a `computed_cost_cents` column to `recipe_ingredients`. Populate it via a server action that uses the TS conversion engine. The SQL view just sums the precomputed values.

**Pros:**

- Views stay fast (just SUM a column)
- Conversion logic stays in TypeScript where it's tested
- Per-ingredient cost visible in UI (already partially supported)
- Can show "conversion failed" per ingredient

**Cons:**

- Need to keep `computed_cost_cents` fresh (trigger on price change, recipe edit)
- Extra storage

---

## Recommendation

**Option C (hybrid)** is the cleanest path:

1. `recipe_ingredients.computed_cost_cents` already exists in some migrations
2. The conversion engine already exists and is tested
3. SQL views become simple SUMs (fast, no function calls)
4. Per-ingredient cost breakdown is already shown in the UI

### Migration plan

1. Ensure `recipe_ingredients.computed_cost_cents` column exists (check migrations)
2. Write `refreshRecipeIngredientCosts(recipeId)` using `computeIngredientCost`
3. Call it: (a) when a recipe ingredient is added/edited, (b) when ingredient price changes, (c) on menu open if stale
4. Update `compute_recipe_cost_cents` SQL to use `COALESCE(ri.computed_cost_cents, ri.quantity * i.last_price_cents)` as transition fallback
5. Bulk-refresh all recipes once via script
6. Remove the SQL fallback after verification

### Files to modify

| File                             | Change                                                             |
| -------------------------------- | ------------------------------------------------------------------ |
| `lib/recipes/actions.ts`         | Call `refreshRecipeIngredientCosts` after add/edit ingredient      |
| `lib/pricing/resolve-price.ts`   | After price resolution, trigger cost refresh for affected recipes  |
| `database/migrations/new`        | Update `compute_recipe_cost_cents` to prefer `computed_cost_cents` |
| `lib/units/conversion-engine.ts` | No changes needed (already complete)                               |
| `scripts/`                       | One-time bulk refresh script                                       |

### Effort estimate

- Migration + server function: ~2 hours
- Integration hooks (recipe edit, price change): ~1 hour
- Bulk refresh script: ~30 min
- Testing: ~1 hour
