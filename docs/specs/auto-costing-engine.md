# Spec: Auto-Costing Engine

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `openclaw-v2-unified-pricing.md` (built), `openclaw-price-surfacing.md` (built)
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-28
> **Revised:** 2026-03-28 (spec review: 8 refinements, 8 blind spots addressed)
> **Built by:** not started

---

## What This Does (Plain English)

When a chef creates a menu (whether manually, via paste, or via file upload), every course, dish, component, recipe, and ingredient is automatically costed in real time using the OpenClaw price database and the 8-tier resolution chain. The chef sees the total menu cost, cost per guest, food cost percentage, and a per-ingredient breakdown with source attribution (where the price came from, how fresh it is, how confident we are) without entering a single price manually. Where the system can't find a price, it says so honestly. Where units don't match (recipe says "cups," price is per pound), the conversion engine handles it automatically using ingredient density data. The chef's job is to monitor and confirm, not to do data entry.

---

## Why It Matters

Every competitor (Meez, ChefTec, Galley, MarginEdge) requires manual price entry. Nobody does it consistently, so costing is always stale or empty. ChefFlow has a living price database (OpenClaw) and an 8-tier resolution chain, but they're not wired together end-to-end. This spec closes every gap in the chain so that menu costing "just works" the moment a menu is created.

---

## Current State (What Already Exists)

Before building, the builder must understand what's already in place. This is not a greenfield build. It's a wiring and gap-closing job.

### Already built and working:

1. **Menu hierarchy:** menus -> dishes -> components -> recipes -> recipe_ingredients -> ingredients (Layer 4 schema)
2. **8-tier price resolution:** `lib/pricing/resolve-price.ts` - queries local PostgreSQL, returns best price with source/confidence/freshness
3. **OpenClaw sync:** `lib/openclaw/sync.ts` - nightly Pi-to-ChefFlow price sync into `ingredient_price_history` (exact name match only, no fuzzy matching)
4. **Cascading cost SQL functions:** migration `20260330000095` - yield-aware `compute_recipe_cost_cents()` with sub-recipe support, `yield_pct` on recipe_ingredients, `cost_per_unit_cents` on ingredients
5. **Unit conversion engine:** `lib/units/conversion-engine.ts` - same-type and cross-type (volume/weight) conversion with ~100 hardcoded densities in `COMMON_DENSITIES` + `computeIngredientCost()` function
6. **Portion standards:** `lib/recipes/portion-standards.ts` - sub-linear scaling exponents by ingredient category
7. **System ingredients table:** `system_ingredients` table schema with `weight_to_volume_ratio`, `cup_weight_grams`, `tbsp_weight_grams`, pg_trgm index
8. **Costing page UI:** `app/(chef)/culinary/costing/page.tsx` - shows recipe costs, menu costs, shopping optimizer
9. **Food cost calculator:** `lib/finance/food-cost-calculator.ts` - rating system (excellent/good/fair/high)
10. **Price surfacing UI:** confidence badges, source attribution, freshness indicators (built in openclaw-price-surfacing spec)
11. **TypeScript recipe cost functions:** `computeRecipeIngredientCost()` and `refreshRecipeTotalCost()` in `lib/recipes/actions.ts` - uses conversion engine, writes to `recipe_ingredients.computed_cost_cents` and `recipes.total_cost_cents`

### What is broken or incomplete (verified by code audit):

| #   | Issue                                                                 | Details                                                                                                                                                                                                                                                                          | Impact                                                                                                              |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | **Cascade chain is broken**                                           | SQL functions `recompute_and_store_recipe_cost()` and `recompute_recipe_ingredient_costs()` exist but are **never called from TypeScript**. `cascadeIngredientPrice()` in `lib/inventory/price-cascade-actions.ts` updates price but does NOT trigger recipe cost recomputation. | When an ingredient price changes, all recipes using it remain stale until manually edited.                          |
| 2   | **`events.cost_needs_refresh` is dead code**                          | Column exists (from cascading migration), never set by any code, never checked by any code.                                                                                                                                                                                      | Events never know their costs are stale.                                                                            |
| 3   | **Removing an ingredient from a recipe doesn't refresh recipe total** | `refreshRecipeTotalCost()` is called after add/update but NOT after delete.                                                                                                                                                                                                      | Recipe cost stays inflated by the removed ingredient until something else triggers a refresh.                       |
| 4   | **`system_ingredients` table is empty**                               | Schema exists with all columns + pg_trgm index, but **zero rows seeded**. No seed script exists.                                                                                                                                                                                 | The entire fuzzy matching strategy depends on this table having data. Without it, ingredient matching cannot work.  |
| 5   | **OpenClaw sync ignores `system_ingredients`**                        | Sync sends chef ingredient names directly to Pi by exact string match. No canonical linking, no alias lookup.                                                                                                                                                                    | If chef typed "chicken breast" but OpenClaw knows it as "Boneless Skinless Chicken Breast," the sync gets no match. |
| 6   | **No ingredient name normalization**                                  | "Chicken breast", "chicken breasts", "Chicken Breast", "CHKN BREAST" are all treated as different ingredients. No case folding, no depluralization, no abbreviation handling.                                                                                                    | Fuzzy matching will underperform without pre-normalization.                                                         |
| 7   | **Two competing cost computation paths**                              | SQL functions (`compute_recipe_cost_cents`) do yield-aware math but no unit conversion. TypeScript functions (`computeRecipeIngredientCost`) do unit conversion via density but through a different code path. Both write to `recipes.total_cost_cents`.                         | Potential for conflicting cost numbers depending on which path ran last.                                            |
| 8   | **Density data is sparse**                                            | `COMMON_DENSITIES` in conversion engine has ~100 entries. `system_ingredients` (the intended density source) is empty. `ingredients.weight_to_volume_ratio` is rarely populated.                                                                                                 | Cross-type unit conversion (cups to lbs) silently returns null for most ingredients.                                |

### The 6 original gaps + 5 newly discovered gaps this spec closes:

