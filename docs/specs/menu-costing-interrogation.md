# Menu Costing System - Interrogation Question Set

> **Purpose:** Expose every failure point in the menu creation and costing pipeline.
> Force the system into a fully specified, verifiable state.
> Every question has a pass/fail criteria. No ambiguity.

**System under test:** Menu -> Dish -> Component -> Recipe -> Ingredient -> Price chain.
**Key files:** `lib/menus/actions.ts`, `lib/menus/menu-intelligence-actions.ts`, `lib/menus/estimate-actions.ts`, `lib/pricing/costing-coverage-actions.ts`, `lib/pricing/resolve-price.ts`, `components/culinary/menu-cost-sidebar.tsx`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql`

---

## Category A: Cost Accuracy (Does the number mean what it says?)

### Q1. Unit Conversion Gap

**The question:** Recipe calls for "2 lbs" of butter. Ingredient price is stored as "$0.50/oz". What cost does `compute_recipe_cost_cents` produce?
**Current behavior:** `quantity * last_price_cents` = 2 _ 50 = $1.00. Actual cost: 2 lbs = 32 oz _ $0.50 = $16.00. **Off by 16x.**
**Root cause:** `compute_recipe_cost_cents` (Layer 4 migration, line 841) has no unit conversion. SQL comment admits: "This doesn't account for unit conversions yet."
**Severity:** CRITICAL. Every recipe with mismatched units produces a wrong cost.
**Pass criteria:** Cost calculation converts between units before multiplying. A unit conversion function exists in SQL or application code. All recipe-ingredient pairs with mismatched units produce correct costs.
**Status:** FIXED - SQL function now prefers precomputed `computed_cost_cents` (set by app-layer conversion engine). App already wires `computeIngredientCost` on add/update. All 5 price mutation paths cascade to recipe costs.

### Q2. Missing Price = Silent $0

**The question:** A recipe has 10 ingredients. 3 have no price. What total cost is displayed?
**Current behavior:** `compute_recipe_cost_cents` uses `ELSE 0` for unpriced ingredients. Total = sum of 7 priced + $0 + $0 + $0. Number is displayed as if complete.
**Root cause:** SQL function treats missing data as zero, which is arithmetically wrong (missing != zero).
**Severity:** HIGH. Chef sees "$45.00 total" when actual cost could be $65.00. Business decisions made on understated numbers.
**Pass criteria:** Either (a) cost total is flagged as "minimum estimate" when ingredients are unpriced, or (b) the UI clearly marks the total as incomplete with the count of missing prices inline, not just in a separate warning panel.
**Status:** PARTIAL - UI shows warning in cost sidebar, but the number itself has no qualifier. A chef scanning quickly sees "$45.00" not "$45.00 (minimum, 3 ingredients unpriced)".

### Q3. `has_all_recipe_costs` Checks Wrong Thing

**The question:** Menu has 5 components, all with recipes linked. But 2 recipes have ingredients with no prices. Does `menu_cost_summary.has_all_recipe_costs` return true or false?
**Current behavior:** Returns `true`. The check is `COUNT(*) = COUNT(c.recipe_id)` (all components have a recipe_id). It does NOT check ingredient-level pricing.
**Root cause:** View definition in Layer 4 migration line 931-935.
**Severity:** HIGH. Downstream code trusts this flag to mean "costs are complete." It doesn't.
**Pass criteria:** `has_all_recipe_costs` returns false when any ingredient in any linked recipe lacks a price. Or rename the field to `has_all_recipes_linked` and add a separate `has_all_prices` flag.
**Status:** BROKEN - misleading column name and logic.

### Q4. Stale Manual Cost Override

**The question:** Chef manually set `recipes.total_cost_cents = 5000` six months ago. Since then, ingredient prices changed. `compute_recipe_cost_cents` now returns 7500. Which number does the system use?
**Current behavior:** `recipe_cost_summary` uses `COALESCE(r.total_cost_cents, compute_recipe_cost_cents(r.id))`. Manual override wins. Stale number displayed.
**Severity:** MEDIUM. Silent drift between manual and computed costs.
**Pass criteria:** Either (a) manual override has an expiry/staleness check, (b) UI shows "manual override, last updated X" badge, or (c) manual override is removed entirely in favor of always computing.
**Status:** BROKEN - no staleness detection.

### Q5. Non-Linear Scaling Not in Cost Math

**The question:** Recipe yields 4. Menu serves 40 (scale = 10x). Recipe uses 1 tsp salt. Does cost calculation account for the fact that salt doesn't scale linearly?
**Current behavior:** `scaleMenuToGuestCount` applies `SALT_SPICE_SCALE_FACTOR = 0.7` to the scale factor. But `compute_menu_cost_cents` and `getEditorDishCostBreakdown` use linear scaling. Cost says 10x salt; actual usage is 7x.
**Severity:** LOW-MEDIUM. Over-estimates spice/seasoning costs by ~30% at large scales.
**Pass criteria:** Either (a) non-linear scaling is also applied in cost calculation, or (b) documented as intentional (conservative estimate).
**Status:** INCONSISTENT - scaling action uses non-linear, cost display uses linear.

---

## Category B: Guest Count & Scaling (Do the numbers agree with each other?)

### Q6. Guest Count Divergence

**The question:** Menu has `target_guest_count = 20`. Linked event has `guest_count = 35` (client changed it). Which number drives costs?
**Current behavior:** `menu_cost_summary` view uses `e.guest_count` (event). `scaleMenuToGuestCount` reads `menu.target_guest_count`. `getEditorDishCostBreakdown` reads `menu.guest_count`. Three different sources for the same concept.
**Severity:** HIGH. Chef sees different cost-per-guest depending on which surface they look at.
**Pass criteria:** One canonical source for guest count per menu. If event is linked, event.guest_count wins everywhere. If no event, menu.target_guest_count. Documented and enforced.
**Status:** BROKEN - three sources, no canonical winner.

### Q7. Scale Factor Cap vs. Guest Count Range

**The question:** Recipe yields 4 portions. Chef scales menu to 200 guests. Required scale factor = 50. But `CreateComponentSchema` caps `scale_factor` at 20. What happens?
**Current behavior:** `scaleMenuToGuestCount` bypasses Zod validation and writes directly to DB, so it works. But if a chef manually edits a component after scaling, the 20x cap prevents saving. Schema and runtime disagree.
**Severity:** MEDIUM. Chef can't manually adjust a component that was auto-scaled above 20x.
**Pass criteria:** Either (a) raise the cap to match the guest count range, or (b) auto-scaling also respects the cap (with a "batch split" warning above 20x).
**Status:** INCONSISTENT

### Q8. Null Yield Quantity Handling

**The question:** A recipe has `yield_quantity = null`. How is cost-per-guest calculated?
**Current behavior:**

- `estimateMenuCost`: `yieldQty = bestMatch.yield_quantity || guestCount` (defaults to guest count, so scale = 1)
- `getEditorDishCostBreakdown`: `yieldQty = comp.recipes.yield_quantity || guestCount` (same)
- `scaleMenuToGuestCount`: falls through to ratio-based scaling from previous guest count
- `menu_cost_summary` SQL: uses `compute_menu_cost_cents` which uses `component.scale_factor` directly
  **Severity:** MEDIUM. Different code paths, different defaults. Scale factor of 1x for a recipe with no yield = full recipe cost regardless of guest count.
  **Pass criteria:** One documented default for null yield. All code paths use it. Recipe editor warns when yield is empty.
  **Status:** INCONSISTENT

### Q9. Template Menu Costing

**The question:** Chef creates a template menu (no event linked). Can they see cost-per-guest and food cost %?
**Current behavior:** `menu_cost_summary` view LEFT JOINs events. No event = no `guest_count` = `cost_per_guest_cents` and `food_cost_percentage` are both NULL.
**Severity:** MEDIUM. Template menus are a planning tool. Chefs need cost-per-guest to evaluate whether a template is viable before attaching it to an event.
**Pass criteria:** If no event, use `menu.target_guest_count` as fallback for the view. Template menus show cost-per-guest based on target.
**Status:** BROKEN - templates always show N/A for per-guest metrics.

---

## Category C: State Machine & Lifecycle (Can the system get into invalid states?)

### Q10. Concurrent Status Transition

**The question:** Two browser tabs both call `transitionMenu(menuId, 'shared')` at the same time on a draft menu. What happens?
**Current behavior:** `transitionMenu` checks `menu.status` in JS, then writes the update. No CAS guard (`WHERE status = 'draft'`). Both requests pass the check, both write. Two `menu_state_transitions` rows created. Last write wins, but transition log has duplicate entries.
**Severity:** MEDIUM. Race condition. Duplicate transition records. Could be exploited to skip states.
**Pass criteria:** Update query includes `WHERE status = $expectedStatus`. If 0 rows affected, throw conflict error. Use `createConflictError` pattern already in codebase.
**Status:** BROKEN - no CAS guard.

### Q11. Unlock Without Event State Check

**The question:** Menu is locked, attached to a `paid` event. Chef unlocks the menu. What happens to the event?
**Current behavior:** `unlockMenu` sets status to `draft`, logs a transition with reason. Does NOT check event status. Does NOT notify client. Menu is now editable while event contract is active.
**Severity:** HIGH. Changing a locked menu that's part of an active contract is a business logic violation. Client was told "the meal plan is set" (notification text from line 940).
**Pass criteria:** `unlockMenu` either (a) refuses if event is in `paid`/`confirmed`/`in_progress`, or (b) warns the chef explicitly and requires acknowledgment, or (c) creates a new draft copy instead of unlocking in place.
**Status:** BROKEN - no event state awareness.

### Q12. Archive While Event Active

**The question:** Menu is attached to a `confirmed` event. Chef archives the menu. Is the event now referencing an archived menu?
**Current behavior:** Need to verify, but `transitionMenu` to `archived` has no event-state check either.
**Severity:** HIGH. Same category as Q11.
**Pass criteria:** Archiving a menu with an active event is blocked or requires explicit confirmation.
**Status:** NEEDS VERIFICATION

### Q13. Dish Mutation on Shared Menu

**The question:** Menu status is `shared` (sent to client for review). Chef adds a new dish. Is this allowed?
**Current behavior:** `addDishToMenu` checks `if (menu.status === 'locked')` but does NOT check `shared`. Chef can silently modify a menu that the client is currently reviewing.
**Severity:** MEDIUM. Client sees version A, chef edits to version B. No versioning or notification.
**Pass criteria:** Either (a) `shared` menus are also mutation-locked, or (b) mutations on shared menus trigger a re-notification to the client, or (c) documented as intentional ("shared is a soft state, chef can still edit").
**Status:** NEEDS POLICY DECISION

---

## Category D: Data Quality & Confidence (Does the system tell truth about what it knows?)

### Q14. Confidence Metric Is Hardcoded

**The question:** An ingredient has `last_price_confidence = 0.3` (low, from a government source). What confidence score does the cost estimator show?
**Current behavior:** `estimateMenuCost` line 267: `totalConfidence += 0.7` for every priced ingredient. Ignores actual confidence. All priced ingredients treated as 70% confident.
**Severity:** MEDIUM. Chef can't distinguish between a receipt-backed price and a BLS estimate.
**Pass criteria:** Use actual `last_price_confidence` from the ingredient. If null, default to a source-appropriate value.
**Status:** BROKEN - hardcoded.

### Q15. Price Staleness Not in Cost Display

**The question:** Ingredient price was last updated 8 months ago. Is this surfaced anywhere in the menu cost view?
**Current behavior:** `recipe_cost_summary` includes `last_price_updated_at`. But `menu_cost_summary` does not. The cost sidebar shows no staleness indicator.
**Severity:** MEDIUM. A price from January is treated identically to one from yesterday. Seasonal ingredients (e.g., lobster) can swing 50%+ over months.
**Pass criteria:** Menu cost sidebar shows a "price freshness" indicator. Stale prices (>90 days) get a warning badge.
**Status:** NOT IMPLEMENTED

### Q16. Unit Mismatch Detection Completeness

**The question:** `getMenuCostingGaps` detects unit mismatches (A6). Does it catch all mismatches, or only obvious ones?
**Current behavior:** Need to verify the comparison logic. Does it handle "lb" vs "lbs" vs "pound"? "oz" vs "ounce" vs "fl oz"?
**Severity:** MEDIUM. Partial detection = false sense of security.
**Pass criteria:** Unit mismatch detection uses a normalization map. "lb", "lbs", "pound", "pounds" all normalize to the same canonical unit before comparison.
**Status:** FIXED - SQL returns raw mismatches, app-layer filters through `normalizeUnit()` (80+ aliases). False positives like "lb" vs "pound" eliminated.

---

## Category E: Performance & Edge Cases

### Q17. View Computation on Every Read

**The question:** `checkMenuMargins` reads from `menu_cost_summary`, which calls `compute_menu_cost_cents(m.id)` - a SQL function that walks the full tree. For a 10-course, 40-component menu, how many queries does a single sidebar refresh trigger?
**Current behavior:** The view computes on read. Plus `getMenuVendorHints` and `getMenuCostingGaps` are called in parallel. Each walks the tree independently.
**Severity:** LOW-MEDIUM. Not a problem today with small menus. Could become a problem at scale.
**Pass criteria:** Either (a) materialized view with trigger-based refresh, or (b) application-level cache with tagged invalidation (partially exists via `menu-intelligence-cache.ts`), or (c) documented as acceptable for V1 menu sizes.
**Status:** ACCEPTABLE FOR V1 (document the ceiling)

### Q18. Empty Menu Cost Display

**The question:** Chef creates a menu, adds no dishes. What does the cost sidebar show?
**Current behavior:** `checkMenuMargins` returns `menu_cost_summary` with 0 components. Sidebar shows $0.00 total, N/A per guest, N/A food cost %. No "add dishes to see costs" guidance.
**Severity:** LOW. Not a bug, but a missed opportunity. Empty state should guide, not display zeros.
**Pass criteria:** Empty menu shows an instructional empty state instead of $0.00 values.
**Status:** MINOR UX GAP

### Q19. Duplicate Ingredient Deduplication Inconsistency

**The question:** Butter appears in 3 recipes on the same menu. `getMenuCostingCoverageAction` deduplicates by ingredient_id (counts butter once). `compute_menu_cost_cents` does NOT deduplicate (costs butter 3 times). Is this correct?
**Current behavior:** Coverage says "25 unique ingredients, 20 priced." Cost sums all recipe costs independently.
**Severity:** NONE - this is actually correct. Each recipe uses butter independently; total cost should reflect total usage. But coverage deduplication is correct for "do we have prices for all ingredients we need?"
**Pass criteria:** Document this explicitly. Coverage = unique ingredients. Cost = total usage across all recipes.
**Status:** CORRECT but undocumented.

### Q20. Food Cost % Without Revenue Context

**The question:** Menu is attached to an event, but event has no `quoted_price_cents` set yet. What food cost % is shown?
**Current behavior:** `menu_cost_summary` returns NULL for `food_cost_percentage`. Sidebar shows "N/A".
**Severity:** LOW. But food cost % is "the hero metric" (sidebar comment). If the chef hasn't quoted yet, the most important number is missing.
**Pass criteria:** Either (a) allow setting `price_per_person_cents` on the menu directly for planning, or (b) show a prompt to set a target price, or (c) current behavior is fine (quote first, then see food cost).
**Status:** ACCEPTABLE - but could be better with a target price input.

---

## Triage Summary

| ID  | Severity | Status             | Fix Complexity                        |
| --- | -------- | ------------------ | ------------------------------------- |
| Q1  | CRITICAL | FIXED              | HIGH (unit conversion system needed)  |
| Q2  | HIGH     | PARTIAL            | LOW (UI qualifier on total)           |
| Q3  | HIGH     | BROKEN             | LOW (fix view definition or rename)   |
| Q6  | HIGH     | BROKEN             | MEDIUM (canonical guest count source) |
| Q10 | MEDIUM   | BROKEN             | LOW (add CAS guard)                   |
| Q11 | HIGH     | BROKEN             | LOW (add event state check)           |
| Q14 | MEDIUM   | BROKEN             | LOW (use real confidence value)       |
| Q4  | MEDIUM   | BROKEN             | LOW (staleness badge)                 |
| Q7  | MEDIUM   | INCONSISTENT       | LOW (raise cap)                       |
| Q8  | MEDIUM   | INCONSISTENT       | LOW (document + unify default)        |
| Q9  | MEDIUM   | BROKEN             | LOW (fallback to target_guest_count)  |
| Q5  | LOW-MED  | INCONSISTENT       | MEDIUM (apply non-linear to cost)     |
| Q13 | MEDIUM   | NEEDS POLICY       | LOW (once decided)                    |
| Q15 | MEDIUM   | NOT IMPLEMENTED    | MEDIUM (freshness indicator)          |
| Q12 | HIGH     | NEEDS VERIFICATION | LOW                                   |
| Q16 | MEDIUM   | FIXED              | MEDIUM                                |
| Q17 | LOW-MED  | ACCEPTABLE         | N/A for V1                            |
| Q18 | LOW      | MINOR UX GAP       | LOW                                   |
| Q19 | NONE     | CORRECT            | N/A (document)                        |
| Q20 | LOW      | ACCEPTABLE         | LOW                                   |

---

## Fix Log (completed 2026-04-15)

| ID  | Fix                                                                                                                                                   | File(s)                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Q10 | CAS guard on `transitionMenu` - `WHERE status = currentStatus`                                                                                        | `lib/menus/actions.ts`                                                                     |
| Q11 | `unlockMenu` refuses if event is paid/confirmed/in_progress + CAS guard                                                                               | `lib/menus/actions.ts`                                                                     |
| Q12 | `transitionMenu` to archived blocked if event is active                                                                                               | `lib/menus/actions.ts`                                                                     |
| Q14 | Cost estimator uses real `last_price_confidence` instead of hardcoded 0.7                                                                             | `lib/menus/estimate-actions.ts`                                                            |
| Q3  | `has_all_recipe_costs` now checks ingredient prices, not just recipe linkage                                                                          | `database/migrations/20260415000016_menu_cost_summary_accurate_flags.sql`                  |
| Q9  | `menu_cost_summary` uses `COALESCE(event.guest_count, menu.target_guest_count)`                                                                       | same migration                                                                             |
| Q2  | Cost sidebar shows "≥" prefix and "minimum" label when prices incomplete                                                                              | `components/culinary/menu-cost-sidebar.tsx`                                                |
| Q6  | Fixed wrong column name (`guest_count` -> `target_guest_count`), added event fallback to estimator and shopping list                                  | `lib/menus/estimate-actions.ts`, `lib/menus/actions.ts`                                    |
| Q7  | Scale factor cap raised from 20 to 500 (matches guest count range)                                                                                    | `lib/menus/actions.ts`                                                                     |
| Q8  | Null yield behavior documented as intentional (recipe cost used as-is)                                                                                | This doc                                                                                   |
| Q13 | Shared menus auto-revert to draft on mutation with transition log                                                                                     | `lib/menus/actions.ts`                                                                     |
| Q15 | Price staleness query + "prices up to Xd old" indicator in sidebar                                                                                    | `lib/menus/menu-intelligence-actions.ts`, `components/culinary/menu-cost-sidebar.tsx`      |
| Q18 | Empty menu shows guidance text instead of $0.00 values                                                                                                | `components/culinary/menu-cost-sidebar.tsx`                                                |
| Q1  | SQL function prefers precomputed `computed_cost_cents` (unit-aware) over naive multiply. App layer already wired. Migration + redundant file cleanup. | `database/migrations/20260415000017_unit_aware_recipe_costing.sql`, `lib/menus/actions.ts` |
| Q1  | Price cascade wired: PO receipt + receipt scan now trigger `propagatePriceChange`                                                                     | `lib/inventory/purchase-order-actions.ts`, `lib/ingredients/receipt-scan-actions.ts`       |
| Q1  | Deleted redundant `lib/costing/refresh-recipe-costs.ts` (duplicated `lib/recipes/actions.ts` + `lib/pricing/cost-refresh-actions.ts`)                 | -                                                                                          |
| Q16 | Unit mismatch detection now filters false positives through `normalizeUnit()` ("lb" vs "pound" no longer flagged)                                     | `lib/menus/actions.ts`                                                                     |

## Remaining Open

- **Q4** (MEDIUM): Stale manual cost override. No staleness detection on `recipes.total_cost_cents` manual overrides.
- **Q5** (LOW-MED): Non-linear scaling in cost math. Documented as conservative overestimate (intentional).
- **Q17** (LOW-MED): View computation performance. Acceptable for V1.
- **Q19** (NONE): Deduplication inconsistency is correct behavior (documented above).
- **Q20** (LOW): Food cost % requires quoted price. Acceptable.
