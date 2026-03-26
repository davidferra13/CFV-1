# Unit-Aware Recipe Costing

**Date:** 2026-03-26
**Status:** Implemented

## Problem

The SQL function `compute_recipe_cost_cents()` does naive `quantity * cost_per_unit_cents` multiplication without checking if the recipe unit matches the ingredient's pricing unit. When a recipe uses "2 cups flour" and flour is priced at "$3.00/lb", the result is $6.00 instead of the correct ~$1.60. No warning is shown.

## Solution

Added a TypeScript-level unit-aware cost computation layer that:

1. Uses `computeIngredientCost()` from `lib/units/conversion-engine.ts` for accurate cross-type conversion
2. Looks up ingredient density from `ingredients.weight_to_volume_ratio`, falling back to 100+ common densities (USDA/King Arthur sources)
3. Applies yield percentage after conversion
4. Returns structured warnings when conversion is impossible

## How It Works

### Cost Computation Flow

```
addIngredientToRecipe() or updateRecipeIngredient()
  -> computeRecipeIngredientCost() [new helper]
    -> fetch ingredient pricing data (cost_per_unit_cents, price_unit, density)
    -> canConvert(recipeUnit, costUnit, density)?
      YES -> computeIngredientCost() with full conversion
      NO  -> naive fallback + warning: "unit_mismatch:cup:lb"
    -> apply yield_pct adjustment
    -> store in recipe_ingredients.computed_cost_cents
  -> refreshRecipeTotalCost() [new helper]
    -> SUM(computed_cost_cents) across all recipe ingredients
    -> store in recipes.total_cost_cents
    -> compute recipes.cost_per_serving_cents
```

### Warning Types

| Warning                    | Meaning                                               | Action                        |
| -------------------------- | ----------------------------------------------------- | ----------------------------- |
| `no_price`                 | Ingredient has no cost data                           | Cost shows null               |
| `unit_mismatch:cup:lb`     | Recipe uses cups, priced per lb, no density available | Naive cost stored, flag in UI |
| `conversion_failed:cup:lb` | Conversion engine returned null despite density       | Naive cost stored, flag in UI |
| `null`                     | No warning, cost is accurate                          | Accurate cost stored          |

### Density Resolution Order

1. `ingredients.weight_to_volume_ratio` (chef-specific, from ingredient record)
2. `COMMON_DENSITIES` lookup in `lib/units/conversion-engine.ts` (100+ items: flours, sugars, fats, dairy, liquids, grains, nuts, spices)
3. If neither available: conversion fails, warning returned

## Files Modified

- **`lib/recipes/actions.ts`**
  - `addIngredientToRecipe`: now computes and stores `computed_cost_cents`, returns `costWarning`
  - `updateRecipeIngredient`: recomputes cost when qty/unit changes, returns `costWarning`
  - `computeRecipeIngredientCost()`: new internal helper
  - `refreshRecipeTotalCost()`: new internal helper
  - `recomputeRecipeCosts()`: new exported action for bulk refresh

## What's Next

- Surface `costWarning` in the recipe ingredient form UI (show inline badge when unit mismatch detected)
- Add a "Recompute Costs" button on the recipe detail page that calls `recomputeRecipeCosts()`
- Batch recompute when ingredient prices are updated by the receipt loop
