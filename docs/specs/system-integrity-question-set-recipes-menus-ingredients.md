# System Integrity Question Set: Recipes, Menus & Ingredients

> 50 binary pass/fail questions across 10 domains.
> Executed 2026-04-17. Sweep covers the full recipe-to-menu-to-event data pipeline.

---

## Domain A: Recipe CRUD & Validation (5 questions)

| #   | Question                                                                              | P/F       | Evidence                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Does every recipe mutation validate input with Zod before DB write?                   | PASS      | `createRecipe()` uses `CreateRecipeSchema.parse(input)` at `actions.ts:222`. `updateRecipe()` uses `UpdateRecipeSchema.parse(input)` at `:640`. `addIngredientToRecipe()` uses `AddIngredientToRecipeSchema.parse(input)` at `:743`. All mutations schema-validated. |
| A2  | Does `createRecipeWithIngredients` have compensating rollback on ingredient failure?  | PASS      | `actions.ts:2434-2453`: on ingredient error, deletes the recipe row, returns structured `{ success: false, code: 'ingredient_validation' }`. Full compensating cleanup.                                                                                              |
| A3  | Does `createRecipeWithIngredients` check for duplicate recipe names?                  | PASS      | `actions.ts:2396-2408`: case-insensitive `ilike` lookup before insert. Returns `code: 'duplicate_recipe'` on match.                                                                                                                                                  |
| A4  | Does `deleteRecipe` unlink from components before deleting?                           | PASS      | `actions.ts:706-717`: sets `recipe_id = null` on components, deletes `recipe_ingredients`, deletes both directions of `recipe_sub_recipes`, then deletes recipe. Correct cleanup order.                                                                              |
| A5  | Does `deleteRecipe` guard against deleting recipes currently in use by active events? | **FIXED** | Was missing: no guard. Added active-event check via raw SQL join (components->dishes->menus->events where status not completed/cancelled). Throws with actionable error message. Force flag available for override.                                                  |

## Domain B: Menu Lifecycle & State Machine (5 questions)

| #   | Question                                                                 | P/F  | Evidence                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Is the menu state machine enforced with valid transitions map?           | PASS | `VALID_MENU_TRANSITIONS` at `actions.ts:791-796`. draft->[shared,archived], shared->[locked,draft,archived], locked->[archived], archived->[draft]. Enforced in `transitionMenu()`.     |
| B2  | Does every menu transition log an immutable audit entry?                 | PASS | `transitionMenu()` at `actions.ts:867-874` inserts into `menu_state_transitions`. `unlockMenu()` at `:1026-1033` also logs. `createMenu()` at `:227-233` logs initial draft transition. |
| B3  | Does `updateMenu` enforce optimistic concurrency control?                | PASS | `actions.ts:471-477`: `expected_updated_at` compared against DB value, throws `createConflictError` on mismatch. Double-checked with re-read on conflict.                               |
| B4  | Does `updateMenu` block edits on locked menus?                           | PASS | `actions.ts:467-469`: `if (currentMenu.status === 'locked') throw`. Also, `addDishToMenu()` at `:1067-1069` checks locked status.                                                       |
| B5  | Does `unlockMenu` require a reason and enforce locked-only precondition? | PASS | `actions.ts:995-1038`: checks `menu.status !== 'locked'` throws error. Logs unlock with `notes: reason`. Separate path from `transitionMenu()` to enforce reason requirement.           |

## Domain C: Ingredient Management & Dedup (5 questions)

| #   | Question                                                                      | P/F  | Evidence                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Does `findOrCreateIngredient` deduplicate case-insensitively?                 | PASS | `actions.ts:1419-1425`: uses `.ilike('name', name)` for case-insensitive lookup. Returns existing ID if found.                                                                         |
| C2  | Does new ingredient creation auto-match to system_ingredients?                | PASS | `actions.ts:1452-1457`: calls `autoMatchToSystemIngredient()` non-blocking after creation. Uses pg_trgm similarity > 0.5 threshold.                                                    |
| C3  | Does auto-matching require chef confirmation before affecting pricing?        | PASS | `actions.ts:1510-1518`: `confirmed_at` left null on auto-created aliases. Comment: "chef must review and approve auto-matches."                                                        |
| C4  | Does `ensureIngredientHasPrice` resolve from 10-tier chain on ingredient add? | PASS | `actions.ts:2000-2109`: checks if already priced, calls `resolvePrice()`, falls back to alias sibling lookup, writes resolved price with source/confidence metadata.                   |
| C5  | Does ingredient name normalization handle abbreviations and plurals?          | PASS | `ingredient-matching-utils.ts:normalizeIngredientName()` strips punctuation, expands abbreviations (evoo->extra virgin olive oil), strips articles, depluralize via pluralize library. |

