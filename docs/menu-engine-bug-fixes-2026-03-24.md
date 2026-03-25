# Menu Engine Bug Fixes - 2026-03-24

## Summary

Full code audit of the menu builder/engine system (~26 files in `lib/menus/`, plus analytics and intelligence layers). Found and fixed 6 bugs across 7 files.

---

## Bug 1: `menu_items` vs `dishes` table mismatch (CRITICAL)

**Impact:** What-If Simulator, Menu Engineering analytics, Seasonal Correlation, and Plate Cost calculator were all querying the wrong table. The `menu_items` table (created in migration `20260401000077`) is a separate analytics table using `chef_id` scoping. The core engine writes dishes to the `dishes` table (Layer 4) which uses `tenant_id` scoping. Since `components.dish_id` references `dishes.id`, all joins through `menu_items` returned empty results.

**Files fixed:**

| File                                            | Line | Change                                                                                         |
| ----------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------- |
| `lib/menus/menu-engineering-actions.ts`         | ~691 | `.from('menu_items')` to `.from('dishes')`, `chef_id` to `tenant_id`, column selection updated |
| `lib/analytics/menu-engineering.ts`             | ~62  | Same table swap, removed broken recipe join, added batch cost fetch via `recipe_cost_summary`  |
| `lib/intelligence/seasonal-menu-correlation.ts` | ~94  | Same table swap, added `tenant_id` scoping, `recipe_id` to `linked_recipe_id`                  |
| `lib/pricing/plate-cost-actions.ts`             | ~85  | Same table swap, replaced inline `recipes()` join with batch fetch via `linked_recipe_id`      |

**Column mapping:**

| `menu_items` column | `dishes` equivalent                                   |
| ------------------- | ----------------------------------------------------- |
| `category`          | `course_name`                                         |
| `chef_id`           | `tenant_id`                                           |
| `recipe_id`         | `linked_recipe_id`                                    |
| `price`             | (not on dishes; lives on event/quote)                 |
| `food_cost_cents`   | (computed from linked recipe)                         |
| `is_active`         | (all dishes are active; archived handled differently) |

---

## Bug 2: `entityId` vs `tenantId` inconsistency

**Impact:** Not a runtime bug (both resolve to the same value for chefs), but a maintenance risk. Two files used `user.entityId` while all other menu files use `user.tenantId!`.

**Files fixed:**

| File                           | Occurrences replaced |
| ------------------------------ | -------------------- |
| `lib/menus/approval-portal.ts` | 6 instances          |
| `lib/menus/revisions.ts`       | 2 instances          |

All changed from `user.entityId` to `user.tenantId!` for consistency with the rest of the menu engine.

---

## Bug 3: `mergeDishes` loses `linked_recipe_id`

**Impact:** When merging duplicate dishes in the dish index, appearances and feedback were transferred but the recipe link was not. If the archived (merged) dish had a `linked_recipe_id` and the kept dish did not, the link was silently lost.

**File fixed:** `lib/menus/dish-index-actions.ts` - `mergeDishes()` function

**Fix:** Before archiving the merged dish, check if the kept dish lacks a `linked_recipe_id`. If so, transfer the merged dish's recipe link to the kept dish.

---

## What was NOT changed

- The `menu_items` table and migration remain untouched (it may serve a future analytics purpose)
- No changes to the core menu CRUD (`actions.ts`), editor (`editor-actions.ts`), or tasting menu bridge
- No changes to navigation or UI components
- No schema changes required
