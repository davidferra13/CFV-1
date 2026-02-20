# Culinary Section Implementation

## What Changed

Converted 9 culinary pages from mock/stub placeholders to live server components connected to the real database. Added 2 new server action functions.

---

## Files Modified

### `lib/menus/actions.ts`
Added two new exported functions:

**`getAllComponents(filters?)`**
- Queries `components` joined through `dishes → menus` to surface the parent menu name/id for each component
- Optional filters: `is_make_ahead: boolean`, `has_recipe: boolean`
- Returns `ComponentListItem[]` with flat shape (no deep nesting) — safe to pass directly to server-rendered pages
- Used by: `/culinary/components`, `/culinary/prep`

**`getMenuCostSummaries()`**
- Queries the `menu_cost_summary` database VIEW created in Layer 4
- Returns per-menu: total component count, total recipe cost (cents), cost per guest (cents), food cost %, and a `has_all_recipe_costs` flag
- Ordered by total cost descending
- Used by: `/culinary/costing`

---

## Pages Implemented

### `/culinary/menus` (rewritten)
**Was:** Client component with a single hardcoded mock menu array.
**Now:** Server component calling `getMenus()`. Renders all non-archived menus in a table with status badge (draft/shared/approved/archived), service style, cuisine type, template flag, and created date. Filters out archived menus from the count display.

### `/culinary/recipes` (rewritten)
**Was:** Client component with a single hardcoded mock recipe.
**Now:** Server component calling `getRecipes()`. Renders the full Recipe Bible with category badge, total time, yield, ingredient count, cost (with "est." suffix when pricing is partial), and times-cooked counter.

### `/culinary/ingredients` (new)
**Was:** "This section is currently being built."
**Now:** Server component calling `getIngredients()`. Renders full ingredient pantry with category badge, default unit, staple flag, average price per unit, and recipe usage count. Summary cards show total count, staple count, and priced count. Empty state explains ingredients are created automatically via the recipe builder.

### `/culinary/components` (new)
**Was:** "This section is currently being built."
**Now:** Server component calling `getAllComponents()`. Renders all components across all menus. Summary cards show total, linked-to-recipe count, missing-recipe count (red), and make-ahead count. Table links component → menu and component → recipe where linked.

### `/culinary/menus/drafts` (new)
**Was:** "This section is currently being built."
**Now:** Server component calling `getMenus({ statusFilter: 'draft' })`. Shows only draft-status menus with an "Edit" CTA.

### `/culinary/menus/approved` (new)
**Was:** "This section is currently being built."
**Now:** Server component calling `getMenus({ statusFilter: 'locked' })`. Shows only locked (client-approved) menus. Displays the `locked_at` timestamp in the "Approved" column. Locked menus cannot be edited — the CTA is "View" only.

### `/culinary/recipes/drafts` (new)
**Was:** "This section is currently being built."
**Now:** Server component calling `getRecipes()`, then filtering to recipes that are missing a `method` or have zero ingredients. Displays which fields are missing as red tags. Acts as a recipe-debt worklist — the CTA is "Complete" linking to the recipe detail.

### `/culinary/costing` (new)
**Was:** "This section is currently being built."
**Now:** Server component calling both `getRecipes()` and `getMenuCostSummaries()` in parallel. Shows:
- Summary stats: total recipes, costing coverage %, average recipe cost, uncosted count
- Recipe cost table: sorted by total cost descending, shows per-portion cost where yield data is available, and a Complete/Partial badge
- Menu cost table: total cost, cost per guest, food cost %, and Complete/Partial badge

### `/culinary/prep` (new)
**Was:** "This section is currently being built."
**Now:** Server component calling `getAllComponents({ is_make_ahead: true })`. Groups make-ahead components by menu. Within each group, sorts by `make_ahead_window_hours` descending (longest lead time first). Each card shows storage notes, execution notes, and a link to the associated recipe if one is linked.

---

## Architecture Notes

- All pages are **server components** — no client state, no `"use client"`. Data is fetched at request time using the existing server actions pattern.
- `requireChef()` is called at the page level (in addition to being called inside the server actions) — consistent with the rest of the app.
- No new database migrations required — all queries hit tables and views created in Layer 4.
- `menu_cost_summary` and `recipe_cost_summary` are **database views**, not tables. They are queryable via the Supabase client the same way as tables. RLS on the underlying tables propagates through to the views.
- The "drafts" concept for recipes is app-level logic (filter by missing method/ingredients) — there is no `status` column on the `recipes` table. This is intentional: the recipe table doesn't need a status FSM; completeness is inferred from the data.

---

## What's Still Missing (Not Built)

- `/culinary/prep/timeline` — Day-of prep timeline with time-blocked schedule
- `/culinary/prep/shopping` — Aggregated shopping list across a menu (scale by guest count)
- `/culinary/costing/recipe` — Single-recipe cost detail drill-down
- `/culinary/costing/menu` — Single-menu cost detail drill-down
- `/culinary/costing/food-cost` — Food cost % calculator against quoted event price
- `/culinary/recipes/tags`, `/culinary/recipes/dietary-flags`, `/culinary/recipes/seasonal-notes` — Filter sub-views by tag/flag/season
- `/culinary/components/sauces`, `/stocks`, `/ferments`, `/garnishes`, `/shared-elements` — Component sub-filters by category
- `/culinary/menus/templates` — Filter for `is_template: true` menus
- `/culinary/ingredients/vendor-notes`, `/seasonal-availability` — Ingredient sub-views
