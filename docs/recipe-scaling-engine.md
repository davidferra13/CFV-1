# Recipe Scaling Engine

**Status:** Implemented (Phase 1)
**Date:** 2026-03-09
**Branch:** feature/risk-gap-closure

## What It Does

Pure math scaling for menu recipes based on guest count. No AI.

Given a menu with dishes, components linked to recipes, and a guest count:

1. For each component with a linked recipe, calculates: `guest_count / recipe.yield_quantity * component.scale_factor = multiplier`
2. Applies that multiplier to every recipe ingredient quantity
3. Aggregates all scaled ingredients into a consolidated shopping list grouped by store section
4. Computes total food cost and cost-per-guest from ingredient pricing

## Key Files

| File                                       | Purpose                                                  |
| ------------------------------------------ | -------------------------------------------------------- |
| `lib/scaling/recipe-scaling.ts`            | Core scaling engine (server action)                      |
| `components/culinary/MenuScalingPanel.tsx` | UI panel with two views (dish breakdown + shopping list) |
| `app/(chef)/culinary/menus/[id]/page.tsx`  | Menu detail page (scaling panel added here)              |

## How It Works

### Data Flow

```
Event (guest_count: 40)
  -> Menu (target_guest_count: 40)
    -> Dish: "Cheese Board"
      -> Component: "Brie Prep" (scale_factor: 1, recipe_id: ...)
        -> Recipe: yields 8 servings
          -> Multiplier: 40/8 * 1 = 5x
          -> Ingredient: Brie 2 lbs -> 10 lbs
          -> Ingredient: Herbs 0.5 oz -> 2.5 oz
```

### Two Views

1. **By Dish** - shows each dish, its components, the multiplier math, and the full scaled ingredient table
2. **Shopping List** - consolidates all ingredients across all dishes, grouped by store section (Produce, Dairy, Protein, Pantry, etc.), with totals

### Quantity Rounding

- Small quantities (< 10): 2 decimal places (0.25 oz)
- Medium (10-100): 1 decimal place (12.5 lbs)
- Large (> 100): whole numbers (150 g)

### Cost Calculation

Yield-adjusted: `(unit_cost * scaled_quantity * 100) / yield_pct`

If an ingredient has 85% yield (15% trim/waste), the cost reflects the fact that you need to buy more to get the usable amount.

## What It Surfaces (Warnings)

- **Missing Prices** - ingredients without cost data (amber warning)
- **No Yield Data** - recipes without yield_quantity (can't calculate multiplier)
- **No Recipe Linked** - components not linked to any recipe (can't scale)

## Prerequisites for Accurate Results

1. Recipes need `yield_quantity` set (e.g., "serves 8", "makes 2 boards")
2. Recipe ingredients need quantities and units
3. Ingredient pricing (cost_per_unit_cents or last_price_cents) for cost estimates
4. Components linked to recipes via recipe_id

## What's Next (Phase 1 Roadmap)

- [ ] Consolidated shopping list as standalone printable/shareable page
- [ ] Portioning calculator (per-person industry standards)
- [ ] Prep timeline (backwards-plan from serve time)