| #   | Gap                                                                        | Fix                                                                         |
| --- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | DB function reads `last_price_cents` but `resolvePrice()` has better data  | Bridge: sync resolved prices to `cost_per_unit_cents`                       |
| 2   | OpenClaw prices excluded from `ingredients.last_price_cents` by design     | Use `cost_per_unit_cents` as primary field, populated from `resolvePrice()` |
| 3   | No unit conversion in cost calculation                                     | Wire conversion engine into the refresh job                                 |
| 4   | Component `scale_factor` ignored in `compute_menu_cost_cents()`            | Apply `scale_factor` in SQL function                                        |
| 5   | No ingredient name matching between chef's ingredients and canonical names | Add fuzzy matching + manual alias confirmation                              |
| 6   | No costing confidence summary per menu                                     | Add coverage score                                                          |
| 7   | **NEW:** Cascade chain broken (price change doesn't propagate to recipes)  | Build `propagatePriceChange()` function                                     |
| 8   | **NEW:** `system_ingredients` empty (blocking for matching)                | Seed with 500+ ingredients from USDA data                                   |
| 9   | **NEW:** No name normalization before matching                             | Add `normalizeIngredientName()` function                                    |
| 10  | **NEW:** `cost_needs_refresh` dead code                                    | Wire it into the cascade chain                                              |
| 11  | **NEW:** Package price vs. unit price ambiguity in OpenClaw data           | Verify sync divides package price by quantity (Prerequisite 0)              |

---

## Prerequisites (MUST COMPLETE BEFORE BUILDING)

These are blocking. The builder agent cannot start the main spec until these are done.

### Prerequisite 0: Verify OpenClaw package-price-to-unit-price conversion (HIGHEST RISK)

**Why blocking:** The scraped data in `scripts/openclaw-scraped-prices.json` stores **package prices**, not per-unit prices. Example: `"priceCents": 608` for a `"packageSize": "12.7 oz"` item. That's $6.08 for the whole package, not $6.08 per ounce. If the OpenClaw sync writes 608 as `price_per_unit_cents` instead of `608 / 12.7 = 48`, every OpenClaw price in the system is 10-20x too high. This would silently corrupt every cost calculation downstream and produce absurd menu costs.

**How to verify:**

1. Check `lib/openclaw/sync.ts` for the price normalization logic. Look for division by package quantity.

2. Spot-check the database:

   ```sql
   -- If these numbers look like package prices ($3-$15) instead of per-unit prices ($0.20-$2.00), the conversion is broken
   SELECT i.name, iph.price_per_unit_cents, iph.unit, iph.store_name, iph.source
   FROM ingredient_price_history iph
   JOIN ingredients i ON i.id = iph.ingredient_id
   WHERE iph.source LIKE 'openclaw_%'
   ORDER BY iph.purchase_date DESC
   LIMIT 20;
   ```

3. Cross-reference against the raw JSON: pick 3 products from `openclaw-scraped-prices.json`, compute expected per-unit price manually, compare to what's in `ingredient_price_history`.

**If broken:** Fix the sync's price normalization before proceeding. Every number in the auto-costing engine depends on this being correct.

### Prerequisite 1: Seed `system_ingredients` with real data

**Why blocking:** The entire fuzzy matching strategy (pg_trgm against `system_ingredients`) depends on this table being populated. Without seed data, the matching UI shows nothing and ingredient aliases can't be created.

**What to seed:** At minimum 500 common ingredients covering all categories (protein, produce, dairy, pantry, spice, oil, baking, frozen, canned, fresh_herb, dry_herb, condiment, beverage, specialty). Each needs:

- `name` - canonical name (e.g., "All-Purpose Flour", "Boneless Skinless Chicken Breast")
- `category` - ingredient_category enum value
- `subcategory` - e.g., "citrus", "root vegetables", "poultry"
- `unit_type` - weight, volume, each, or bunch
- `standard_unit` - g, oz, ml, fl_oz, each, or bunch
- `weight_to_volume_ratio` - grams per mL (density). Critical for unit conversion.
- `cup_weight_grams` - weight of 1 US cup of this ingredient
- `tbsp_weight_grams` - weight of 1 US tablespoon
- `allergen_tags` - Big 9 allergens
- `common_prep_actions` - JSONB array of {action, yield_pct} pairs (e.g., [{"action": "peel", "yield_pct": 85}])

**Data sources (use all three, in this priority order):**

1. **`scripts/openclaw-scraped-prices.json`** (988KB, already on disk) - parse this file to extract unique ingredient names. These are real product names from local stores (Market Basket, Walmart, Hannaford, etc.). Extract the canonical ingredient name from each product (e.g., "Market Basket Boneless Skinless Chicken Breast 2.5lb" -> "Boneless Skinless Chicken Breast"). This gives you 300-500 real ingredient names that match what OpenClaw already prices.

2. **`COMMON_DENSITIES`** in `lib/units/conversion-engine.ts` (~100 entries) - each key is an ingredient name with its g/mL density. Copy these directly into `weight_to_volume_ratio`. Compute `cup_weight_grams` as `density * 236.588` (mL per US cup) and `tbsp_weight_grams` as `density * 14.787` (mL per US tbsp).

3. **Hardcoded culinary knowledge** for anything the first two sources don't cover - common proteins, produce, dairy, pantry staples. The builder agent has enough culinary knowledge to populate `category`, `subcategory`, `allergen_tags`, `unit_type`, `standard_unit`, and `common_prep_actions` for standard ingredients. Use USDA Big 9 allergen classifications.

**Generation strategy:** Create a Node.js script `scripts/generate-system-ingredients-seed.mjs` that:

1. Reads `scripts/openclaw-scraped-prices.json` and extracts unique ingredient names
2. Reads `COMMON_DENSITIES` from conversion-engine.ts (or duplicates the map)
3. Cross-references to populate density data where available
4. Outputs a SQL migration file with INSERT statements
5. The builder runs this script once to generate the migration, then commits the migration file

**Delivery:** Migration file `database/migrations/20260401000113_seed_system_ingredients.sql` with INSERT statements. The table uses RLS (only service_role can write), so the migration runs as superuser.

**Minimum viable seed:** 500 ingredients. Must cover every `ingredient_category` enum value. At least 50% should have `weight_to_volume_ratio` populated (the rest can be null; the conversion engine will fall back to `COMMON_DENSITIES` or skip cross-type conversion). Every ingredient must have `name`, `category`, `unit_type`, `standard_unit`, and `allergen_tags` populated.

### Prerequisite 2: Verify OpenClaw sync is running and has data

**Why blocking:** If `ingredient_price_history` has no rows where `source LIKE 'openclaw_%'`, the entire resolution chain below Tier 2 is empty and auto-costing has nothing to work with.

**How to verify:**

```sql
SELECT source, COUNT(*), MAX(purchase_date) as most_recent
FROM ingredient_price_history
WHERE source LIKE 'openclaw_%'
GROUP BY source
ORDER BY source;
```

If empty: the Pi sync hasn't run or hasn't been configured. Fix that first.

### Prerequisite 3: Decide SQL vs TypeScript cost authority

**The problem:** Two code paths compute recipe costs with different capabilities:

| Path                                                                     | Unit conversion             | Yield-aware         | Sub-recipes         | Where result goes                                                               |
| ------------------------------------------------------------------------ | --------------------------- | ------------------- | ------------------- | ------------------------------------------------------------------------------- |
| SQL: `compute_recipe_cost_cents()`                                       | No                          | Yes                 | Yes (recursive CTE) | Returned on every call; also stored by `recompute_and_store_recipe_cost()`      |
| TypeScript: `computeRecipeIngredientCost()` + `refreshRecipeTotalCost()` | Yes (via conversion engine) | Yes (via yield_pct) | No                  | Stored in `recipe_ingredients.computed_cost_cents` + `recipes.total_cost_cents` |

**Recommendation (this spec adopts this):**

- **TypeScript is the authority** for computing and storing costs. It has unit conversion, which SQL doesn't.
- **SQL functions remain** for the `menu_cost_summary` view (fast listing queries). They read the STORED values (`recipes.total_cost_cents`, `ingredients.cost_per_unit_cents`) rather than recomputing from scratch.
- **The refresh job writes to `cost_per_unit_cents` in the ingredient's `default_unit`** so that the SQL function's simple `quantity * cost_per_unit_cents` multiplication is correct without unit conversion.
- **This means unit conversion happens once (at refresh time)**, not on every query. Both paths produce the same number.

---

## Architecture Decisions (READ BEFORE BUILDING)

### Decision 1: TypeScript is the cost computation authority; SQL reads stored values

The cost refresh job uses TypeScript (`resolvePricesBatch()` + `computeIngredientCost()` from the conversion engine) to compute the correct cost per unit, converting units as needed. It writes the result to `ingredients.cost_per_unit_cents` **in the ingredient's `default_unit`**. The SQL function `compute_recipe_cost_cents()` then does simple `quantity * cost_per_unit_cents / yield_pct` math with no conversion needed. Both paths produce the same number because the conversion already happened at write time.

### Decision 2: A nightly + on-demand "cost refresh" job populates `cost_per_unit_cents`

A server-side function calls `resolvePricesBatch()` for all active ingredients, runs unit normalization via the conversion engine, and writes the best price to `ingredients.cost_per_unit_cents`. This is the bridge between the resolution chain and the DB cost functions. It runs:

- Nightly (after OpenClaw sync completes)
- On-demand when a chef opens the costing page or creates a menu
- On-demand when a chef logs a receipt
- On-demand when a chef confirms an ingredient match

### Decision 3: Unit conversion happens at refresh time, not query time

When the cost refresh job finds a price in "per lb" but the ingredient's `default_unit` is "cup," it converts using the density from:

1. `ingredients.weight_to_volume_ratio` (chef-set, highest priority)
2. `system_ingredients.weight_to_volume_ratio` (via confirmed alias)
3. `COMMON_DENSITIES` lookup in conversion engine (hardcoded fallback)
4. If none available: store the price as-is, mark the ingredient with a "unit mismatch" flag

The result is stored in `cost_per_unit_cents` in the ingredient's `default_unit`. The DB function then does simple multiplication with no conversion needed.

### Decision 4: Ingredient matching uses a confirmation workflow

The system suggests matches between chef ingredients and system_ingredients using pg_trgm similarity. But it never auto-links without chef confirmation. Unconfirmed matches show as "suggested" with a one-click confirm/reject UI. Once confirmed, the link is stored in `ingredient_aliases` and never asked again.

### Decision 5: `scale_factor` applied in SQL, not in UI

Update `compute_menu_cost_cents()` to multiply each component's recipe cost by `components.scale_factor`. This keeps the single source of truth in the database function.

### Decision 6: Costing coverage is a derived metric, not a stored column

Coverage = (ingredients with non-null `cost_per_unit_cents`) / (total ingredients in recipe or menu). Computed at query time from the data that's already there. No new column needed.

### Decision 7: Name normalization is deterministic, not AI

A pure function `normalizeIngredientName()` handles case folding, depluralization, abbreviation expansion, and parenthetical stripping. No Ollama, no Gemini. Formula > AI.

### Decision 8: Cascade propagation is batched and deduplicated

When the cost refresh updates N ingredients, it collects all affected recipe IDs first, deduplicates them, then recomputes each recipe exactly once. It does NOT recompute per-ingredient (which would recompute the same recipe N times if N ingredients changed).

### Decision 9: "Active ingredients" defined for nightly refresh scope

"Active" means: ingredients that appear in at least one `recipe_ingredients` row for a non-archived recipe belonging to this tenant. The nightly refresh does NOT process orphan ingredients (created but never added to any recipe). This keeps the refresh scoped to data that actually affects costs. The query:

```sql
SELECT DISTINCT ri.ingredient_id
FROM recipe_ingredients ri
JOIN recipes r ON r.id = ri.recipe_id
WHERE r.tenant_id = $1 AND r.status != 'archived'
```

### Decision 10: Handle null `default_unit` on ingredients

If an ingredient's `default_unit` is null or empty, the refresh job uses the resolved price's unit as-is and writes it to `cost_per_unit_cents` without conversion. The ingredient is flagged with `last_price_source` containing the raw unit for transparency. This is a degraded-but-honest state: the price is stored, but unit conversion may produce incorrect results if the recipe uses a different unit. The UI shows a subtle warning: "Default unit not set. Cost may be approximate."

### Decision 11: Sub-recipe costing through TypeScript path

The SQL path handles sub-recipes via recursive CTE, but TypeScript does not. To close this gap: when `refreshRecipeTotalCost()` sums `recipe_ingredients.computed_cost_cents`, it also queries `components` that reference other recipes (sub-recipes). For each sub-recipe component, it adds `sub_recipe.total_cost_cents * component.scale_factor` to the total. This means sub-recipe costs must be refreshed bottom-up (leaf recipes first, then recipes that reference them). The refresh engine sorts recipes topologically before recomputing.

### Decision 12: Concurrent refresh prevention

Use a simple per-tenant guard to prevent overlapping refreshes. Before starting a refresh, check and set a `refresh_in_progress` flag (a lightweight row in a `cost_refresh_status` table or an advisory lock via `pg_advisory_xact_lock(tenant_id_hash)`). If another refresh is running, return `{ skipped: true, reason: 'Refresh already in progress' }` instead of running concurrently. The nightly job and manual refresh use the same guard.

### Decision 13: Batch confirmation modal for "Match All High-Confidence"

The "Match All High-Confidence" button does NOT auto-confirm silently. It opens a confirmation modal showing every proposed match (ingredient name, matched canonical name, score). The chef can uncheck individual matches before confirming the batch. This prevents a bad match at 0.81 (e.g., "cream cheese" matched to "cream") from silently corrupting costs.

---

## Implementation Phases

This spec is built in 4 phases. Each phase is independently shippable and testable. Do NOT build them out of order.

### Phase 0: Fix the Cascade Chain (BLOCKING)

Fix the broken propagation so that price changes actually flow through to recipes and events. Without this, nothing else in the spec matters.

**Tasks:**

1. **Export** `computeRecipeIngredientCost()` and `refreshRecipeTotalCost()` in `lib/recipes/actions.ts` (currently private). Change `async function` to `export async function` for both. This unblocks all downstream imports.

2. Create `propagatePriceChange(ingredientIds: string[])` in `lib/pricing/cost-refresh-actions.ts` (`'use server'` file):
   - Accepts an **array** of ingredient IDs (single-ingredient callers pass `[id]`)
   - Find all `recipe_ingredients` rows referencing these ingredients
   - Call `computeRecipeIngredientCost()` for each (uses conversion engine + yield)
   - Collect unique recipe IDs, deduplicate
   - Call `refreshRecipeTotalCost()` for each affected recipe
   - Find all events whose menus use affected recipes (menu -> dishes -> components -> recipe_id)
   - Set `events.cost_needs_refresh = true` for those events
   - Call `revalidatePath('/culinary/costing')`, `revalidatePath('/culinary/recipes')` to bust UI cache
   - This is a non-blocking side effect (try/catch, log failures, never throw)

3. Wire `propagatePriceChange()` into existing price update flows:
   - `logIngredientPrice()` in `lib/ingredients/pricing.ts` - after `updateIngredientPriceFields()`, call `propagatePriceChange([ingredientId])`
   - `cascadeIngredientPrice()` in `lib/inventory/price-cascade-actions.ts` - after price update, call `propagatePriceChange([ingredientId])`
   - OpenClaw sync completion in `lib/openclaw/sync.ts` - call `refreshIngredientCostsAction()` (the full batch refresh, NOT `propagatePriceChange`) for all synced ingredient IDs, since new OpenClaw prices need to be resolved and written to `cost_per_unit_cents` before cascade

4. Fix the delete gap in `lib/recipes/actions.ts`:
   - After removing an ingredient from a recipe, call `refreshRecipeTotalCost()` for that recipe

5. Wire `cost_needs_refresh`:
   - Set it to `true` in `propagatePriceChange()` (done above)
   - Show a subtle banner on event detail page when `cost_needs_refresh = true`: "Ingredient prices have changed since this event was last costed. Review the menu cost breakdown."
   - Add a "Mark as Reviewed" button that sets `cost_needs_refresh = false` and `cost_refreshed_at = now()`

### Phase 1: Seed System Ingredients + Name Normalization

**Tasks:**

1. Create seed migration with 500+ system ingredients (see Prerequisites)
2. Create `normalizeIngredientName(name: string)` in `lib/pricing/ingredient-matching.ts`:

   ```
   normalizeIngredientName("Chicken Breasts (Boneless)") → "chicken breast boneless"
   ```

   Rules:
   - Lowercase
   - Trim whitespace
   - **Depluralize using the `pluralize` npm package** (`npm install pluralize @types/pluralize`). Do NOT hand-roll "strip trailing s" logic. English pluralization is irregular: "tomatoes" -> "tomato", "anchovies" -> "anchovy", "halves" -> "half", "asparagus" -> "asparagus" (already singular). The `pluralize` library handles all of these correctly. Call `pluralize.singular(word)` on each token.
   - Remove parentheses but keep their contents as separate tokens
   - Expand common abbreviations: "evoo" -> "extra virgin olive oil", "ap flour" -> "all purpose flour"
   - Strip articles: "a", "an", "the"
   - Collapse multiple spaces to single space

3. Update the OpenClaw sync to normalize names before matching:
   - Before sending names to Pi, normalize both sides
   - Before looking up `ingredient_price_history`, normalize

4. **Write unit tests for `normalizeIngredientName()`** in `lib/pricing/__tests__/ingredient-matching.test.ts`:
   - Pluralization: "tomatoes" -> "tomato", "anchovies" -> "anchovy", "asparagus" -> "asparagus"
   - Abbreviations: "evoo" -> "extra virgin olive oil", "ap flour" -> "all purpose flour"
   - Parentheses: "chicken breasts (boneless)" -> "chicken breast boneless"
   - Case folding + whitespace: " All-Purpose Flour " -> "all purpose flour"
   - Articles stripped: "a pinch of salt" -> "pinch salt"

### Phase 2: Cost Refresh Engine + Ingredient Matching

**Tasks:**

1. Create `refreshIngredientCosts()` in `lib/pricing/cost-refresh.ts`:
   - Accept optional `ingredientIds` (null = all active for tenant, per Decision 9)
   - Acquire per-tenant advisory lock (Decision 12). If lock unavailable, return `{ skipped: true }`
   - Call `resolvePricesBatch()` for the batch
   - For each resolved price:
     - If ingredient `default_unit` is null/empty: use the resolved price's unit as-is (Decision 10)
     - If resolved unit != ingredient `default_unit`: convert via `computeIngredientCost()` from conversion engine
     - Density lookup chain: ingredient -> alias -> system_ingredient -> COMMON_DENSITIES -> null
     - Write to `ingredients`: `cost_per_unit_cents`, `last_price_cents`, `last_price_date`, `last_price_source`, `last_price_store`, `last_price_confidence`
   - Collect all affected recipe IDs (deduped)
   - Call `refreshRecipeTotalCost()` for each
   - Set `events.cost_needs_refresh = true` for affected events
   - **Log changes for audit/rollback:** For each ingredient updated, log `{ ingredient_id, old_cost_per_unit_cents, new_cost_per_unit_cents, source, timestamp }` to `console.info` (structured JSON). This enables post-mortem diagnosis if a bad refresh corrupts costs. Future: persist to a `cost_refresh_log` table (out of scope for this spec).
   - Return `{ refreshed, matched, unmatched, errors }`

2. Create `suggestIngredientMatches()` in `lib/pricing/ingredient-matching.ts`:
   - Normalize the chef's ingredient name
   - Query `system_ingredients` using pg_trgm:
     ```sql
     SELECT id, name, category, similarity(lower(name), $1) AS score
     FROM system_ingredients
     WHERE similarity(lower(name), $1) > 0.3
     ORDER BY score DESC
     LIMIT 5
     ```
   - Return suggestions with scores

3. Create `confirmIngredientMatch()` and `dismissIngredientMatch()`:
   - On confirm: insert into `ingredient_aliases`, copy density/yield data from system_ingredient to chef's ingredient (only if chef's ingredient has null values), trigger `refreshIngredientCosts([ingredientId])`
   - On dismiss: insert row with `system_ingredient_id = NULL` as a "don't ask again" marker