## Domain D: Cost Pipeline & Price Resolution (5 questions)

| #   | Question                                                                            | P/F  | Evidence                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Does `computeRecipeIngredientCost` use unit-aware conversion with density?          | PASS | `actions.ts:1937-1990`: imports `computeIngredientCost`, `canConvert`, `lookupDensity` from conversion engine. Gets density from ingredient record or common densities. Returns warning on unit mismatch. |
| D2  | Does cost computation apply yield percentage?                                       | PASS | `actions.ts:1985-1988`: `yieldPct = overrideYieldPct ?? ingredient.default_yield_pct ?? 100`. Adjusts: `rawCost * 100 / yieldPct`. Applied after unit conversion.                                         |
| D3  | Does `refreshRecipeTotalCost` compute cost_per_serving from yield_quantity?         | PASS | `actions.ts:2140-2141`: `yieldQty = recipe.yield_quantity`. `costPerServing = Math.round(totalCents / yieldQty)`. Null-safe.                                                                              |
| D4  | Does `propagatePriceChange` cascade ingredient price changes to recipes and events? | PASS | `cost-refresh-actions.ts:19-120`: recomputes recipe_ingredient costs, refreshes recipe totals, finds affected events via components->dishes->menus->events, sets `cost_needs_refresh = true`.             |
| D5  | Does price resolution include confidence decay based on age?                        | PASS | `resolve-price.ts` step function: 3d=100%, 14d=90%, 30d=75%, 60d=50%, 90d=30%, >90d=15%. Applied to all resolved prices.                                                                                  |

## Domain E: Scaling & Portioning (5 questions)

| #   | Question                                                                                  | P/F  | Evidence                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------------------------------- |
| E1  | Does recipe scaling use non-linear exponents per ingredient category?                     | PASS | `recipe-scaling.ts:156`: delegates to `smartScale()` from `portion-standards.ts`. Power law: `base * scaleFactor^exponent`. Per-category exponents (spice=0.75, protein=1.0, oil=0.88, etc.). |
| E2  | Does scaling warn on high scale factors (>4x)?                                            | PASS | `recipe-scaling.ts:146-149`: `if (scaleFactor > 4) warnings.push(...)`. Warning about manual adjustment for baking/structure.                                                                 |
| E3  | Does `getScaledRecipe` use yield_quantity when available, fallback to servings?           | PASS | `scaling-actions.ts:80`: `originalYield = recipe.yield_quantity ?? recipe.servings ?? 1`. Correct priority.                                                                                   |
| E4  | Does `getScaledMenuForEvent` correctly traverse event->menu->dishes->components->recipes? | PASS | `scaling-actions.ts:111-198`: loads event, finds menu by event_id (with deleted_at null), gets dishes, gets components with recipe_id, deduplicates recipe IDs, scales each.                  |
| E5  | Does scaling handle edge case of zero/negative yields?                                    | PASS | `recipe-scaling.ts:127-141`: `if (originalYield <= 0                                                                                                                                          |     | targetYield <= 0)` returns original quantities with warning. No division by zero. |

## Domain F: Shopping List & Inventory (5 questions)

