# Cascading Food Cost Propagation + Sub-Recipe Costing

**Date:** 2026-03-09
**Migration:** `20260330000095_cascading_food_costs.sql`
**Branch:** `feature/risk-gap-closure`

## What Changed

### Database (Migration 95)

New columns added to existing tables (all additive, no destructive changes):

**`ingredients`**

- `cost_per_unit_cents` - Canonical cost per default unit (cents). Updated from price history or manual entry.
- `unit_type` - Classification: weight, volume, each, length. Drives future unit conversion.
- `weight_to_volume_ratio` - Grams per mL for cross-unit conversion (e.g. flour = 0.593).
- `default_yield_pct` - Standard yield after prep (100 = no loss, 85 = 15% trim). Used as fallback when recipe_ingredient doesn't override.

**`recipe_ingredients`**

- `prep_action` - Text describing prep method (peel, dice, fillet, etc.).
- `yield_pct` - Per-line yield override (100 = no loss). Overrides ingredient default when set.
- `computed_cost_cents` - Stored computation: `(cost * quantity * 100) / yield_pct`. Updated by cascade engine.

**`recipes`**

- `total_cost_cents` - Stored sum of all ingredient + sub-recipe costs.
- `cost_per_serving_cents` - `total_cost_cents / yield_quantity`.

**`events`**

- `cost_needs_refresh` - Boolean flag. Set true when upstream costs change.
- `cost_refreshed_at` - Timestamp of last chef review.

### Updated SQL Functions

- `compute_recipe_cost_cents(recipe_id)` - Now yield-aware. Uses `cost_per_unit_cents` with fallback to `last_price_cents`. Divides by yield percentage.
- `recompute_and_store_recipe_cost(recipe_id)` - New. Computes and persists `total_cost_cents` + `cost_per_serving_cents`.
- `recompute_recipe_ingredient_costs(recipe_id)` - New. Bulk-updates `computed_cost_cents` on all recipe_ingredients.
- `recipe_cost_summary` view - Updated to prefer stored costs, includes `sub_recipe_count`.

### TypeScript Engine (`lib/costing/`)

**`cascade-engine.ts`** - Server actions for cost propagation:

- `recomputeRecipeCost(recipeId)` - Full recompute for one recipe (ingredients + sub-recipes).
- `cascadeIngredientPriceChange(ingredientId, newCostCents)` - The main cascade: updates ingredient cost, recomputes all recipes using it, walks up through sub-recipe parents, finds affected menus, flags events.
- `recomputeMenuCost(menuId)` - Sum all component recipe costs on a menu.
- `getRecipeCostBreakdown(recipeId)` - Detailed cost tree with ingredients, sub-recipes, yield info, and missing-price detection.
- `flagEventCostRefresh(eventId)` / `clearEventCostRefresh(eventId)` - Mark/clear events for cost review.

**`sub-recipe-actions.ts`** - Server actions for sub-recipe management:

- `linkSubRecipe(parentId, childId, quantity, unit)` - Link with circular reference protection (DB trigger).
- `unlinkSubRecipe(parentId, childId)` - Remove link, recompute parent.
- `getSubRecipeTree(recipeId)` - Full recursive tree with costs at each node.
- `scaleRecipe(recipeId, targetYield)` - Read-only scaled ingredient list with cost projections.

**`yield-calculator.ts`** - Deterministic yield math (no server, no AI):

- `COMMON_YIELDS` - 40+ industry-standard yields for common prep actions (peel, fillet, dice, reduce, etc.).
- `calculatePrepYield(raw, yieldPct)` - Usable product after prep.
- `calculateRawNeeded(target, yieldPct)` - How much to buy for a target usable amount.
- `calculateCostPerUsableUnit(cost, yieldPct)` - True cost after waste.
- `calculateCostWithYield(cost, qty, yieldPct)` - Core formula for recipe ingredient cost.
- `calculateWasteCost(cost, qty, yieldPct)` - Money spent on trim/waste.
- `calculateFoodCostPercentage(recipeCost, sellingPrice)` - Food cost % for profitability.
- `getDefaultYieldForAction(action)` / `getAllPrepActions()` - Lookup helpers for UI.

## How the Cascade Works

```
Ingredient price changes
  -> Find all recipe_ingredients using this ingredient
  -> Recompute each recipe_ingredient.computed_cost_cents
  -> Sum to update recipe.total_cost_cents + cost_per_serving_cents
  -> Find parent recipes via recipe_sub_recipes (BFS upward)
  -> Recompute each parent recipe
  -> Find menus via components that reference updated recipes
  -> Find events linked to affected menus
  -> Set events.cost_needs_refresh = true
```

## What Already Existed (Not Modified)

- `recipe_sub_recipes` table with circular reference prevention (migration 20260324000007)
- `ingredient_price_history` table (migration 20260216000003)
- `lib/ingredients/pricing.ts` - Price logging + alerts (uses `ingredient_price_history`)
- `compute_menu_cost_cents()` - Unchanged, still works
- `recipe_cost_summary` view - Replaced with yield-aware version

## Design Decisions

1. **Stored vs computed costs**: Recipe costs are stored (`total_cost_cents`) for fast reads, but recomputed on demand via cascade. The SQL function `compute_recipe_cost_cents()` remains available as a verification/fallback.

2. **Yield priority**: `recipe_ingredient.yield_pct` overrides `ingredient.default_yield_pct`. If neither is set, 100% yield (no loss) is assumed.

3. **Cost priority**: `ingredient.cost_per_unit_cents` is preferred over `ingredient.last_price_cents`. The latter is a V1 field from price history. New code should set `cost_per_unit_cents`.

4. **Scale is read-only**: `scaleRecipe()` returns projected quantities/costs but does not persist changes. The chef decides whether to create a new recipe or update the existing one.

5. **Formula > AI**: All calculations are deterministic math. Zero Ollama dependency.
