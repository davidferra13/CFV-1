# Cross-Referencing Enhancements

**Date:** 2026-03-19
**Branch:** feature/external-directory

## Problem

Chefs constantly juggle between disparate tools (Excel, Google Sheets, costing programs, physical notes) to cross-reference inventory levels, allergen info, recipe scaling, and menu context. ChefFlow had the data but wasn't surfacing connections between recipes, menus, events, inventory, and client dietary needs in context.

## What Changed

Five cross-referencing features added, all deterministic (Formula > AI principle, zero LLM calls).

### 1. Inventory Check During Menu Build

**Where:** MenuContextSidebar (`components/culinary/menu-context-sidebar.tsx`)
**Action:** `getMenuIngredientStock()` in `lib/menus/menu-intelligence-actions.ts`

Traces menu -> dishes -> components -> recipe_ingredients -> pantry_items to compare needed vs on-hand quantities. Shows out-of-stock (red) and low-stock (amber) alerts inline while building menus.

### 2. Allergen Validation Warnings

**Where:** MenuContextSidebar
**Action:** `validateMenuAllergens()` in `lib/menus/menu-intelligence-actions.ts`

Merges event-level and client-level allergies/restrictions, then cross-references all dish ingredients against `ALLERGEN_INGREDIENT_MAP` (11 categories, ~200 trigger terms in `lib/menus/allergen-check.ts`). Displays conflicts sorted by severity (high/medium/low) with dish name, ingredient, and allergen category.

### 3. Bidirectional Navigation

Two directions:

- **Recipe -> Menus:** `getRecipeUsage()` action + `RecipeUsagePanel` component (`components/recipes/recipe-usage-panel.tsx`). Shows every menu using a recipe, with links to the menu, event date, and client name. Added to recipe detail page.
- **Menu -> Inquiry:** `getMenuInquiryLink()` action. Traces menu -> event -> inquiry. Displayed as "Back to Inquiry" link in both MenuContextSidebar and the menu detail page header (`app/(chef)/menus/[id]/page.tsx`).

### 4. Auto-Scale Mismatch Detection

**Where:** MenuContextSidebar
**Action:** `checkMenuScaleMismatch()` in `lib/menus/menu-intelligence-actions.ts`

Compares `menus.target_guest_count` vs `events.guest_count`. If they differ, shows an amber alert with both counts so the chef can adjust recipe scaling.

### 5. Production Journal Enhancements

**Where:** Recipe detail page (`app/(chef)/recipes/[id]/recipe-detail-client.tsx`)
**Action:** Updated `logProduction()` in `lib/recipes/production-log-actions.ts`
**Migration:** `database/migrations/20260401000084_production_log_enhancements.sql`

Added two fields to the existing production log:

- **Outcome rating** (1-5 stars): clickable star UI, stored as `outcome_rating smallint`
- **Substitutions** (free text): "Used ghee instead of butter", stored as `substitutions text`

Both columns are nullable and additive-only. Migration must be applied with `drizzle-kit push`.

## Files Changed

| File                                                                 | Change                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------- |
| `lib/menus/menu-intelligence-actions.ts`                             | 5 new server actions                                    |
| `components/culinary/menu-context-sidebar.tsx`                       | Rewritten with stock, allergen, scale, inquiry sections |
| `components/recipes/recipe-usage-panel.tsx`                          | New component (recipe -> menu links)                    |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx`                   | RecipeUsagePanel + production journal enhancements      |
| `app/(chef)/menus/[id]/page.tsx`                                     | "Back to Inquiry" link                                  |
| `lib/recipes/production-log-actions.ts`                              | outcome_rating + substitutions fields                   |
| `database/migrations/20260401000084_production_log_enhancements.sql` | New columns on recipe_production_log                    |

## Architecture Notes

- All 5 features are deterministic (no AI calls)
- All server actions are tenant-scoped via `requireChef()`
- Sidebar data fetches use `.catch()` so individual failures don't break the whole sidebar
- Stock comparison aggregates across all pantry locations per ingredient
- Allergen check reuses existing `ALLERGEN_INGREDIENT_MAP` utility
