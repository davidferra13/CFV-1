# Menu Hierarchy Improvements — 5 Features

**Date:** 2026-02-24
**Branch:** feature/risk-gap-closure
**Status:** Implemented (pending migration push)

## Overview

Five improvements to ChefFlow's menu hierarchy, filling real-world culinary gaps:

1. **Plating Instructions** — free-text plating guide per dish
2. **Beverage Pairings** — wine/cocktail pairing per course
3. **Portion Sizing** — per-plate quantity per component
4. **Prep Timeline** — structured prep schedule (day offset, time of day, station)
5. **Sub-Recipes** — recipes that reference other recipes (recursive nesting)

## Updated Hierarchy

```
Menu
 └─ Dish (course)
     ├─ plating_instructions     ← NEW
     ├─ beverage_pairing         ← NEW
     ├─ beverage_pairing_notes   ← NEW
     └─ Component (building block)
         ├─ portion_quantity      ← NEW
         ├─ portion_unit          ← NEW
         ├─ prep_day_offset       ← NEW
         ├─ prep_time_of_day      ← NEW
         ├─ prep_station          ← NEW
         └─ Recipe (optional, from Recipe Bible)
             ├─ recipe_sub_recipes ← NEW (junction table)
             │    └─ Child Recipe (recursive)
             └─ Recipe Ingredient
                 └─ Ingredient
```

## Migrations

| File                                      | What                                                                                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260324000003_plating_instructions.sql` | `dishes.plating_instructions TEXT`                                                                                                                       |
| `20260324000004_beverage_pairings.sql`    | `dishes.beverage_pairing TEXT`, `dishes.beverage_pairing_notes TEXT`                                                                                     |
| `20260324000005_portion_sizing.sql`       | `components.portion_quantity DECIMAL(8,3)`, `components.portion_unit TEXT`                                                                               |
| `20260324000006_prep_timeline.sql`        | `components.prep_day_offset INT`, `components.prep_time_of_day TEXT`, `components.prep_station TEXT`                                                     |
| `20260324000007_sub_recipes.sql`          | `recipe_sub_recipes` table, circular ref prevention trigger, updated `get_recipe_allergen_flags()` and `compute_recipe_cost_cents()` to walk recursively |

All migrations are **additive** — no drops, no alters of existing columns.

## Feature Details

### 1. Plating Instructions

- **Column:** `dishes.plating_instructions TEXT`
- **UI:** Textarea in menu-doc-editor CourseBlock (sky-blue accent), read-only in detail view
- **Auto-saves** via existing 1.5s debounce

### 2. Beverage Pairings

- **Columns:** `dishes.beverage_pairing TEXT`, `dishes.beverage_pairing_notes TEXT`
- **UI:** Input + textarea in menu-doc-editor CourseBlock (purple accent), read-only in detail view
- **Auto-saves** via existing debounce

### 3. Portion Sizing

- **Columns:** `components.portion_quantity DECIMAL(8,3)`, `components.portion_unit TEXT`
- **Constraint:** portion_quantity must be positive or null
- **UI:** Two inline fields in culinary board component form ("Portion per plate")
- **Display:** Shows "120g/plate" in component rows

### 4. Prep Timeline

- **Columns:** `components.prep_day_offset INT DEFAULT 0`, `components.prep_time_of_day TEXT`, `components.prep_station TEXT`
- **Constraints:** prep_day_offset <= 0, prep_time_of_day in ('early_morning','morning','afternoon','evening','service')
- **UI:** Three fields in component form (day dropdown, time dropdown, station input with autocomplete)
- **Auto-sets** `is_make_ahead = true` when prep_day_offset < 0
- **New component:** `PrepTimelineView` — groups components by day and time of day
- **Server action:** `getMenuPrepTimeline(menuId)` returns grouped data

### 5. Sub-Recipes

- **Table:** `recipe_sub_recipes` (parent_recipe_id, child_recipe_id, quantity, unit, sort_order, notes)
- **Circular prevention:** DB trigger walks ancestor chain via recursive CTE, raises exception on cycle
- **Allergens:** `get_recipe_allergen_flags()` now walks sub-recipes recursively
- **Costing:** `compute_recipe_cost_cents()` now sums sub-recipe costs with quantity multiplier
- **RLS:** Inherits from parent recipe (same pattern as recipe_ingredients)
- **Server actions:** `addSubRecipe()`, `updateSubRecipe()`, `removeSubRecipe()` in `lib/recipes/actions.ts`
- **UI:** Sub-Recipes card and Used In card on recipe detail page
- **New component:** `SubRecipeSearchModal` — search + add sub-recipes with quantity/unit

## Files Changed

### Migrations

- `supabase/migrations/20260324000003_plating_instructions.sql`
- `supabase/migrations/20260324000004_beverage_pairings.sql`
- `supabase/migrations/20260324000005_portion_sizing.sql`
- `supabase/migrations/20260324000006_prep_timeline.sql`
- `supabase/migrations/20260324000007_sub_recipes.sql`

### Server Actions

- `lib/menus/actions.ts` — schemas, CRUD, duplicateMenu, getMenuPrepTimeline
- `lib/menus/editor-actions.ts` — EditorDish type, context loading, updateDishEditorContent
- `lib/menus/constants.ts` — prep timeline constants
- `lib/recipes/actions.ts` — sub-recipe CRUD, getRecipeById, deleteRecipe

### UI Components

- `components/menus/menu-doc-editor.tsx` — plating + beverage in CourseBlock
- `components/culinary/MenuEditor.tsx` — portion + prep in component form/display
- `app/(chef)/menus/[id]/menu-detail-client.tsx` — display all new fields + prep timeline
- `app/(chef)/recipes/[id]/recipe-detail-client.tsx` — sub-recipe + used-in sections
- `components/menus/prep-timeline-view.tsx` — NEW
- `components/recipes/sub-recipe-search-modal.tsx` — NEW

## Tier

All features are free-tier (part of irreducible menu/recipe core). No Pro gating needed.
