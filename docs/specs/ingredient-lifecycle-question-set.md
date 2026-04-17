# Ingredient Quantity Lifecycle - System Integrity Question Set

**Purpose:** Define the complete set of verifiable questions that, when all answered YES, mean ChefFlow tracks every gram from recipe to leftover with no silent gaps, no dead features, and no conflicting numbers. Every chef benefits.

**Scope:** The full ingredient quantity chain: recipe spec, yield adjustment, purchase, usage, leftover, carry-forward, cost reconciliation. Covers both data layer and the workflows that populate it.

**Principle:** A chef should never have to do math in their head. The system does it, the system is right, and the system can prove it. If a number is shown, it's derived from a real source. If a stage has no data, the system says "not recorded" rather than showing zero.

---

## Coverage Map

| Q    | Title                              | Domain  | Status | Severity |
| ---- | ---------------------------------- | ------- | ------ | -------- |
| IL1  | Yield Write Path Exists            | Data/UI | BUILT  | CRITICAL |
| IL2  | Waste Factor Bridge                | Data    | BUILT  | HIGH     |
| IL3  | Scaling System Consistency         | Logic   | BUILT  | HIGH     |
| IL4  | Sub-Recipe Ingredient Completeness | Logic   | BUILT  | HIGH     |
| IL5  | Shopping List Yield Inflation      | Logic   | BUILT  | CRITICAL |
| IL6  | Purchase Event Linkage             | Data/UX | SPEC   | HIGH     |
| IL7  | Usage Logging Workflow             | UX      | SPEC   | MEDIUM   |
| IL8  | Leftover Carry-Forward Reduction   | Logic   | SPEC   | MEDIUM   |
| IL9  | Lifecycle View Completeness        | DB      | BUILT  | HIGH     |
| IL10 | Unit Consistency Across Chain      | Logic   | BUILT  | HIGH     |
| IL11 | Package Size Rounding              | Logic   | SPEC   | MEDIUM   |
| IL12 | Zero vs Not-Recorded Distinction   | UI      | BUILT  | HIGH     |
| IL13 | Cost Projection Accuracy           | Logic   | SPEC   | MEDIUM   |
| IL14 | Multi-Event Ingredient Allocation  | Logic   | SPEC   | MEDIUM   |
| IL15 | Under-Buy Detection                | UX      | SPEC   | HIGH     |
| IL16 | Guest Count Change Propagation     | Logic   | SPEC   | HIGH     |
| IL17 | Staple Ingredient Handling         | Logic   | SPEC   | MEDIUM   |
| IL18 | Waste Category Consistency         | Data    | SPEC   | MEDIUM   |
| IL19 | Yield Division Safety              | Logic   | BUILT  | CRITICAL |
| IL20 | Prep View With Adjusted Quantities | UX      | SPEC   | HIGH     |

---

## Question Definitions

### IL1: Yield Write Path Exists

**Hypothesis:** A chef can set and update `yield_pct` on any recipe ingredient, and `default_yield_pct` on any master ingredient, through the UI.

**Current state:** BUILT (2026-04-17). All four schemas accept yield: `AddIngredientToRecipeSchema` (`yield_pct`, int 5-100), `UpdateRecipeIngredientSchema` (`yield_pct`), `CreateIngredientSchema` (`default_yield_pct`), `UpdateIngredientSchema` (`default_yield_pct`). Server actions wire yield through to insert/update and cost recomputation. UI form still needs yield_pct input field on the recipe ingredient row.

**Failure mode:** The entire yield system is dead. Shopping lists, cost projections, and lifecycle views all produce identical numbers with or without it. A chef filleting whole fish (45% yield) gets told to buy the net amount, runs out mid-service.

**Fix required:**

1. Add `yield_pct` to `AddIngredientToRecipeSchema` and `UpdateRecipeIngredientSchema` (optional field, default 100)
2. Add `yield_pct` to `addIngredientToRecipe()` and `updateRecipeIngredient()` insert/update maps
3. Add yield_pct input to the recipe ingredient editing UI (inline on each ingredient row)
4. Add `default_yield_pct` to `CreateIngredientSchema`, `UpdateIngredientSchema`, and their corresponding server actions
5. Surface default_yield_pct on the ingredient master list / detail view

