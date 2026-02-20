# Recipe Scaling Calculator

## What Changed

Added a live scaling calculator panel to the recipe detail page (`app/(chef)/recipes/[id]/recipe-detail-client.tsx`).

## How It Works

The scaling panel appears on any recipe that has at least one ingredient. It lives between the Ingredients card and the Method card.

**Two modes:**

1. **Yield-based (preferred):** If the recipe has a `yield_quantity` set (e.g., "8 servings"), the chef enters a target guest count and the system computes `scaleFactor = target / base`. Example: base 8, target 22 → ×2.75.

2. **Multiplier mode:** If `yield_quantity` is null, the chef enters a raw multiplier (e.g., 2 = double the recipe).

All ingredient quantities are multiplied by the scale factor and displayed in a shaded panel. Quantities are formatted as culinary fractions (¼, ½, ¾, ⅓, ⅔, ⅛, etc.) rather than decimals wherever possible.

**Copy to Clipboard:** Produces a plain-text shopping/prep note:
```
Diane Sauce — scaled to 22 servings

22 tbsp shallots (minced)
1 ¾ cup cognac
...

Method:
Sear the steak, set aside. Sauté shallots...
```

## Why No Database Changes

Scaling is pure client-side math — no server roundtrip, no new columns. The `scale_factor` column already exists on the `components` table for event-level scaling (used by the grocery list generator), but this calculator is a standalone read-only view tool on the recipe page.

## Grocery List Already Scales

`lib/documents/generate-grocery-list.ts` already reads `components.scale_factor` and applies it when aggregating ingredient quantities. The calculator on the recipe page is a planning/reference tool; the document generator is the production tool for actual events.

## Future Extension

To allow a chef to override a recipe's scale for a specific event component, set `components.scale_factor` to the computed value. The grocery list will then automatically use the correct quantities. A UI for this would live in the menu/component editor.