4. Create `getMenuCostingCoverage()` and `getRecipeCostingCoverage()`:
   - Walk the hierarchy (menu -> dishes -> components -> recipes -> recipe_ingredients -> ingredients)
   - **For menu coverage, deduplicate ingredients by `ingredient_id`** across all recipes in the menu. If butter appears in 3 recipes, count it once. This prevents inflated denominators and deflated coverage %.
   - Count deduplicated ingredients with non-null `cost_per_unit_cents` vs total
   - Average the `last_price_confidence` values
   - Return weakest links (ingredients with no price)

5. Implement Decision 11 (sub-recipe costing through TypeScript):
   - Modify `refreshRecipeTotalCost()` in `lib/recipes/actions.ts` to also query `components` that reference other recipes (sub-recipes). For each, add `sub_recipe.total_cost_cents * component.scale_factor` to the recipe's total.
   - In `refreshIngredientCosts()`, sort affected recipes topologically before recomputing: leaf recipes first (no sub-recipe components), then recipes that reference them. Use a depth-first traversal of the component tree.
   - Coverage calculation must include sub-recipe ingredients (walk the full tree).

6. **Write integration tests for cost refresh and coverage** in `lib/pricing/__tests__/cost-refresh.test.ts`:
   - Cascade propagation: changing an ingredient price updates all recipes using it
   - Coverage calculation: correct count with deduplication across recipes in a menu
   - Unit conversion in cost refresh: recipe uses cups, price is per lb, density available
   - Unit conversion fallback: no density available, stores price as-is with warning flag
   - Sub-recipe costing: parent recipe includes child recipe cost \* scale_factor
   - Advisory lock: concurrent refresh returns `{ skipped: true }`