**UX guidance:** Label it "Usable yield %" with helper text: "What percentage is edible after prep? 100 = no waste. 45 = heavy trim (e.g., whole fish to fillet)." Auto-populate from `ingredient_waste_factors` when available.

**Verification:** Create a recipe ingredient with yield_pct = 50. Confirm the shopping list shows 2x the recipe quantity. Update to 75. Confirm the shopping list recalculates.

---

### IL2: Waste Factor Bridge

**Hypothesis:** When a chef adds an ingredient to a recipe, and that ingredient has a matching entry in `ingredient_waste_factors`, the system auto-suggests the USDA yield percentage.

**Current state:** BUILT (2026-04-17). New `suggestYieldByName(ingredientName)` in `lib/openclaw/reference-library-actions.ts`. Exact name match against `ingredient_waste_factors`, fuzzy fallback. Returns `{ prepMethod, yieldPct, source }[]`. UI integration pending (the suggestion function exists, the recipe form needs to call it).

**Failure mode:** Chef must know from experience that salmon has 45% fillet yield. The system has this data but keeps it locked in a reference table nobody reads. The chef enters no yield, gets the default 100%, buys too little.

**Fix required:**

1. When adding an ingredient to a recipe, look up matching `ingredient_waste_factors` by ingredient name (fuzzy match to `system_ingredients.name`)
2. If match found, pre-fill `yield_pct` with `as_purchased_to_edible_pct`
3. Chef can override. The suggestion is a starting point, not a mandate.
4. Show the prep method context: "Filleting: 45% yield (USDA)" vs "Skinning: 75% yield (USDA)"

**Verification:** Add "salmon" to a recipe. Confirm the yield_pct field auto-suggests ~45% (or whatever USDA value exists). Chef overrides to 50%. Confirm 50% persists.

---

### IL3: Scaling System Consistency

**Hypothesis:** The shopping list and grocery list produce the same buy quantity for the same ingredient on the same event.

**Current state:** BUILT (2026-04-17). Both generators now use: `(guestCount / recipeServings) * scale_factor`. Shopping list refactored to fetch guest counts per event and recipe servings. Grocery list now also fetches and applies `components.scale_factor`.

**Failure mode:** Chef generates a shopping list (system A) and gets quantities for 4 people. Opens the grocery list (system B) for the same event and gets quantities for 12. Trust collapses. Chef ignores both, does mental math, defeats the purpose.

**Fix required:** Unify scaling. One formula, used everywhere:

- `effectiveMultiplier = (guestCount / recipeServings) * components.scale_factor`
- Both generators must use this. Guest count provides the base scaling; scale_factor is the chef's manual override (e.g., "double the sauce recipe").
- If guest count is 0 or NULL, fall back to scale_factor alone.

**Verification:** For the same event, `generateShoppingList()` and `generateGroceryList()` produce identical `totalRequired`/`totalQuantity` for every shared ingredient.

---

### IL4: Sub-Recipe Ingredient Completeness

**Hypothesis:** When a recipe contains sub-recipes (e.g., "Pasta Dish" uses "Fresh Pasta Dough" as a sub-recipe), all sub-recipe ingredients appear in every generated shopping/grocery list.

**Current state:** BUILT (2026-04-17). Grocery list now recursively walks `recipe_sub_recipes`, fetches child recipe ingredients, and applies correct scaling. Both generators handle sub-recipes.

**Failure mode:** Chef goes shopping with the grocery list, gets home, starts prep, realizes they have no flour because the pasta dough sub-recipe was excluded. Emergency store run.

**Fix required:** Add sub-recipe recursion to `generate-grocery-list.ts`. Walk `recipe_sub_recipes` the same way `shopping-list-actions.ts` does. Apply yield_pct to sub-recipe ingredients too.

