# Menu Engine Improvements (8 Deliverables)

Date: 2026-03-19

## Overview

Eight targeted improvements to the menu intelligence system, addressing performance bottlenecks,
usability gaps, missing features, and a critical N+1 query pattern. All changes are deterministic
(Formula > AI), following the existing architecture.

## Deliverables

### D1: Vendor Hints Wired into Context Sidebar

**Problem:** The `vendor_hints` toggle in settings was a dead switch. `getMenuVendorHints()` existed
but was never called from the context sidebar (it was only used in the cost sidebar).

**Change:** Added `getMenuVendorHints` to the Promise.all fetch block in `menu-context-sidebar.tsx`.
The context sidebar now shows a summary count ("3 ingredients with cheaper vendor options") that
points the user to the cost sidebar above for full details. This avoids duplicating the vendor
hints table that already renders in `menu-cost-sidebar.tsx`.

**Files:** `components/culinary/menu-context-sidebar.tsx`

### D2: Confirmation Modal on "Disable All"

**Problem:** A single misclick on "Disable all" would turn off all 9+ features including allergen
validation (food safety), with no confirmation. No undo path short of re-enabling individually.

**Change:** The "Disable all" button now opens a `ConfirmModal` (danger variant) warning that
allergen validation will be disabled. The user must confirm before the toggles change. "Enable all"
remains one-click since enabling is non-destructive.

**Files:** `components/settings/menu-engine-form.tsx`

### D3: unstable_cache on 4 Low-Churn Actions

**Problem:** Every sidebar load fired 9+ fresh database round-trips with zero caching. For a chef
with multiple menu tabs open, this created substantial database load.

**Change:** Wrapped 4 low-churn server actions in `unstable_cache` with 60s TTL and tag-based
invalidation, matching the existing `layout-cache.ts` pattern:

| Function                  | Cache Tag                | TTL |
| ------------------------- | ------------------------ | --- |
| `getMenuContextData`      | `menu-context-{menuId}`  | 60s |
| `getMenuPerformance`      | `menu-perf-{menuId}`     | 60s |
| `getMenuSeasonalWarnings` | `menu-seasonal-{menuId}` | 60s |
| `getMenuClientTaste`      | `menu-taste-{menuId}`    | 60s |

Each cached function uses `createAdminClient()` (since `unstable_cache` runs outside request
context) with `tenantId` passed from the authenticated outer function. All mutations that modify
menu data (`scaleMenuToGuestCount`, `initializeMenuForEvent`, `addDishFromSource`,
`addRecipeAsComponent`, `quickAddDish`) now call `revalidateMenuIntelligenceCache(menuId)` to
bust all 4 cache tags.

**Files:** `lib/menus/menu-intelligence-actions.ts`

### D4: Distinguish Disabled vs No-Data Empty State

**Problem:** The sidebar showed an identical "No additional context available" message whether
features were disabled in settings, the menu had no linked event, or data simply didn't exist.
Users couldn't tell why content was missing.

**Change:** Three distinct empty states:

1. **All disabled:** "All menu intelligence features are disabled." with a "Configure features"
   link to `/settings/menu-engine`
2. **Some disabled + no data:** Existing message plus "{N} features disabled. Configure" link
3. **All enabled, no data:** Existing message unchanged

**Files:** `components/culinary/menu-context-sidebar.tsx`

### D5: Settings Link on Menu Editor Page

**Problem:** No way to reach Menu Intelligence settings from the menu editor where features are
actually used. Users had to navigate to Settings manually.

**Change:** Added an "Intelligence" label with "Configure" link in the sidebar header, right above
the cost and context sidebars. Uses existing Button ghost/sm pattern.

**Files:** `app/(chef)/culinary/menus/[id]/page.tsx`

### D6: Fix N+1 in getIngredientPriceAlerts

**Problem:** For each ingredient with a price spike, the function ran 4 sequential queries inside
a for loop (recipe_ingredients, components, dishes, menus). 30 spiked ingredients = 120 queries.