### Phase 3: UI Integration

**Tasks:**

1. Add cost refresh button to costing page
2. Add costing confidence badges to recipe and menu rows
3. Add ingredient match review panel to costing page
4. Add `cost_needs_refresh` banner to event detail page
5. Add confidence badge to menu detail/breakdown page
6. Wire all interactions with `startTransition` + `try/catch` + rollback

---

## Files to Create

| File                                                             | Purpose                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/pricing/cost-refresh-actions.ts`                            | `'use server'` file. Core engine + UI-callable actions: `refreshIngredientCostsAction()`, `propagatePriceChange()`. Batch-resolves prices, converts units, writes to `ingredients.cost_per_unit_cents`, triggers cascade recomputation. |
| `lib/pricing/ingredient-matching-actions.ts`                     | `'use server'` file. `suggestMatchesAction()`, `confirmMatchAction()`, `dismissMatchAction()`, plus internal `normalizeIngredientName()` and `suggestIngredientMatches()` helpers.                                                      |
| `lib/pricing/costing-coverage-actions.ts`                        | `'use server'` file. `getMenuCostingCoverageAction()`, `getRecipeCostingCoverageAction()`.                                                                                                                                              |
| `components/pricing/ingredient-match-review.tsx`                 | UI panel for chef to confirm/reject suggested ingredient-to-canonical matches                                                                                                                                                           |
| `components/pricing/costing-confidence-badge.tsx`                | Visual badge showing costing coverage % and confidence level for a recipe or menu                                                                                                                                                       |
| `components/pricing/cost-refresh-button.tsx`                     | Button that triggers on-demand cost refresh with loading state                                                                                                                                                                          |
| `components/pricing/cost-stale-banner.tsx`                       | Banner for event detail page when `cost_needs_refresh = true`                                                                                                                                                                           |
| `database/migrations/20260401000112_ingredient_aliases.sql`      | New table for confirmed ingredient-to-canonical matches                                                                                                                                                                                 |
| `database/migrations/20260401000113_seed_system_ingredients.sql` | Seed data for system_ingredients (500+ rows)                                                                                                                                                                                            |
| `database/migrations/20260401000114_menu_cost_scale_factor.sql`  | Updated `compute_menu_cost_cents()` with scale_factor                                                                                                                                                                                   |

---

## Files to Modify

| File                                     | What to Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ingredients/pricing.ts`             | After `updateIngredientPriceFields()` in `logIngredientPrice()`, call `propagatePriceChange(ingredientId)`. Note: `updateIngredientPriceFields()` is currently a private function (not exported). It's called internally at line ~56 of `logIngredientPrice()`. You do NOT need to export it; just add the `propagatePriceChange()` call after it.                                                                                                                                                                                                                                                                                    |
| `lib/inventory/price-cascade-actions.ts` | After price update in `cascadeIngredientPrice()`, call `propagatePriceChange(ingredientId)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `lib/openclaw/sync.ts`                   | After sync completes (after the `revalidatePath`/`revalidateTag` calls around lines 434-440), call `refreshIngredientCostsAction()` for all synced ingredient IDs. Normalize names before matching.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `lib/recipes/actions.ts`                 | (a) **Export** `computeRecipeIngredientCost()` (currently private, line ~1804) and `refreshRecipeTotalCost()` (currently private, line ~1869) (Phase 0, Task 1). (b) After removing an ingredient from a recipe, add a call to `refreshRecipeTotalCost()` (currently missing, Phase 0, Task 4). (c) **Modify `refreshRecipeTotalCost()`** to also sum sub-recipe component costs: query `components` that reference other recipes, add `sub_recipe.total_cost_cents * component.scale_factor` to the total (Phase 2, Decision 11). (d) When adding an ingredient, check for alias; if none, queue for matching suggestions (Phase 2). |
| `app/(chef)/culinary/costing/page.tsx`   | Add cost refresh button, costing confidence badges, ingredient match review panel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `app/(chef)/events/[id]/page.tsx`        | Add `cost_needs_refresh` banner with "Mark as Reviewed" button (import `CostStaleBanner` component)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `app/(chef)/menus/[id]/page.tsx`         | Add costing confidence badge next to total menu cost                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

---

## Database Changes

### New Table: `ingredient_aliases`

```sql
-- Links a chef's ingredient to a canonical system ingredient for price matching.
-- Once confirmed by the chef, this link drives automatic price resolution
-- and copies density/yield data for unit conversion.