**Verification:** Create recipe A with sub-recipe B. Sub-recipe B has 3 ingredients. Generate grocery list for an event using recipe A. All 3 sub-recipe ingredients appear with correct scaled quantities.

---

### IL5: Shopping List Yield Inflation

**Hypothesis:** When yield_pct < 100, shopping lists show the inflated buy quantity (recipe_qty \* 100 / yield_pct), and both generators produce this adjustment.

**Current state:** CODE WRITTEN (this session) but UNTESTABLE because IL1 is failing (no write path for yield_pct). The math is wired but every ingredient has yield 100, so the adjustment is always a no-op.

**Dependency:** IL1 must pass first. Once yield_pct can be set, this verifies the math works end-to-end.

**Failure mode:** Chef sets yield 50% on whole fish. Shopping list should say 4 lbs (for 2 lbs usable). If the inflation formula is wrong (divides the wrong way, defaults incorrectly), chef buys wrong amount.

**Verification:** Set yield_pct = 50 on a recipe ingredient with quantity 2 lbs. Generate both lists. Both must show 4 lbs to buy.

---

### IL6: Purchase Event Linkage

**Hypothesis:** When a chef records a purchase (receives inventory), the system can link that purchase to a specific event, enabling "what I actually bought for this dinner" tracking.

**Current state:** PARTIAL. `inventory_transactions.event_id` exists and is nullable. The `receive` transaction type can theoretically have an event_id. But:

- No UI flow prompts the chef to link a receive to an event
- `createPurchaseOrderFromShoppingList()` creates POs but the PO receive flow doesn't carry event_id through
- The lifecycle view (`event_ingredient_lifecycle`) queries receives by event_id, but since nobody sets event_id on receives, Stage 3 (purchased_qty) is always 0

**Failure mode:** Chef completes an event, wants to see "I bought $340 of ingredients for this dinner." System shows $0 purchased because no receive transactions are linked.

**Fix required:**

1. When generating a shopping list for specific events, tag the resulting PO with those event IDs
2. When receiving PO items into inventory, copy event_id to the inventory_transaction
3. Add "Log purchase" shortcut from the event detail page that creates a receive transaction pre-linked to that event
4. Shopping receipt scan (if/when built) should auto-link to the event the shopping list was generated for

**Verification:** Generate shopping list for event X. Create PO from it. Receive the PO. Query `event_ingredient_lifecycle` for event X. Stage 3 columns show non-zero values.

---

### IL7: Usage Logging Workflow

**Hypothesis:** After an event, the chef has a clear, low-friction workflow to record actual ingredient usage, enabling variance analysis.

**Current state:** WEAK. `inventory_transactions` with `transaction_type='event_deduction'` exists. `lib/inventory/event-deduction-actions.ts` has the server action. But:

- No prompted post-event workflow triggers usage logging
- No pre-populated "expected usage" form for the chef to adjust
- The event completion flow doesn't suggest or require ingredient reconciliation
- Stage 4 (used_qty) in lifecycle view will always be 0 unless chef manually enters deductions

**Failure mode:** Chef never records usage. Stages 4 and 5 of the lifecycle are permanently empty. Variance analysis is meaningless. Chef can't answer "am I consistently over-buying?"

**Fix required:**

1. On event completion (status -> completed), prompt: "Record ingredient usage for this event?"
2. Pre-populate a form with expected quantities (from recipe _ scale _ yield). Chef adjusts actuals.
3. One-tap "used as expected" for ingredients that matched the plan
4. Deductions created as `event_deduction` inventory transactions linked to the event
5. This is optional, not blocking. Chef can skip it. But make it easy enough that most will do it.

**Verification:** Complete an event. Prompt appears. Pre-populated quantities are correct. Adjust one ingredient. Submit. `event_ingredient_lifecycle` view shows non-zero used_qty and accurate variance.

---

### IL8: Leftover Carry-Forward Reduction

**Hypothesis:** When a chef logs leftovers from Event A and marks them as "carried forward to Event B," Event B's shopping list automatically reduces the buy quantity for those ingredients.