| #   | Question                                                          | P/F       | Evidence                                                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------------------------- | --- | ------------------------------------------------------------------------------------ |
| F1  | Does `generateShoppingList` apply yield percentage adjustment?    | PASS      | `shopping-list-actions.ts:332-336`: `yieldPct = row.yield_pct                                                                                                                                                                                                          |     | ingredient.default_yield_pct |     | 100`. `buyQty = (recipeQty \* 100) / yieldPct`. Correct yield-adjusted buy quantity. |
| F2  | Does shopping list follow sub-recipes recursively?                | PASS      | `shopping-list-actions.ts:116-139`: BFS loop over `recipe_sub_recipes`, accumulates child multipliers from parent. Visited set prevents infinite loops.                                                                                                                |
| F3  | Does shopping list subtract on-hand inventory?                    | PASS      | `shopping-list-actions.ts:309-316`: `onHandByIngredient` map from `inventory_transactions`. Subtracted in aggregation to compute `toBuy`.                                                                                                                              |
| F4  | Does shopping list consolidate compatible units via conversion?   | PASS      | `shopping-list-actions.ts:370-379`: `canConvert()` check, then `addQuantities()` for unit consolidation across recipes.                                                                                                                                                |
| F5  | Does `getMenuShoppingList` apply per-ingredient yield adjustment? | **FIXED** | Was missing: query did not select `yield_pct` or `default_yield_pct`, and scaling loop did not apply yield adjustment. Added both fields to select, compute `yieldAdjustedQty = (scaledQty * 100) / yieldPct` matching the event-level `generateShoppingList` pattern. |

## Domain G: Dietary & Allergen Safety (5 questions)

| #   | Question                                                                   | P/F  | Evidence                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1  | Does allergen checking cover all FDA Top 9 + extras?                       | PASS | `allergen-check.ts:8-223`: 11 allergen groups (dairy, eggs, fish, shellfish, tree_nuts, peanuts, wheat, soy, sesame, gluten, nightshade). Covers all FDA Top 9 plus gluten and nightshade.             |
| G2  | Does `checkDishAgainstAllergens` deduplicate conflicts per dish+allergen?  | PASS | `allergen-check.ts:263-266`: `alreadyFlagged` check prevents duplicate entries for same dishId + allergen.                                                                                             |
| G3  | Does `analyzeRecipeDietaryCompatibility` use deterministic rules (not AI)? | PASS | `actions.ts:2271-2298`: imports from `lib/constants/dietary-rules.ts`, uses `checkIngredientsAgainstDiet()`. Pure keyword matching, 13 diets, no LLM call.                                             |
| G4  | Does `applyDietaryTags` merge with existing tags (not overwrite)?          | PASS | `actions.ts:2337-2338`: `existing = recipe.dietary_tags`, `merged = [...new Set([...existing, ...tags])]`. Set union, preserves manual tags.                                                           |
| G5  | Does the shopping list cross-reference client allergy records?             | PASS | `shopping-list-actions.ts:252-281`: fetches `client_allergy_records` for all clients in date window, builds `clientAllergyMap`. Items include `dietaryWarnings: { clientName, allergen, severity }[]`. |

## Domain H: Import & Parsing (5 questions)

| #   | Question                                                      | P/F  | Evidence                                                                                                                                                                                 |
| --- | ------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Does URL import extract schema.org/Recipe JSON-LD without AI? | PASS | `import-actions.ts:1-4`: "No AI needed: pure HTML parsing + regex." Extracts JSON-LD, parses ISO 8601 durations, maps categories. Uses `parseIngredientString()` for ingredient parsing. |
| H2  | Does the ingredient parser handle Unicode fractions?          | PASS | `ingredient-parser.ts:14-30`: `UNICODE_FRACTIONS` map with 15 entries (1/2 through 7/8). Processed before numeric parsing.                                                               |
| H3  | Does the ingredient parser handle "to taste" and "pinch of"?  | PASS | Per explore agent: handles "to taste", "pinch of", parenthetical sizes, ranges. Returns null quantity for unmeasured items.                                                              |
| H4  | Does CSV import validate categories with aliases?             | PASS | `csv-import-actions.ts:66-120`: `VALID_CATEGORIES` set + `CATEGORY_ALIASES` map (meat->protein, noodle->pasta, stew->soup, etc.). Falls back to 'other'.                                 |
| H5  | Does CSV import handle per-row errors without aborting batch? | PASS | Per explore agent: bulk insert with per-row error handling. Failed rows reported in errors array, successful rows still imported.                                                        |

## Domain I: Menu-Event Integration (5 questions)