CREATE TABLE IF NOT EXISTS ingredient_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  -- NULL system_ingredient_id = "dismissed" (chef said none of these, don't ask again)
  -- SET NULL (not CASCADE): if a system_ingredient is deleted during re-seed, the alias
  -- row survives. The UI detects orphaned aliases (non-null confirmed_at but null
  -- system_ingredient_id with match_method != 'dismissed') and prompts the chef to re-match.
  system_ingredient_id UUID REFERENCES system_ingredients(id) ON DELETE SET NULL,
  match_method TEXT NOT NULL DEFAULT 'manual'
    CHECK (match_method IN ('manual', 'trigram', 'exact', 'dismissed')),
  similarity_score DECIMAL(4,3),  -- 0.000 to 1.000, null for manual/dismissed
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Nullable: null when confirmed via batch operation or programmatic match.
  -- Only populated when a specific chef confirms via the UI.
  confirmed_by UUID REFERENCES auth.users(id) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, ingredient_id)  -- one canonical match per chef ingredient
);

CREATE INDEX idx_ingredient_aliases_tenant ON ingredient_aliases(tenant_id);
CREATE INDEX idx_ingredient_aliases_system ON ingredient_aliases(system_ingredient_id);
CREATE INDEX idx_ingredient_aliases_unmatched
  ON ingredient_aliases(tenant_id)
  WHERE system_ingredient_id IS NULL;  -- fast lookup for dismissed items
```

### Updated Function: `compute_menu_cost_cents`

```sql
-- Apply component scale_factor to menu cost calculation.
-- Previously ignored scale_factor, causing menus with scaled components
-- to show incorrect costs.
CREATE OR REPLACE FUNCTION compute_menu_cost_cents(p_menu_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(
    (compute_recipe_cost_cents(c.recipe_id) * c.scale_factor)::INTEGER
  ), 0)
  FROM components c
  JOIN dishes d ON d.id = c.dish_id
  WHERE d.menu_id = p_menu_id AND c.recipe_id IS NOT NULL;
$$ LANGUAGE SQL STABLE;
```

### Migration Notes

- Migration filenames must be checked against existing files in `database/migrations/` (timestamp collision rule)
- The `ingredient_aliases` table is additive. No existing tables are modified.
- The `compute_menu_cost_cents` function is a CREATE OR REPLACE (safe, no data loss)
- The system_ingredients seed migration is additive (INSERT only into an existing empty table)
- Reminder: all migrations are additive. No DROP/DELETE without explicit developer approval.

---

## Data Model

### Cost Refresh Flow (the core loop)

```
1. TRIGGER: nightly sync completes, chef opens costing page, receipt logged, or match confirmed

2. BATCH RESOLVE: Call resolvePricesBatch(allActiveIngredientIds, tenantId)
   -> Returns Map<ingredientId, ResolvedPrice>
   -> 3 SQL queries total (not N+1)

3. FOR EACH resolved ingredient:
   a. Get resolved price: { cents, unit, source, confidence, freshness }

   b. UNIT NORMALIZATION (if resolved unit != ingredient.default_unit):
      Density lookup chain:
        1. ingredients.weight_to_volume_ratio (chef-set)
        2. system_ingredients.weight_to_volume_ratio (via ingredient_aliases)
        3. COMMON_DENSITIES[ingredientName] (hardcoded in conversion engine)
        4. null -> store price as-is, flag as "unit mismatch, cost approximate"

      Call computeIngredientCost(1, resolvedUnit, cents, defaultUnit, density)
      -> Returns cost in cents per 1 default_unit

   c. WRITE to ingredients table:
      cost_per_unit_cents = normalized cents (in default_unit)
      last_price_cents = raw cents (backward compat)
      last_price_date = confirmedAt
      last_price_source = source
      last_price_store = store
      last_price_confidence = confidence

4. COLLECT all unique recipe IDs that use any updated ingredient
   (SELECT DISTINCT recipe_id FROM recipe_ingredients WHERE ingredient_id IN (...))

5. FOR EACH affected recipe (deduped):
   a. Call computeRecipeIngredientCost() for each ingredient in the recipe
   b. Call refreshRecipeTotalCost() -> writes recipes.total_cost_cents

6. COLLECT all event IDs whose menus use affected recipes
   (SELECT DISTINCT e.id FROM events e
    JOIN menus m ON m.id = e.menu_id
    JOIN dishes d ON d.menu_id = m.id
    JOIN components c ON c.dish_id = d.id
    WHERE c.recipe_id IN (...affected_recipe_ids...))

7. SET events.cost_needs_refresh = true for those events