**Current state:** FAILING. Carry-forward is advisory only. `lib/events/carry-forward.ts` reads `unused_ingredients` and `lib/formulas/carry-forward.ts` does fuzzy name matching, but neither feeds back into `generateShoppingList()` or `generateGroceryList()`. The UI shows suggestions but the numbers never change.

**Failure mode:** Chef has 3 lbs of leftover chicken carried forward. Next event needs 5 lbs. Shopping list says "buy 5 lbs" instead of "buy 2 lbs (3 lbs carried forward)." Chef either over-buys or does the math themselves.

**Fix required:**

1. When leftovers are marked as `carried_forward` with `next_event_id`, create an inventory transaction (type `return_from_event` or `carry_forward`) that increases the ingredient's on-hand stock
2. OR: modify shopping list generation to also query `event_leftover_details` where `next_event_id = currentEventId` and `disposition = 'carried_forward'`, and subtract those quantities
3. Show the reduction transparently in the shopping list: "Need 5 lbs. 3 lbs carried forward from [Event A]. Buy: 2 lbs."

**Verification:** Log 3 lbs chicken leftover from Event A, carry forward to Event B. Generate shopping list for Event B (which needs 5 lbs chicken). List shows toBuy = 2 lbs with carry-forward annotation.

---

### IL9: Lifecycle View Completeness

**Hypothesis:** The `event_ingredient_lifecycle` view returns complete data for every ingredient in every event that has recipes, with correct yield math, and handles NULL gracefully (never shows 0 when data is absent).

**Current state:** VIEW CREATED (this session) but untested against real data. Depends on IL1 (yield write), IL6 (purchase linkage), and IL7 (usage logging) for stages 2-5 to have non-default values.

**Failure mode:** View returns rows but every non-recipe column is 0. Chef sees "purchased: 0, used: 0, leftover: 0" and thinks the system is broken. Or: yield_pct in the GROUP BY creates duplicate rows for the same ingredient when different recipe lines have different yields.

**Fix required:** Already implemented. Needs data to validate. Also: distinguish "0 because nothing was recorded" from "0 because nothing was needed" in downstream UI.

**Verification:** For a completed event with recipes, purchases logged (IL6), and usage logged (IL7): all 5 stages have non-zero values. Variance columns are accurate. No duplicate ingredient rows.

---

### IL10: Unit Consistency Across Chain

**Hypothesis:** When the same ingredient appears in different units across recipes (e.g., "butter" in cups in one recipe and ounces in another), the system consolidates correctly or clearly separates them.

**Current state:** PARTIAL.

- Grocery list (`generate-grocery-list.ts`) has unit conversion via `canConvert()` and `addQuantities()` from `lib/grocery/unit-conversion.ts`
- Shopping list (`shopping-list-actions.ts`) aggregates by `ingredientId:unit` key, so different units produce separate line items (no conversion)
- Lifecycle view groups by `ri.unit`, so different units create separate rows

**Failure mode:** Chef adds butter to two recipes: 2 cups in Recipe A, 4 oz in Recipe B. Shopping list shows two separate lines ("2 cups butter" and "4 oz butter") instead of one consolidated line ("6 oz butter" or "3/4 cup butter"). Chef buys both amounts, ends up with double.

**Fix required:**

1. Shopping list should attempt unit conversion (same as grocery list does) before aggregating
2. If conversion is impossible (weight vs volume without a density ratio), keep them separate but flag: "This ingredient appears in incompatible units across recipes"
3. `ingredients.weight_to_volume_ratio` exists in schema (added by cascading food costs migration). Use it for cross-type conversion when available.

**Verification:** Recipe A uses 2 cups butter, Recipe B uses 8 oz butter. Both in the same event. Shopping list shows one consolidated line with correct total. If no conversion ratio exists, shows two lines with a warning.

---

### IL11: Package Size Rounding

**Hypothesis:** The system can suggest purchase quantities rounded up to standard package sizes, preventing under-buying.

