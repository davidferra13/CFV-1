# Recipe Nutrition Panel — USDA Integration

**Date:** 2026-02-26
**Feature:** Aggregated nutrition summary on recipe detail page using USDA FoodData Central

## What Changed

Wired the existing USDA nutrition API (`lib/nutrition/usda.ts`) into the recipe detail page so chefs can see estimated nutrition data (calories, protein, fat, carbs, fiber, sodium) for any recipe based on its ingredients.

## Files Created

| File                                     | Purpose                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `lib/recipes/nutrition-actions.ts`       | Server action `getRecipeNutrition(recipeId)` — fetches ingredients, searches USDA for each, aggregates totals |
| `components/recipes/nutrition-panel.tsx` | Client component — on-demand nutrition card with macro grid + per-ingredient breakdown                        |

## Files Modified

| File                                               | Change                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx` | Added `NutritionPanel` import + placed component after Scaling Calculator |

## How It Works

1. **On-demand only** — chef clicks "Show Nutrition" button. No automatic API calls on page load.
2. **Per ingredient:** searches USDA FoodData Central for the ingredient name, picks the best match, gets nutrition per 100g.
3. **Unit conversion:** converts the recipe's quantity + unit to estimated grams using a deterministic lookup table in the server action (weight units are exact, volume units use water-density approximation).
4. **Scaling:** USDA data is per 100g. The server action scales each ingredient's nutrition by `(estimatedGrams / 100)`.
5. **Aggregation:** sums all matched ingredients for whole-recipe totals, then divides by `yield_quantity` for per-serving amounts.
6. **Caching:** USDA lookups are cached 30 days in Upstash Redis (upstream in `lib/nutrition/usda.ts`), so repeat views are instant.

## UI Features

- **Macro grid:** 6-card layout showing calories, protein, fat, carbs, fiber, sodium
- **Toggle:** per-serving vs whole-recipe view
- **Ingredient breakdown:** collapsible table showing what each ingredient contributes + the USDA match name
- **Missing indicator:** badge showing how many ingredients couldn't be matched
- **Loading state:** spinner with ingredient count
- **Error handling:** graceful "Nutrition data unavailable" message with retry button

## Unit Conversion Approach

Weight units (g, oz, lb, kg) are converted exactly. Volume units (cup, tbsp, tsp, ml, etc.) use water-density approximation (1 mL ~ 1 g). Count-based units (each, clove, bunch) use rough averages. This is clearly labeled as an estimate in the UI.

## Architecture Notes

- Follows Formula > AI principle — all aggregation is deterministic math, no LLM involved
- Server action uses `requireChef()` for auth + tenant scoping
- `'use server'` file exports only async functions (no constants exported)
- All USDA API calls wrapped in try/catch — if API is down, ingredient shows as "No match"
- No database changes required — reads existing `recipes` + `recipe_ingredients` tables

## Relationship to Existing Nutrition Features

- `components/recipes/nutrition-lookup-panel.tsx` — pre-existing **manual search** tool (search by name, pick a food, see its per-100g data). Still available on the ingredients page.
- `components/recipes/nutrition-panel.tsx` (new) — **automatic aggregation** across all recipe ingredients. Uses the same USDA API but aggregates for the whole recipe.

## Future Improvements

- Ingredient-specific density tables (e.g., flour = 0.6 g/mL, honey = 1.4 g/mL) for more accurate volume conversions
- Cache the aggregated recipe nutrition result (not just individual USDA lookups)
- Show macro percentage breakdown (% calories from protein/fat/carbs)
- Print-friendly nutrition label format