**Change:** Replaced the loop with 4 bulk queries:

1. All recipe_ingredients for all spiked ingredient IDs (single IN query)
2. All components for all recipe IDs (single IN query)
3. All dishes for all dish IDs (single IN query)
4. All menus for all menu IDs (single IN query)

Then builds lookup maps to assemble the alerts. Worst-case is now always 5 queries (initial
ingredients + 4 bulk) regardless of how many ingredients have price spikes.

**Files:** `lib/menus/menu-intelligence-actions.ts`

### D7: Budget Compliance Check

**Problem:** No visibility into whether food cost exceeds a safe margin relative to the quoted
event price. Chefs could build expensive menus without realizing they were eating into profit.

**Change:** New server action `checkMenuBudgetCompliance(menuId)` that:

1. Resolves menu -> event -> `quoted_price_cents`
2. Gets total food cost from `menu_cost_summary` view
3. Computes food cost as a percentage of quoted price
4. Returns status: ok (<40%), warning (40-50%), critical (>50%)

New feature toggle `budget_compliance` added to MenuEngineFeatures. Sidebar renders a "Budget
Check" section with color-coded food cost percentage and cost/quoted price comparison.

Returns null if no event linked or no quoted price (feature degrades gracefully).

**Files:** `lib/scheduling/types.ts`, `lib/chef/actions.ts`, `lib/menus/menu-intelligence-actions.ts`,
`components/culinary/menu-context-sidebar.tsx`

### D8: Active Dietary Conflict Detection

**Problem:** `getMenuClientTaste()` displayed client preferences but never warned when the menu
contradicted them. A chef could unknowingly include an ingredient the client disliked.

**Change:** New server action `detectMenuDietaryConflicts(menuId)` that:

1. Resolves menu -> event -> client -> client_preferences (rating = 'disliked')
2. Gets all menu ingredients with dish attribution
3. Cross-references ingredient names against disliked items (substring matching)
4. Returns conflicts with dish name and the specific disliked preference

New feature toggle `dietary_conflicts` added to MenuEngineFeatures. Sidebar renders a "Taste
Conflicts" section in amber, showing each conflicting ingredient, which dish it appears in, and
what the client disliked.

**Files:** `lib/scheduling/types.ts`, `lib/chef/actions.ts`, `lib/menus/menu-intelligence-actions.ts`,
`components/culinary/menu-context-sidebar.tsx`

## Migration

`supabase/migrations/20260401000086_menu_engine_budget_dietary.sql` updates the JSONB column
default to include the two new feature keys. Existing rows don't need a data migration because
`getMenuEngineFeaturesFromUnknown()` merges stored values with `DEFAULT_MENU_ENGINE_FEATURES`,
so missing keys default to `true`.

**Migration is NOT YET APPLIED.** Requires explicit `supabase db push` approval.

## Files Modified

| File                                                                | Changes                                                                                                           |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `lib/scheduling/types.ts`                                           | Added `budget_compliance` and `dietary_conflicts` to feature keys, interface, defaults, labels                    |
| `lib/chef/actions.ts`                                               | Added new keys to Zod validation schema                                                                           |
| `lib/menus/menu-intelligence-actions.ts`                            | D3 caching, D6 N+1 fix, D7 budget compliance action, D8 dietary conflicts action, cache invalidation on mutations |
| `components/culinary/menu-context-sidebar.tsx`                      | D1 vendor hints, D4 empty state, D7+D8 sidebar sections, new imports and state                                    |
| `components/settings/menu-engine-form.tsx`                          | D2 confirmation modal                                                                                             |
| `app/(chef)/culinary/menus/[id]/page.tsx`                           | D5 settings link                                                                                                  |
| `supabase/migrations/20260401000086_menu_engine_budget_dietary.sql` | New migration (not yet applied)                                                                                   |