**Current state:** NOT BUILT. Buy quantity is an exact decimal (e.g., 4.44 lbs). Real stores sell in fixed units: 1 lb bags, 5 lb bags, dozen eggs, pint containers. No package size awareness exists.

**Failure mode:** System says "buy 4.44 lbs chicken." Store sells chicken breasts in ~1.5 lb packs. Chef needs to buy 3 packs (4.5 lbs). They guess, sometimes wrong. For specialty items the gap is worse.

**Fix required:**

1. Add `common_package_sizes` field to `ingredients` table (JSONB array, e.g., `[{"qty": 1, "unit": "lb"}, {"qty": 5, "unit": "lb"}]`)
2. When displaying buy quantities, show: "Buy: 4.44 lbs (3 x 1.5 lb packs = 4.5 lbs)"
3. This is a suggestion layer on top of the exact quantity. The exact number stays as the source of truth.
4. Optional. Many chefs know their package sizes. But for new chefs or unusual ingredients, it prevents under-buying.

**Verification:** Set package size 1.5 lb for chicken. Need 4.44 lbs. System suggests 3 packs (4.5 lbs). Need 1.2 lbs. System suggests 1 pack (1.5 lbs).

---

### IL12: Zero vs Not-Recorded Distinction

**Hypothesis:** The UI never shows "0" when the real answer is "not yet recorded." Zero means "we know the quantity is zero." Blank/dash means "no data entered."

**Current state:** FAILING across multiple surfaces. The lifecycle view returns `COALESCE(purchased_qty, 0)` - so "not purchased" and "we know nothing was purchased" both show as 0. Same for used_qty and leftover.

**Failure mode:** Chef sees "Purchased: 0 lbs" for salmon. Did they buy none, or did they just not log the purchase? System gives no signal. Chef can't trust any number because 0 might mean "missing data" or "actual zero."

**Fix required:**

1. In the lifecycle server action, track whether data EXISTS (not just its value). Return `purchasedQty: number | null` where null = "no transactions found" and 0 = "transactions exist but net to zero"
2. UI renders null as "-" or "Not recorded" and 0 as "0"
3. Apply this pattern everywhere: inventory on-hand, usage, leftovers

**Verification:** Event with no purchase transactions shows "Not recorded" for purchased_qty. Event where chef explicitly entered 0 waste shows "0 lbs" for waste.

---

### IL13: Cost Projection Accuracy

**Hypothesis:** Cost projections for buy quantities use yield-adjusted amounts, not raw recipe amounts.