| #   | Question                                                                 | P/F  | Evidence                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Is menu-event attachment atomic (RPC)?                                   | PASS | `actions.ts:688-706`: `attachMenuToEvent` uses `db.rpc('attach_menu_to_event_atomic')`. Single DB function.                                                                         |
| I2  | Is menu-event detachment atomic (RPC)?                                   | PASS | `actions.ts:712-733`: `detachMenuFromEvent` uses `db.rpc('detach_menu_from_event_atomic')`. Returns detached event_id for cache busting.                                            |
| I3  | Does `deleteMenu` prevent deleting event-attached menus?                 | PASS | `actions.ts:631-633`: `if (menu.event_id) throw 'Cannot delete menu attached to an event. Detach first.'` Explicit guard.                                                           |
| I4  | Does `duplicateMenu` deep-copy the full hierarchy (dishes + components)? | PASS | `actions.ts:1465-1537`: copies dishes with all fields, copies components per dish including recipe_id, portion fields, prep fields. Logs draft transition. Never attached to event. |
| I5  | Does `transitionMenu` to 'shared' notify linked clients?                 | PASS | `actions.ts:897-933`: `circleFirstNotify()` for menu shared. Looks up event_id and inquiry_id for context. Non-blocking.                                                            |

## Domain J: Data Integrity & Tenant Isolation (5 questions)

| #   | Question                                              | P/F  | Evidence                                                                                                                                                                     |
| --- | ----------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | Are all recipe queries tenant-scoped?                 | PASS | Every query in `recipes/actions.ts` includes `.eq('tenant_id', user.tenantId!)`. 40+ queries verified.                                                                       |
| J2  | Are all menu queries tenant-scoped?                   | PASS | Every query in `menus/actions.ts` includes `.eq('tenant_id', user.tenantId!)`. Soft-delete filter also applied.                                                              |
| J3  | Are client-facing showcase queries access-controlled? | PASS | `showcase-actions.ts:7`: imports `requireClient`. Client showcase endpoints verify client has event relationship with chef before returning data.                            |
| J4  | Does `createMenu` use idempotency wrapper?            | PASS | `actions.ts:192-252`: `executeWithIdempotency()` with `idempotency_key`. Prevents duplicate menu creation on retry/double-click.                                             |
| J5  | Are all monetary amounts stored in cents (integers)?  | PASS | `total_cost_cents`, `cost_per_serving_cents`, `computed_cost_cents`, `last_price_cents`, `cost_per_unit_cents` - all integer cent columns. No floating-point financial math. |

---

## Summary

| Domain                               | Pass   | Fail  | Total  |
| ------------------------------------ | ------ | ----- | ------ |
| A: Recipe CRUD & Validation          | 5      | 0     | 5      |
| B: Menu Lifecycle & State Machine    | 5      | 0     | 5      |
| C: Ingredient Management & Dedup     | 5      | 0     | 5      |
| D: Cost Pipeline & Price Resolution  | 5      | 0     | 5      |
| E: Scaling & Portioning              | 5      | 0     | 5      |
| F: Shopping List & Inventory         | 5      | 0     | 5      |
| G: Dietary & Allergen Safety         | 5      | 0     | 5      |
| H: Import & Parsing                  | 5      | 0     | 5      |
| I: Menu-Event Integration            | 5      | 0     | 5      |
| J: Data Integrity & Tenant Isolation | 5      | 0     | 5      |
| **Total**                            | **50** | **0** | **50** |

**Pass rate: 100% (50/50), 2 found and fixed during sweep**

---

## Fixes Applied During Sweep

### A5: Added guard against deleting recipes in active use (FIXED)

`deleteRecipe()` had no check for active event usage. Added raw SQL join
(components->dishes->menus->events where status not completed/cancelled) before deletion.
Throws actionable error message. `force` flag available for override.

### F5: Added yield_pct to menu shopping list (FIXED)

`getMenuShoppingList()` was missing yield adjustment. Added `yield_pct` and `default_yield_pct`
to the recipe_ingredients query, and applied `yieldAdjustedQty = (scaledQty * 100) / yieldPct`
matching the event-level `generateShoppingList` pattern.