8. RESULT: ingredients, recipes, and menu_cost_summary view are all current
```

### Ingredient Matching Flow

```
1. Chef adds ingredient "chicken breast" to a recipe
2. System checks ingredient_aliases for existing confirmed match
   -> If found (system_ingredient_id NOT NULL): done, price resolution already works
   -> If found (system_ingredient_id IS NULL): dismissed, don't suggest again
   -> If not found: continue

3. Normalize the name:
   normalizeIngredientName("chicken breast") -> "chicken breast"

4. Query system_ingredients using pg_trgm similarity:
   SELECT id, name, category,
          similarity(lower(name), 'chicken breast') AS score
   FROM system_ingredients
   WHERE similarity(lower(name), 'chicken breast') > 0.3
     AND is_active = true
   ORDER BY score DESC
   LIMIT 5

5. IF top match score > 0.8:
   -> Auto-suggest with high confidence badge
   -> Still requires chef confirmation (one-click)

6. IF top match score 0.3-0.8:
   -> Show suggestions with "Did you mean...?" UI
   -> Chef picks the right one or says "none of these"

7. IF no match > 0.3:
   -> Show "No match found. This ingredient will use receipt prices only."

8. On confirmation:
   -> INSERT into ingredient_aliases (tenant_id, ingredient_id, system_ingredient_id, match_method, similarity_score)
   -> IF chef's ingredient.weight_to_volume_ratio IS NULL:
      -> Copy from system_ingredient (density, cup_weight, yield_pct)
   -> Trigger refreshIngredientCosts([ingredientId])
   -> Affected recipes recompute automatically via propagation

9. On dismiss:
   -> INSERT into ingredient_aliases with system_ingredient_id = NULL, match_method = 'dismissed'
   -> Ingredient will use receipt/API prices only (tiers 1-2)