**Current state:** MIXED. The grocery list budget guardrail (`generate-grocery-list.ts:282-321`) uses `item.totalQuantity` (now yield-adjusted after this session's changes) times `price_per_unit`. But `recipe_ingredients.computed_cost_cents` (from the cascade engine in migration `20260330000095`) already accounts for yield: `(cost_per_unit * quantity * 100) / yield_pct`. So cost is adjusted at the recipe level, but the cost shown on the shopping list may differ from the cost shown on the recipe card.

**Failure mode:** Recipe card says ingredient costs $8 (yield-adjusted). Shopping list says ingredient costs $4 (using raw last_price_cents \* quantity without knowing yield was already factored in elsewhere). Two different cost numbers for the same ingredient on the same event.

**Fix required:** Establish one source of truth for "estimated cost to buy this ingredient for this event":

- `buy_qty * price_per_unit` is the correct formula
- Both recipe cost displays and shopping list cost displays must use this
- If `computed_cost_cents` on recipe_ingredients already factors yield, don't double-adjust

**Verification:** For an ingredient with yield 50%, recipe qty 2 lbs, price $5/lb: recipe cost = $20 (2 lbs _ $5 _ 100/50 = need to buy 4 lbs \* $5). Shopping list cost = $20. Same number everywhere.

---

### IL14: Multi-Event Ingredient Allocation

**Hypothesis:** When a chef buys ingredients for multiple events in one shopping trip, the system can allocate costs across events proportionally.

**Current state:** NOT BUILT. `inventory_transactions.event_id` is singular. A receive transaction links to ONE event or NULL. If a chef buys a 25 lb bag of flour for 3 events, there's no way to split the cost.

**Failure mode:** Chef does one big Costco run for 3 events this week. Logs the receipt. All cost goes to one event (or none). Per-event food cost analysis is wrong. Chef can't answer "what did each dinner actually cost me in ingredients?"

**Fix required:**

1. Allow receive transactions to be split: "I bought 25 lbs flour. Allocate 10 lbs to Event A, 8 lbs to Event B, 7 lbs to Event C"
2. OR: create multiple receive transactions from one purchase, each linked to a different event
3. Unallocated remainder stays in general inventory (no event_id)
4. Shopping list could pre-calculate the split based on each event's demand ratio

**Verification:** Buy 25 lbs flour. 3 events need 10, 8, 7 lbs respectively. Allocate. Each event's lifecycle view shows correct purchased_qty. Costs split proportionally.

---

### IL15: Under-Buy Detection

**Hypothesis:** After a chef logs purchases for an event, the system alerts if purchased quantity is less than the required buy quantity for any ingredient.

**Current state:** NOT BUILT. The lifecycle view computes `purchase_variance_qty` (purchased - buy_qty), which would be negative for under-buys. But no alert, no notification, no UI flag.

**Failure mode:** Chef buys 3 lbs salmon when they need 4.4 lbs (yield-adjusted). They don't realize until mid-prep that they're 1.4 lbs short. Could have been caught at checkout if the system flagged it.

**Fix required:**

1. After logging purchases, if any `purchased_qty < buy_qty`, show warning: "You may be short on: Salmon (bought 3 lbs, need 4.4 lbs)"
2. Non-blocking. Chef may have inventory, may have a plan, may know they're buying more later.
3. Color-code in the lifecycle view: green (purchased >= needed), yellow (close), red (significantly under)

**Verification:** Log purchase of 3 lbs for an ingredient needing 4.4 lbs. Warning appears. Log purchase of 5 lbs. Warning clears.

---

### IL16: Guest Count Change Propagation

**Hypothesis:** When a chef changes an event's guest count after a shopping list has been generated, the system recalculates quantities rather than showing stale numbers.

**Current state:** PARTIAL. Shopping lists are generated on-demand (not stored as snapshots), so they always use current guest count at generation time. But:

- The grocery list uses live `event.guest_count` (correct)
- The shopping list uses `components.scale_factor` (does not auto-update with guest count - see IL3)
- `smart_grocery_lists` and `shopping_lists` tables store snapshots (JSONB items) that go stale

**Failure mode:** Chef generates grocery list for 10 guests. Client changes to 15 guests. Chef opens the saved list (from `smart_grocery_lists`). Still shows quantities for 10. Chef under-buys by 50%.

**Fix required:**

1. Stored/saved lists must display a staleness indicator if guest_count changed since generation: "Generated for 10 guests. Event now has 15 guests. Regenerate?"
2. Attach `generated_for_guest_count` to saved list metadata
3. On event guest_count change, invalidate/flag any saved lists for that event

**Verification:** Generate and save grocery list for 10-guest event. Change guest count to 15. Open saved list. Staleness warning appears. Regenerate shows updated quantities.

---

### IL17: Staple Ingredient Handling

**Hypothesis:** Staple ingredients (salt, pepper, oil) are handled consistently across all list generators and views.

**Current state:** INCONSISTENT.

- `upcoming_ingredient_demand` view (migration `20260325000005:34`): `WHERE NOT i.is_staple` - staples excluded
- `generate-grocery-list.ts`: no staple filter. Staples included.
- `shopping-list-actions.ts`: no staple filter. Staples included.
- `event_ingredient_lifecycle` view (new, this session): no staple filter. Staples included.

**Failure mode:** Chef adds salt to every recipe (realistic). Demand view says "you don't need salt" (excluded). Grocery list says "buy 4 cups salt" (included). Lifecycle tracks salt. Inconsistent treatment of the same ingredient.

**Fix required:** Decide on a policy and apply it uniformly:

- Option A: Staples always appear but are visually grouped separately ("Staples - assumed on hand")
- Option B: Staples excluded from shopping lists by default, with a toggle to include them
- Option C: Staples included everywhere (current behavior in lists, simplest)
- Whatever the choice, apply it to ALL surfaces: lists, views, demand forecasting

**Verification:** Add salt to a recipe. All list generators and views either include or exclude it consistently. No surface contradicts another.

---

### IL18: Waste Category Consistency

**Hypothesis:** Waste/loss is categorized the same way everywhere, and all waste data is numerically aggregatable.

**Current state:** FAILING.

- `waste_logs.quantity`: NUMERIC(10,3) - aggregatable
- `event_waste_logs.quantity_description`: TEXT - not aggregatable. Free text like "about half a pan" or "2 cups"
- `unused_ingredients.estimated_cost_cents`: exists, but no quantity field
- Different reason enums across tables: `waste_logs.reason` vs `event_waste_logs.reason` vs `unused_ingredients.reason` - partially overlapping

**Failure mode:** Chef logs waste across different surfaces. Quarterly report asks "how much did I waste?" System can't sum `event_waste_logs` because quantities are text. Can't combine across tables because schemas differ. Chef gets a partial, unreliable number.

**Fix required:**

1. Add `quantity NUMERIC(10,3)` and `unit TEXT` to `event_waste_logs` alongside `quantity_description`
2. Parse numeric quantities when possible, keep text as fallback display
3. Standardize waste reason enum across all waste-tracking tables (or create a mapping)
4. Lifecycle view should include a waste_qty column sourced from the numeric field

**Verification:** Log waste with quantity "2.5 lbs" via event waste. Query aggregation. Returns 2.5, not a text error. Total waste across 5 events sums correctly.

---

### IL19: Yield Division Safety

**Hypothesis:** Division by yield_pct never produces NaN, Infinity, or a negative number, in both TypeScript and SQL.

**Current state:** GUARDED in new code (this session): TypeScript uses `Math.max(yieldPct, 1)`, SQL uses `GREATEST(..., 1)`. But:

- The DB CHECK constraint allows `yield_pct > 0` (not >= 1), so 0.5 is valid but would produce 200x inflation
- `default_yield_pct DEFAULT 100` with `CHECK (NULL OR (> 0 AND <= 100))` - so it can be 1 (100x inflation, probably wrong) or 99 (negligible)
- Existing code paths that read yield (cascade engine in migration `20260330000095`) use `COALESCE(yield_pct, 100)` with no floor

**Failure mode:** Chef enters yield_pct = 1 (typo, meant 100 or 10). System inflates quantity 100x. Shopping list says buy 200 lbs of parsley. At best, chef ignores the system. At worst, they order it.

**Fix required:**

1. UI validation: yield_pct must be between 5 and 100. Below 5% is almost certainly an error (even the most wasteful prep, like artichoke hearts, yields ~15%).
2. Server-side validation in the update action: reject yield_pct < 5 with a human-readable error
3. Keep DB CHECK as-is (> 0 AND <= 100) for schema flexibility, but application layer enforces tighter bounds

**Verification:** Try to set yield_pct = 0. Rejected. Try 1. Rejected (below 5). Try 3. Rejected. Try 5. Accepted. Try 100. Accepted. Try 101. Rejected by DB constraint.

---

### IL20: Prep View With Adjusted Quantities

**Hypothesis:** When a chef is prepping for an event, they see the RECIPE quantity (what to measure) alongside the BUY quantity (what was purchased), not just one or the other.

**Current state:** NOT BUILT as a dedicated view. The recipe card shows recipe quantities. The shopping list shows buy quantities. During prep, the chef needs: "Recipe says measure 2 lbs salmon. You bought 4.4 lbs (whole fish). After filleting you should have ~2 lbs usable."

**Failure mode:** Chef bought 5 lbs whole salmon (for 2 lbs usable at 45% yield). Looks at recipe: "2 lbs salmon." Looks at their 5 lb fish. "Do I use all of it? Was the 2 lbs before or after filleting?" Confusion during time-critical prep.

**Fix required:**

1. Prep/production view for an event shows per ingredient:
   - Recipe qty (what the recipe calls for, what you measure into the dish)
   - Buy qty (what was needed from the store, yield-adjusted)
   - Yield note (e.g., "45% yield from whole fish - expect ~55% trim")
   - Purchased qty (what was actually bought, if logged)
2. This is the chef's prep checklist. It translates between "what I have in front of me" and "what the recipe needs."

**Verification:** Event with a recipe using 2 lbs salmon at 45% yield. Prep view shows: Recipe: 2 lbs | Buy: 4.44 lbs | Yield: 45% | Note: "Expect ~2.44 lbs trim." If purchase was logged (5 lbs), shows: Purchased: 5 lbs | Expected usable: 2.25 lbs (5 \* 0.45).

---

## Dependency Graph

```
IL1 (yield write path)
 ├── IL2 (waste factor auto-suggestion) depends on IL1
 ├── IL5 (yield inflation math) depends on IL1
 ├── IL19 (division safety) depends on IL1
 └── IL20 (prep view) depends on IL1

IL3 (scaling consistency)
 └── IL4 (sub-recipe completeness) independent but same surface

IL6 (purchase linkage)
 ├── IL7 (usage logging) related workflow
 ├── IL14 (multi-event allocation) extends IL6
 └── IL15 (under-buy detection) depends on IL6

IL12 (zero vs not-recorded) applies to IL6, IL7, IL8, IL9
```

---

## Priority Order (Build Sequence)

**Phase 1 - Unblock the dead system (all users benefit):**

1. **IL1** - Yield write path. Without this, yield is dead. Everything else depends on it.
2. **IL19** - Division safety. Must ship alongside IL1 (can't open yield input without guardrails).
3. **IL2** - Waste factor bridge. Makes yield_pct useful for chefs who don't know yield numbers from memory.
4. **IL3** - Scaling consistency. Eliminates the "two different answers" problem.

**Phase 2 - Complete the chain (high leverage):** 5. **IL4** - Sub-recipe completeness. Data loss fix, not a new feature. 6. **IL5** - Yield inflation verification. Proves Phase 1 works end-to-end. 7. **IL10** - Unit consistency. Eliminates duplicate line items. 8. **IL12** - Zero vs not-recorded. Trust foundation for all lifecycle data.

**Phase 3 - Close the loop (workflows):** 9. **IL6** - Purchase event linkage. Enables Stages 3-5 of the lifecycle. 10. **IL7** - Usage logging workflow. Makes variance analysis real. 11. **IL15** - Under-buy detection. Immediate chef value from IL6. 12. **IL16** - Guest count staleness. Prevents stale saved lists.

**Phase 4 - Polish and power features:** 13. **IL8** - Leftover carry-forward reduction. Smart inventory usage. 14. **IL20** - Prep view. The payoff: one screen with the full story. 15. **IL13** - Cost projection accuracy. Financial clarity. 16. **IL17** - Staple handling. Consistency fix. 17. **IL18** - Waste category consistency. Reporting foundation. 18. **IL14** - Multi-event allocation. Power user feature. 19. **IL11** - Package size rounding. Nice-to-have.

---

## Exit Criteria

The ingredient lifecycle system is DONE when:

1. A chef can set yield_pct on any recipe ingredient (IL1)
2. The system suggests USDA yields when known (IL2)
3. Both shopping list generators produce identical, yield-adjusted quantities (IL3, IL5)
4. Sub-recipe ingredients never go missing (IL4)
5. A chef can see the full 5-stage chain for any completed event: recipe → buy → purchased → used → leftover (IL9)
6. "0" and "not recorded" are visually distinct everywhere (IL12)
7. No division by zero, no 100x inflation, no negative quantities anywhere (IL19)
