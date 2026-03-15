# Feature 1.9: Recipe Scaling by Guest Count

## What Changed

Added a deterministic recipe scaling system that scales ingredient quantities based on a 4-category model, integrated with the existing smart scaling math from `portion-standards.ts`.

## Files Created

1. **`lib/recipes/recipe-scaling.ts`** - Pure functions (no server action):
   - `scaleRecipe(ingredients, originalYield, targetYield)` - scales all ingredients
   - `getScalingCategory(ingredientCategory)` - maps DB ingredient categories to 4 scaling buckets
   - `getScalingRate(category)` / `getScalingCategoryLabel(category)` - helpers

2. **`lib/recipes/scaling-actions.ts`** - Server actions:
   - `getScaledRecipe(recipeId, targetServings)` - fetches recipe + ingredients, applies scaling
   - `getScaledMenuForEvent(eventId)` - scales all recipes in an event's menu to guest_count

3. **`components/recipes/recipe-scaler.tsx`** - Client component:
   - Number input for target servings
   - Table with original/scaled quantities, units, and color-coded category badges
   - Warning banner at 4x+ scale factor
   - "Copy scaled recipe" clipboard export

4. **`components/recipes/scale-for-event-button.tsx`** - Button component:
   - "Scale for [Event Name] (X guests)" button
   - Opens inline scaled ingredient list pre-set to event's guest count

## 4-Category Scaling Model

| Category  | Rate                    | DB Categories Mapped                                                    | Rationale                                       |
| --------- | ----------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| Bulk      | 1.0x (linear)           | protein, produce, dairy, frozen, beverage, other                        | Weight-based, scales proportionally             |
| Flavor    | 0.75x                   | spice, fresh_herb, dry_herb, condiment, pantry, oil, alcohol, specialty | Flavor compounds concentrate in larger batches  |
| Structure | 1.0x (linear, warn >4x) | baking                                                                  | Chemistry-dependent ratios must stay exact      |
| Finishing | 0.60x                   | (available for explicit assignment)                                     | Garnishes and plating sauces need less at scale |

## Architecture Notes

- The 4-category model is a UI simplification. The actual math delegates to `smartScale()` from `portion-standards.ts`, which uses fine-grained per-ingredient-category exponents (0.75 to 1.0). This means the existing smart scaling behavior is fully preserved.
- The `scaleRecipe` function is a pure function, not a server action. It can be used anywhere without network overhead.
- The server actions use `requireChef()` + `user.tenantId!` for auth and tenant scoping.
- The event menu scaling traverses: events -> menus (event_id) -> dishes (menu_id) -> components (dish_id, recipe_id) -> recipes -> recipe_ingredients -> ingredients.

## How It Connects to Existing Code

- **`lib/recipes/portion-standards.ts`** - provides `smartScale()`, `formatScaledQty()`, and the per-category exponent system
- **`components/recipes/recipe-scaling-calculator.tsx`** - the existing more complex scaling calculator (course position, portion standards, override editing). The new `RecipeScaler` is a lighter-weight alternative focused on simple guest count scaling.