```

---

## Server Actions

| Action                                                                 | Auth            | Input                                                | Output                                                                                                          | Side Effects                                                                                                                                 |
| ---------------------------------------------------------------------- | --------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `refreshIngredientCostsAction(ingredientIds?: string[])`               | `requireChef()` | Optional array of ingredient IDs (null = all active) | `{ refreshed: number, matched: number, unmatched: number, errors: string[] }`                                   | Updates `ingredients.cost_per_unit_cents`, triggers cascade recomputation, sets `events.cost_needs_refresh`, revalidates `/culinary/costing` |
| `suggestMatchesAction(ingredientId: string)`                           | `requireChef()` | Single ingredient ID                                 | `{ suggestions: { systemIngredientId, name, score, category }[], currentAlias: { name, confirmedAt } \| null }` | None (read-only)                                                                                                                             |
| `confirmMatchAction(ingredientId: string, systemIngredientId: string)` | `requireChef()` | Ingredient ID + system ingredient ID                 | `{ success: boolean, error?: string }`                                                                          | Inserts into `ingredient_aliases`, copies density data, triggers cost refresh, revalidates `/culinary/costing`                               |
| `dismissMatchAction(ingredientId: string)`                             | `requireChef()` | Ingredient ID                                        | `{ success: boolean }`                                                                                          | Inserts a dismissed alias row so system stops suggesting                                                                                     |
| `getMenuCostingCoverageAction(menuId: string)`                         | `requireChef()` | Menu ID                                              | `{ totalIngredients, pricedIngredients, coveragePct, avgConfidence, weakestLinks: { name, reason }[] }`         | None (read-only)                                                                                                                             |
| `getRecipeCostingCoverageAction(recipeId: string)`                     | `requireChef()` | Recipe ID                                            | Same shape as menu coverage                                                                                     | None (read-only)                                                                                                                             |
| `markEventCostReviewedAction(eventId: string)`                         | `requireChef()` | Event ID                                             | `{ success: boolean }`                                                                                          | Sets `events.cost_needs_refresh = false`, `cost_refreshed_at = now()`                                                                        |

---

## UI / Component Spec

### Costing Page Enhancements (`app/(chef)/culinary/costing/page.tsx`)

Add to existing page. Do not redesign.

#### Cost Refresh Button (top of page, next to stats)

- Button: "Refresh All Prices" with sync icon
- Loading state: spinner + "Refreshing X ingredients..."
- Success state: toast with "Updated 47 prices. 3 ingredients need matching."
- Appears only if any ingredient has stale or missing prices

#### Costing Confidence Badges (on each recipe and menu row)

- Green badge: 90-100% coverage, all prices current/recent
- Yellow badge: 60-89% coverage, or some stale prices
- Red badge: below 60% coverage
- Tooltip: "42/47 ingredients priced (89%). Avg confidence: 0.82"

#### Ingredient Match Review Panel (new section, below recipe costs)

- Header: "Unmatched Ingredients (X)" - only shows if count > 0
- List of unmatched ingredients, each with:
  - Ingredient name
  - Top 3 suggested matches from system_ingredients (if any)
  - "Confirm" button next to each suggestion
  - "None of these" link to dismiss
  - If no suggestions: "No match found. Log a receipt to set the price."
- Collapsible (starts collapsed if < 5 unmatched)
- If > 20 unmatched: paginate (20 per page)
- "Match All High-Confidence" batch button for suggestions with score > 0.8. Opens a confirmation modal (Decision 13) showing every proposed match with checkboxes. Chef can uncheck bad matches before confirming. This prevents a false positive at 0.81 (e.g., "cream cheese" matched to "cream") from silently corrupting costs.

### Event Detail Page (existing page)

- When `cost_needs_refresh = true`: show a subtle info banner at top of page
- Banner text: "Ingredient prices have changed since this menu was costed."
- Button: "Review Cost Breakdown" (links to menu's costing view)
- Button: "Mark as Reviewed" (calls `markEventCostReviewedAction()`)

### Recipe Detail Page (existing page)

- Add small costing confidence badge next to recipe cost
- If any ingredients are unmatched, show subtle "X ingredients need price matching" link to costing page

### Menu Detail/Breakdown Page (existing page)

- Add costing confidence badge next to total menu cost
- Show cost per guest with confidence indicator
- If coverage < 100%, show "X ingredients missing prices" with link to costing page

### States

- **Loading:** Skeleton cards for stats, shimmer rows for tables (existing pattern)
- **Empty:** "No recipes with ingredients yet. Add ingredients to your recipes to see cost estimates." (existing empty state)
- **Error:** "Could not load cost data" with retry button (never show $0.00)
- **Populated:** Stats + recipe cost table + menu cost table + match review panel + confidence badges

### Interactions

- "Refresh All Prices" button: calls `refreshIngredientCostsAction()`, shows spinner, toast on complete, page revalidates
- "Confirm" match button: calls `confirmMatchAction()`, row disappears from unmatched list, affected recipes show updated cost
- "None of these" link: calls `dismissMatchAction()`, row disappears with "Using receipt prices only" message
- "Mark as Reviewed" button: calls `markEventCostReviewedAction()`, banner disappears
- All actions use `startTransition` with `try/catch` and rollback per zero-hallucination rules

---

## Edge Cases and Error Handling

| Scenario                                                                  | Correct Behavior                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ingredient has no price in any tier                                       | Show "No price data" with guidance: "Log a receipt or match to catalog"                                                                                                                                                                                                                                              |
| Unit conversion impossible (no density data anywhere in the lookup chain) | Store price as-is with flag. Show warning badge on recipe: "Unit mismatch (recipe uses cups, price is per lb). Cost may be approximate. Add density data to fix."                                                                                                                                                    |
| `system_ingredients` table is empty                                       | Match review panel shows: "Ingredient catalog is being populated. Matching will be available soon." Do not show broken suggestions.                                                                                                                                                                                  |
| OpenClaw sync hasn't run yet (empty price history)                        | Receipt prices and API quotes still work (tiers 1-2). Show coverage honestly.                                                                                                                                                                                                                                        |
| Chef has 200 unmatched ingredients                                        | Paginate the match review panel (20 per page). Offer "Match All High-Confidence" batch mode for suggestions with score > 0.8                                                                                                                                                                                         |
| Two system ingredients match equally well                                 | Show both with scores. Let chef pick.                                                                                                                                                                                                                                                                                |
| Chef ingredient name is very generic ("oil")                              | Multiple matches expected. Show top 5. Chef picks "Olive Oil (EVOO)" or "Canola Oil" etc.                                                                                                                                                                                                                            |
| Recipe uses sub-recipes                                                   | TypeScript refresh walks component tree bottom-up (Decision 11). SQL path uses recursive CTE as a read-only fallback for views. Sub-recipe ingredients are included in coverage calculation.                                                                                                                         |
| Component scale_factor is 0 or negative                                   | DB CHECK constraint already prevents this (`CHECK (scale_factor > 0)`)                                                                                                                                                                                                                                               |
| Ingredient archived after being priced                                    | Exclude from refresh. Existing recipe costs remain until recipe is edited.                                                                                                                                                                                                                                           |
| Multiple tenants share same ingredient name but different prices          | Fully tenant-scoped. Each tenant's `ingredient_aliases` and `cost_per_unit_cents` are independent.                                                                                                                                                                                                                   |
| Cost refresh takes too long (1000+ ingredients)                           | Batch in groups of 50. Show progress: "Refreshing... 150/300". Use `resolvePricesBatch()` (3 queries total per batch, not N+1).                                                                                                                                                                                      |
| Chef manually sets a price via receipt after auto-costing                 | Receipt is Tier 1 (highest trust). Next refresh picks it up automatically. Manual always wins.                                                                                                                                                                                                                       |
| Chef dismisses a match, then later wants to un-dismiss                    | Re-opening the ingredient in the match panel shows a "Re-match" button that deletes the dismissed alias row and shows fresh suggestions.                                                                                                                                                                             |
| Nightly sync updates 500 prices at once                                   | Cascade propagation is batched: collect all affected recipe IDs first, deduplicate, recompute each recipe once. Do not recompute per-ingredient.                                                                                                                                                                     |
| `refreshRecipeTotalCost()` fails for one recipe                           | Log the error, continue with remaining recipes. Return the recipe ID in `errors[]`. Do not abort the batch.                                                                                                                                                                                                          |
| Ingredient has a confirmed alias but system_ingredient was deleted        | `ON DELETE SET NULL` preserves the alias row. UI detects orphaned alias (non-dismissed, null system_ingredient_id) and prompts chef to re-match. Meanwhile, ingredient falls back to name-based resolution (tiers 1-7).                                                                                              |
| Recipe has zero ingredients (just created)                                | Show "Add ingredients to see cost estimates." Coverage calculation returns `{ totalIngredients: 0, pricedIngredients: 0, coveragePct: null }`. Never show 0/0 = NaN% or $0.00.                                                                                                                                       |
| Ingredient `default_unit` is null or empty                                | Refresh stores price as-is in resolved unit (Decision 10). UI shows warning: "Default unit not set. Cost may be approximate."                                                                                                                                                                                        |
| Chef logs 10 receipts in quick succession (post-shopping)                 | `propagatePriceChange()` accepts an array of ingredient IDs and batches cascade propagation. The `logIngredientPrice()` flow calls propagate per-ingredient (non-blocking), but the nightly/manual refresh handles the full batch efficiently.                                                                       |
| Two browser tabs trigger refresh simultaneously                           | Per-tenant advisory lock (Decision 12) ensures only one runs. Second tab receives `{ skipped: true, reason: 'Refresh already in progress' }` and shows toast: "A refresh is already running."                                                                                                                        |
| Recipe contains sub-recipe components                                     | TypeScript refresh walks the component tree (Decision 11). Sub-recipes are refreshed bottom-up (leaf recipes first). Coverage calculation includes sub-recipe ingredients.                                                                                                                                           |
| System ingredients re-seeded (mass update)                                | SET NULL FK preserves alias rows. UI shows "X ingredients need re-matching" for orphaned aliases. Chef re-confirms or dismisses. No silent data loss.                                                                                                                                                                |
| Chef renames an ingredient after alias was confirmed                      | The alias row (keyed on `ingredient_id`) remains valid since it references the UUID, not the name. However, the old name may no longer match the system ingredient semantically. UI should show a "Name changed since match was confirmed" warning on the alias review panel so the chef can re-confirm or re-match. |
| Seasonal ingredient with 85-day-old receipt price                         | Receipt is within 90-day window (Tier 1, confidence 1.0) but freshness shows "stale." The confidence badge honestly reflects the age. Chef can log a new receipt to refresh. Future consideration: category-based freshness decay (out of scope for this spec).                                                      |

---

## Verification Steps

### Phase 0 Verification (Cascade Fix)

1. Sign in with agent account
2. Find a recipe with ingredients that have `cost_per_unit_cents` set
3. Manually update one ingredient's `cost_per_unit_cents` via a test server action
4. Verify: `recipes.total_cost_cents` updates for all recipes using that ingredient
5. Verify: events linked to those recipes have `cost_needs_refresh = true`
6. Navigate to the event detail page, verify the stale-cost banner appears
7. Click "Mark as Reviewed," verify the banner disappears

### Phase 1 Verification (Seed + Normalization)

8. Run the seed migration
9. Query `system_ingredients` - verify 500+ rows with populated density data
10. Test `normalizeIngredientName()` with edge cases:
    - "Chicken Breasts (Boneless)" -> "chicken breast boneless"
    - "EVOO" -> "extra virgin olive oil"
    - "All-Purpose Flour" -> "all purpose flour"
    - "asparagus" -> "asparagus" (not "asparagus" -> "asparagu")

### Phase 2 Verification (Refresh + Matching)

11. Navigate to `/culinary/costing`
12. Click "Refresh All Prices" - verify spinner, completion toast
13. Check that recipe costs update (compare before/after)
14. Navigate to "Unmatched Ingredients" section
15. Find an ingredient with suggestions. Click "Confirm" on the top match.
16. Verify: ingredient disappears from unmatched list, recipe cost updates
17. Find an ingredient with no matches. Click "None of these." Verify it disappears.
18. Verify: a recipe with a unit mismatch (cups vs. lb) shows correct converted cost

### Phase 3 Verification (Full Flow)

19. Create a new menu with 4 courses, link to recipes with priced ingredients
20. Verify: menu cost, cost per guest, food cost % all show real numbers
21. Verify: confidence badges show correct colors matching actual coverage
22. Verify: unmatched ingredients show suggestions from system_ingredients
23. Screenshot final state of costing page showing confidence badges, matched ingredients, and menu costs

---

## Out of Scope

- **Changing the 8-tier resolution order** - that's already correct and built
- **Real-time Pi queries during cost calculation** - Decision 1 from V2 spec says resolution reads local DB only
- **Automatic ingredient creation from OpenClaw catalog** - chef must create ingredients manually; matching is a link, not a copy
- **Menu pricing recommendations** (what to charge) - this spec is about cost, not revenue
- **Actual vs. projected food cost reconciliation** - that's the expenses/ledger system, separate concern
- **Shopping list generation from menu** - already handled by shopping optimizer
- **Waste tracking post-event** - `unused_ingredients` table exists but is a separate feature
- **Changing how receipts are logged** - existing receipt flow is fine; we just trigger cost refresh after
- **Redesigning the costing page** - we're adding to it, not replacing it
- **Cross-tenant ingredient sharing** - each chef maintains their own ingredient list and aliases
- **Auto-confirming high-confidence matches without chef interaction** - the spec always requires chef confirmation, even for 0.99 scores. Trust but verify.
- **Seasonal freshness decay** - category-based freshness windows (shorter for produce, longer for pantry staples) would improve accuracy but adds complexity. Current fixed windows (90/30/14 days) are good enough for V1. Revisit if chefs report stale seasonal prices.
- **Persistent cost refresh audit log** - a `cost_refresh_log` table tracking old/new values per ingredient per refresh would enable rollback. For now, structured `console.info` logging is sufficient. Build the table if a bad refresh causes real damage.
- **"Each" unit semantic matching** - a "head of lettuce" at the store is not the same "each" as "leaf of lettuce" in a recipe. Count-based unit semantics are inherently ambiguous. For V1, "each" matches "each" and the chef resolves ambiguity via the alias system.

---

## Notes for Builder Agent

### Critical import constraint (READ THIS FIRST):

`lib/recipes/actions.ts` is a `'use server'` file. The new `cost-refresh-actions.ts` is ALSO a `'use server'` file. **A `'use server'` file CAN import from another `'use server'` file** because both run on the server. This is safe and correct. What you CANNOT do is import server action functions into a client component and call them directly without `startTransition`. The new action files (`cost-refresh-actions.ts`, `ingredient-matching-actions.ts`, `costing-coverage-actions.ts`) are all `'use server'` files that import from other server files. This is the correct pattern.

However, `computeRecipeIngredientCost()` and `refreshRecipeTotalCost()` in `lib/recipes/actions.ts` are currently **private** (not exported). You MUST export them first (Phase 0, step 1) before any other file can import them. Change `async function computeRecipeIngredientCost(` to `export async function computeRecipeIngredientCost(` and same for `refreshRecipeTotalCost`. They are internal helpers at lines ~1804 and ~1869.

### Critical patterns to follow:

- All new files in this spec are `'use server'` files because they all do DB writes. There are no non-server library files in this spec.
- All DB access uses Drizzle ORM (`import { db } from '@/lib/db'`), NOT the compat shim.
- `resolvePricesBatch()` already exists in `lib/pricing/resolve-price.ts` (NOT a `'use server'` file, just internal logic) and does 3 queries total for N ingredients. Use it. Do NOT call `resolvePrice()` in a loop. It is safe to import from a non-server file into a server file.
- The TypeScript functions `computeRecipeIngredientCost()` and `refreshRecipeTotalCost()` in `lib/recipes/actions.ts` are the cost computation authority. Use them instead of the SQL functions `recompute_and_store_recipe_cost()` and `recompute_recipe_ingredient_costs()`. The SQL functions exist but lack unit conversion.
- `system_ingredients` has a trigram index (`idx_system_ingredients_name_trgm`) using `extensions.gin_trgm_ops`. The `pg_trgm` extension lives in the `extensions` schema (migration `20260331000001`). When using `similarity()` in raw SQL via Drizzle, use `extensions.similarity()` or ensure `extensions` is in the search_path. Test this before assuming it works without the schema prefix.
- The `ingredient_aliases` table uses `UNIQUE (tenant_id, ingredient_id)` so a chef can only have one canonical match per ingredient. Use `ON CONFLICT (tenant_id, ingredient_id) DO UPDATE` for re-matching after dismissal.
- Component `scale_factor` defaults to 1.0. The updated `compute_menu_cost_cents` handles this naturally (1.0 \* cost = cost).
- Never show $0.00 when the real answer is "no price data." Show "N/A" or the no-data state.
- All `startTransition` calls need `try/catch` with rollback (zero-hallucination rule).
- Cascade propagation (`propagatePriceChange`) is a non-blocking side effect: wrap in try/catch, log failures, never throw. The primary operation (price update) must succeed even if cascade fails.
- Read `lib/units/conversion-engine.ts` before writing any conversion logic. It already handles volume/weight/each conversions with density lookup. Use `computeIngredientCost()`, do not reinvent. This file is NOT a `'use server'` file (pure math), so importing it into server actions is safe.
- Read `lib/recipes/portion-standards.ts` before writing any scaling logic. It already has sub-linear scaling exponents.
- **New dependency:** `npm install pluralize` and `npm install -D @types/pluralize` before building Phase 1. Used by `normalizeIngredientName()` for correct English depluralization. Do NOT hand-roll "strip trailing s" logic.
- **Concurrent refresh guard:** Use `pg_advisory_xact_lock()` keyed on a hash of the tenant ID. If another refresh is in progress for the same tenant, return `{ skipped: true }` immediately. This prevents duplicate work when the nightly job and a manual click overlap.
- Migration timestamps: use `20260401000112`, `20260401000113`, `20260401000114`. The highest existing migration is `20260401000111_price_watch_list.sql`.
- All 7 ingredient columns needed by this spec already exist: `cost_per_unit_cents`, `unit_type`, `weight_to_volume_ratio`, `default_yield_pct` (from migration `20260330000095`), and `last_price_source`, `last_price_store`, `last_price_confidence` (from migration `20260401000109`). Do NOT create these columns again.
- **`system_ingredients` FK is SET NULL, not CASCADE.** If system_ingredients is re-seeded (rows deleted and re-inserted), existing `ingredient_aliases` rows survive with `system_ingredient_id = NULL`. The UI detects these orphaned aliases (non-dismissed, null system_ingredient_id) and prompts re-matching. This protects chef-confirmed work from being silently destroyed by a data refresh.
- **Sub-recipe refresh order matters.** When refreshing recipe costs, sort topologically: leaf recipes (no sub-recipe components) first, then recipes that reference them. Otherwise a parent recipe sums stale sub-recipe costs. Use a simple depth-first traversal of the component tree to determine order.
- **`default_unit` can be null.** Not all ingredients have `default_unit` set. If null, the refresh job stores the price in the resolved unit as-is (Decision 10). The UI shows a warning but the system does not crash or skip the ingredient.

### Files to read before starting:

1. `lib/pricing/resolve-price.ts` - understand the resolution chain and `resolvePricesBatch()`
2. `lib/units/conversion-engine.ts` - understand `computeIngredientCost()`, `convertCostToUnit()`, `COMMON_DENSITIES`
3. `database/migrations/20260330000095_cascading_food_costs.sql` - understand the SQL cascade functions
4. `lib/recipes/actions.ts` - understand `computeRecipeIngredientCost()`, `refreshRecipeTotalCost()`, and the delete gap
5. `lib/ingredients/pricing.ts` - understand `logIngredientPrice()` and `updateIngredientPriceFields()`
6. `lib/inventory/price-cascade-actions.ts` - understand `cascadeIngredientPrice()` and where to hook propagation
7. `lib/openclaw/sync.ts` - understand the sync flow and where to hook post-sync refresh
8. `app/(chef)/culinary/costing/page.tsx` - understand the existing UI
9. `docs/specs/openclaw-v2-unified-pricing.md` - understand architecture decisions (especially Decision 1: no Pi calls in resolvePrice)
10. `docs/specs/openclaw-price-surfacing.md` - understand what's already surfaced in the UI
