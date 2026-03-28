# Spec: OpenClaw Price Surfacing

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none (all prerequisites are included as Phase 0)
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-28
> **Built by:** Claude Code (2026-03-28)
> **SPEC IS BUILT**

---

## What This Does (Plain English)

Surfaces OpenClaw's enriched price data (store attribution, confidence tiers, trends) throughout ChefFlow's existing costing UI, replaces expensive external API calls in the grocery quote system with local OpenClaw data, and upgrades the admin-only price catalog into a full ingredient browsing and management tool. After this is built: recipe costs show where the price came from and how fresh it is, grocery quotes use free local data instead of paid APIs, and admins can browse, search, and manage the full 9,000+ ingredient catalog with live prices from 18 stores.

---

## Why It Matters

The V2 sync already writes enriched data (source, store, confidence, trend) to ChefFlow's database, but no UI reads it. Chefs see bare dollar amounts with no attribution, confidence, or trend context. The grocery quote system still hits 4 paid external APIs when OpenClaw already has better local data for New England. The admin price catalog exists but has no catalog browsing, and it isn't even in the nav.

---

## Phase 0: Foundation (MUST COMPLETE BEFORE PHASES 1-3)

Phase 0 creates the infrastructure that all other phases depend on. Build these in order.

### Step 0A: Migration - Fix dedup index for multi-store writes

The current partial unique index `idx_iph_openclaw_dedup` is on `(ingredient_id, tenant_id, source, purchase_date)`. It does NOT include `store_name`. If the sync writes two prices for the same ingredient from different stores (same source tier, same date), the second INSERT will CONFLICT and silently overwrite the first. This migration adds `store_name` to the index.

**Migration file:** `database/migrations/20260401000110_iph_dedup_add_store.sql`

```sql
-- 20260401000110_iph_dedup_add_store.sql
-- Adds store_name to the OpenClaw dedup index so multi-store syncs
-- don't silently overwrite each other.

-- Drop the old index (missing store_name)
DROP INDEX IF EXISTS idx_iph_openclaw_dedup;

-- Recreate with store_name included
CREATE UNIQUE INDEX idx_iph_openclaw_dedup
  ON ingredient_price_history(ingredient_id, tenant_id, source, store_name, purchase_date)
  WHERE source LIKE 'openclaw_%';
```

### Step 0B: Expand V2 sync to write ALL store prices

**File:** `lib/openclaw/sync.ts`

The current `syncCore()` (line 348) only uses `result.best_price`. It must be expanded to loop through `result.all_prices` and write one `ingredient_price_history` row per store price. The `ingredients` table row continues to store only the best price.

**Exact changes to `syncCore()` in `lib/openclaw/sync.ts`:**

1. **Line 349:** Change `const price = result.best_price` to `const bestPrice = result.best_price` (rename for clarity)

2. **Lines 351-355 (bulk price filter):** Apply to `bestPrice`, not individual store prices. If `bestPrice` is wholesale, skip the whole ingredient.

3. **Lines 357-407 (the per-tenant-ingredient loop):** Restructure to:
   - First, write ALL store prices from `result.all_prices` to `ingredient_price_history` (one INSERT per store price per tenant ingredient)
   - Then, update the `ingredients` row using `bestPrice` only (same as current behavior)

4. **Line 382:** Update `ON CONFLICT` to include `store_name`:

   ```sql
   ON CONFLICT (ingredient_id, tenant_id, source, store_name, purchase_date)
     WHERE source LIKE 'openclaw_%'
   ```

5. **Line 359 (dedup check):** The `if (ing.lastPriceCents === price.normalized_cents)` skip logic should only apply to the `ingredients` table update (best price), not to `ingredient_price_history` writes (all prices). Move it to surround only the 5b UPDATE block.

**What NOT to change:** The `ingredients` table UPDATE (5b, lines 397-407) stays exactly as-is, using `bestPrice`. Only `ingredient_price_history` INSERTs change.

### Step 0C: Regenerate Drizzle schema

Run `npx drizzle-kit introspect` to pick up the 5 enrichment columns from migration 20260401000109. TypeScript will not see `last_price_source`, `last_price_store`, `last_price_confidence`, `price_trend_direction`, `price_trend_pct` on the `ingredients` table until this is done. Verify by checking that `lib/db/schema/schema.ts` has all 5 columns on the `ingredients` definition.

### Step 0D: Run a sync to populate multi-store data

After 0A-0C, trigger a sync from the admin price catalog's Sync tab (or via cron). Verify that `ingredient_price_history` now contains multiple rows per ingredient (one per store) by checking:

```sql
SELECT ingredient_id, store_name, price_cents, source, purchase_date
FROM ingredient_price_history
WHERE source LIKE 'openclaw_%'
  AND purchase_date = CURRENT_DATE
ORDER BY ingredient_id, price_cents
LIMIT 20;
```

If you see multiple stores per ingredient, Phase 0 is complete.

---

## Architecture Decisions (READ BEFORE BUILDING)

### Decision 1: All price data comes from nightly sync, never live Pi calls

The V2 sync (already built in `lib/openclaw/sync.ts`) writes enriched data to `ingredients` and `ingredient_price_history`. All UI in this spec reads from PostgreSQL, never from the Pi directly. This means data can be up to 24h stale for OpenClaw tiers, but every page load is instant (<50ms, no network to the Pi).

**Exception:** The admin price catalog's "Sync" tab already calls the Pi on-demand. That stays as-is.

### Decision 2: OpenClaw is primary, external APIs are fallback

For the grocery quote rewrite, OpenClaw data (from `ingredient_price_history` where `source LIKE 'openclaw_%'`) is checked first. External APIs (Spoonacular, Kroger, MealMe) are only called for ingredients with zero OpenClaw coverage. USDA baseline stays as the floor (it's free and always available).

### Decision 3: Catalog is admin-only

The ingredient catalog browser is exclusively an admin feature. No chef-facing catalog page, no catalog links in chef navigation. Admin uses it for coverage monitoring, catalog growth tracking, and manual price verification.

### Decision 4: Read enrichment columns with fallback

The 5 new columns on `ingredients` (last_price_source, last_price_store, last_price_confidence, price_trend_direction, price_trend_pct) were added via migration 20260401000109. The V2 sync already writes to them with a try/catch fallback. UI code must also handle nulls gracefully (show "Unknown source" instead of crashing if columns are empty).

---

## Phase 1: Surface Enriched Data in Existing UI

### Files to Modify

| File                                                    | What to Change                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/db/schema/schema.ts`                               | Regenerate with `npx drizzle-kit introspect` to pick up the 5 new columns from migration 20260401000109                                                                                                                                                                                                                                                                                        |
| `app/(chef)/culinary/costing/page.tsx`                  | This is a **pure Server Component** (no client component exists). It reads from `recipe_cost_summary` view (recipe-level totals, not individual ingredients). Add per-recipe enrichment summary: freshness badge ("prices updated 2d ago"), coverage indicator ("12/15 ingredients have OpenClaw prices"). Does NOT show per-ingredient attribution here (that's the recipe detail view's job) |
| `app/(chef)/recipes/ingredients/ingredients-client.tsx` | Replace bare "Avg. Price" column (currently reads `average_price_cents`) with: price + store + trend arrow + confidence dot using `PriceAttribution` component                                                                                                                                                                                                                                 |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx`      | Enhance existing ingredient cost display (lines 354-419). Currently shows cost status dots (accurate/estimated/stale/no_price) and `computedCostCents`. Add store attribution text next to each ingredient's cost. Data comes from `getRecipeById()` which already joins the `ingredients` table                                                                                               |
| `lib/recipes/actions.ts`                                | Two changes: (1) `getRecipeById()` (line 392) already joins `ingredients`; add the 5 enrichment columns to that join SELECT. (2) For the ingredient list query, add same 5 columns. Note: `getRecipes()` (line 289) does NOT join ingredients; it reads from `recipe_cost_summary` view, so enrichment there is recipe-level only                                                              |

### Database Changes

None. Migration 20260401000109 already adds all needed columns. Just regenerate the Drizzle schema.

### Server Actions

No new server actions. Existing queries need to SELECT the new columns.

| Action                       | File                                             | Change                                                                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getRecipeById()` (line 392) | `lib/recipes/actions.ts`                         | Already joins `ingredients` table. Add `last_price_source`, `last_price_store`, `last_price_confidence`, `price_trend_direction`, `price_trend_pct` to the ingredient join SELECT so `recipe-detail-client.tsx` can show per-ingredient store attribution |
| Ingredient list query        | `lib/recipes/actions.ts` (or ingredient actions) | Add same 5 columns to SELECT; note the ingredient list currently uses `average_price_cents` (not `last_price_cents`) for display                                                                                                                          |
| `getRecipes()` (line 289)    | `lib/recipes/actions.ts`                         | Does NOT join ingredients (reads from `recipe_cost_summary` view). No column changes needed here. Costing page enrichment is recipe-level only (freshness badge, coverage count)                                                                          |

### UI Components

**New shared component: `PriceAttribution`**

Renders inline next to any price display. Shows:

- Price: "$4.29/lb"
- Store: "at Stop & Shop" (from `last_price_store`, gray text)
- Confidence dot: green (>= 0.7), amber (0.4-0.69), gray (< 0.4 or null)
- Trend arrow: up (red), down (green), flat (gray), null (hidden)
- Freshness: "2d ago" / "31d ago" (amber if > 14 days, from `last_price_date`)

When `last_price_source` is null, show price only with no attribution (backwards compatible).

**Location:** `components/pricing/price-attribution.tsx`

**Props:**

```tsx
interface PriceAttributionProps {
  priceCents: number | null
  priceUnit?: string | null
  store?: string | null
  confidence?: number | null
  trendDirection?: string | null
  trendPct?: number | null
  lastPriceDate?: string | null
  compact?: boolean // for tight layouts like ingredient lists
}
```

### States

- **No price:** Show "--" with subtle "No price data" tooltip
- **Price with attribution:** Full display (price + store + confidence + trend)
- **Price without attribution (legacy):** Price only, no store/trend (null columns)
- **Stale price (> 14 days):** Price shown but with amber "14d ago" indicator

---

## Phase 2: OpenClaw Replaces External APIs in Grocery Quote

### Files to Modify

| File                                            | What to Change                                                                                                                                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/grocery/pricing-actions.ts`                | Rewrite `runGroceryPriceQuote()` to check local `ingredient_price_history` first, external APIs as fallback only                                                                                      |
| `app/(chef)/events/[id]/grocery-quote/page.tsx` | Update to display store-by-store comparison from local data                                                                                                                                           |
| `components/events/grocery-quote-panel.tsx`     | Add store comparison columns, "Cost at [store]" selector. Currently has 7 columns (Ingredient, Qty, USDA NE, Spoonacular, Kroger, Local Stores/MealMe, Avg Estimate). Replace with store-based layout |

### Server Actions

| Action                                   | Auth            | Input                                                                   | Output                                                                  | Side Effects     |
| ---------------------------------------- | --------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------- |
| `getLocalPriceComparison(ingredientIds)` | `requireChef()` | `{ ingredientIds: string[] }` (tenantId from session, never from input) | `Record<ingredientId, { prices: StorePrice[], bestPrice: StorePrice }>` | None (read-only) |

**`getLocalPriceComparison` logic:**

1. Query `ingredient_price_history` for all rows where:
   - `ingredient_id IN (ingredientIds)`
   - `tenant_id = tenantId`
   - `source LIKE 'openclaw_%'`
   - `purchase_date >= NOW() - INTERVAL '30 days'` (only recent data)
2. Group by ingredient, then by store
3. For each ingredient, return all store prices sorted cheapest first
4. Mark the best price per ingredient

**Fallback chain in `runGroceryPriceQuote()`:**

```
1. Check ingredient_price_history (OpenClaw data, free, instant)
   -> If found: use it, skip external APIs for this ingredient
2. Check USDA baseline (lib/grocery/usda-prices.ts, free, instant)
   -> Always available as a floor
3. Call external APIs (Spoonacular, Kroger, MealMe) ONLY for ingredients
   with zero OpenClaw + zero USDA coverage
```

### UI Changes

**Grocery Quote Panel updates:**

- Replace the 4-API column layout with a store-based layout
- Primary display: "Best Price" column (cheapest across all stores)
- Expandable row: all store prices for that ingredient
- New dropdown: "Cost this menu at [store]" - recalculates total using only one store's prices
- Coverage indicator: "X of Y ingredients have OpenClaw prices" with progress bar
- Items falling back to external APIs get a subtle "API estimate" badge (vs OpenClaw's "Local price" badge)

### Edge Cases

| Scenario                                                             | Behavior                                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Ingredient has no OpenClaw data and no API data                      | Show "No price data" (never zero)                                      |
| Ingredient has OpenClaw data older than 30 days                      | Still show it but with "stale" amber indicator                         |
| Pi is down (no sync happened recently)                               | Use whatever data is in `ingredient_price_history` (it's local)        |
| Store-specific costing has gaps (Store X doesn't carry ingredient Y) | Fill gaps from best available store, show which items were substituted |
| External API fails                                                   | Log warning, show "N/A" for that source column (never block the quote) |

---

## Phase 3: Admin-Only Ingredient Catalog

### Files to Create

| File                                              | Purpose                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `app/(admin)/admin/price-catalog/catalog-tab.tsx` | New "Catalog" tab component for browsing all 9,000+ OpenClaw ingredients |
| `lib/openclaw/catalog-actions.ts`                 | Server actions for catalog browsing (search, filter, paginate)           |

### Files to Modify

| File                                                       | What to Change                                                                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/(admin)/admin/price-catalog/price-catalog-client.tsx` | Add 6th tab "Catalog" between existing tabs                                                                                                                                                                  |
| `components/navigation/nav-config.tsx`                     | Add "Price Catalog" entry to admin group (`adminOnly: true`). Admin items are sorted alphabetically at runtime (lines 1545-1559), so it will auto-sort into position. The admin group currently has 24 items |

### Server Actions

| Action                 | Auth             | Input                                                                                         | Output                                                                             | Side Effects |
| ---------------------- | ---------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------ |
| `searchCatalog(query)` | `requireAdmin()` | `{ search?: string, category?: string, pricedOnly?: boolean, page?: number, limit?: number }` | `{ items: CatalogItem[], total: number, categories: CategoryCount[] }`             | None         |
| `getCatalogStats()`    | `requireAdmin()` | none                                                                                          | `{ total: number, priced: number, byCategory: Record<string, { total, priced }> }` | None         |

**`searchCatalog` calls the Pi directly** (on-demand, not from synced data) because the catalog has 9,000+ items and most are not synced to ChefFlow. Uses `GET /api/ingredients?search=` and `GET /api/prices/ingredient/{id}`.

**`getCatalogStats` calls `GET /api/stats`** on the Pi plus a category breakdown query.

### UI: Catalog Tab

**Layout:**

- Top: Stats bar (total ingredients, priced count, coverage %, last scrape time)
- Below stats: Category filter chips (Beef, Poultry, Seafood, Dairy, Produce, Pantry, Grains, Oils, Spices, Herbs, Beverages, Eggs, Uncategorized)
- Search bar with debounce (500ms)
- Toggle: "Priced only" / "All ingredients"
- Results table (paginated, 50 per page)

**Results table columns:**
| Column | Source |
| --- | --- |
| Name | `canonical_ingredients.name` |
| Category | `canonical_ingredients.category` with colored badge |
| Best Price | Cheapest `current_prices.price_cents` with store name |
| Price Count | Number of stores carrying this item |
| Last Updated | Most recent `last_confirmed_at` across all prices |

**Click to expand a row:**

- All store prices for that ingredient (sorted cheapest first)
- Each price shows: store name, price, unit, confidence tier badge, last confirmed date
- Trend data if available (7d/30d change %)

**States:**

- **Loading:** Skeleton rows (no spinner)
- **Empty search:** "No ingredients match your search"
- **Error (Pi offline):** "Cannot reach OpenClaw Pi. Check that the Pi is online and sync-api is running." with retry button
- **Populated:** Table with data

### Nav Config Addition

```tsx
{
  name: 'Price Catalog',
  href: '/admin/price-catalog',
  icon: Store, // from lucide-react
  adminOnly: true,
  group: 'admin',
}
```

---

## Verification Steps

### Phase 0 (Foundation)

1. Verify migration file `database/migrations/20260401000110_iph_dedup_add_store.sql` exists
2. Apply migration and verify the index was recreated (query `pg_indexes` for `idx_iph_openclaw_dedup` and confirm `store_name` is in the definition)
3. Verify `sync.ts` ON CONFLICT clause now includes `store_name`
4. Verify `sync.ts` writes all `result.all_prices` entries (not just `result.best_price`) to `ingredient_price_history`
5. Run `npx drizzle-kit introspect` and verify 5 enrichment columns appear in `lib/db/schema/schema.ts`
6. Trigger a sync from admin price catalog Sync tab
7. Query `ingredient_price_history` and confirm multiple store rows per ingredient per day

### Phase 1 (Enriched Data Surfacing)

1. Sign in with agent account
2. Navigate to `/culinary/costing`
3. Verify: recipe rows show enrichment summary (freshness badge like "prices updated 2d ago", coverage indicator like "12/15 OpenClaw prices"). This is recipe-level only, not per-ingredient attribution
4. Navigate to a recipe detail page (click any recipe)
5. Verify: each ingredient line shows store attribution text next to its cost (e.g., "$4.29 at Stop & Shop") and the existing cost status dots still work
6. Navigate to `/recipes/ingredients`
7. Verify: ingredient list shows store + trend data in the price column
8. Verify: ingredients with no enrichment data (null columns) show price only (no crash)
9. Screenshot all three pages (costing, recipe detail, ingredient list)

### Phase 2 (Grocery Quote Rewrite)

1. Navigate to an event with a menu that has ingredients
2. Open the grocery quote page
3. Verify: prices load from local data (no external API calls for ingredients that have OpenClaw coverage)
4. Verify: store-by-store comparison is visible (expand an ingredient row)
5. Test "Cost at [store]" dropdown - verify totals change
6. Verify: ingredients without OpenClaw data fall back to external APIs or show "No price data"
7. Screenshot the comparison view

### Phase 3 (Admin Catalog)

1. Verify "Price Catalog" appears in admin nav
2. Navigate to `/admin/price-catalog`
3. Verify: 6th "Catalog" tab is visible
4. Click Catalog tab
5. Verify: stats bar loads (total ingredients, coverage %)
6. Search for "chicken breast" - verify results appear
7. Filter by category "Beef" - verify only beef items shown
8. Toggle "Priced only" - verify unpriced items disappear
9. Click to expand a result row - verify multi-store prices appear
10. Screenshot the catalog

---

## Out of Scope

- Chef-facing catalog browsing (catalog is admin-only, permanently)
- Price history charts or graphs (future feature, not this spec)
- "Add to my ingredients" from catalog (future feature)
- Changing how `compute_recipe_cost_cents()` SQL function works (it already uses COALESCE correctly)
- Modifying the nightly sync schedule or Pi-side scrapers
- Unit normalization on the Pi (separate concern, tracked in `openclaw-v2-unified-pricing.md`)
- Wholesale vs retail tier toggle in chef UI (admin only for now)

---

## Notes for Builder Agent

- **Build Phase 0 first, in order.** Steps 0A through 0D must complete before any UI work. 0A (migration) before 0B (sync expansion) before 0C (schema regen) before 0D (verify). Skipping order will cause silent data loss or TypeScript errors.
- **Null safety everywhere.** The enrichment columns (`last_price_source`, `last_price_store`, etc.) will be null for ingredients that haven't been synced yet, or for tenants where the sync hasn't run. Every UI component must handle nulls gracefully.
- **The PriceAttribution component is shared.** It will be used in at least 3 places (costing page, ingredient list, recipe detail). Build it as a reusable component in `components/pricing/`.
- **Costing page is a Server Component.** `app/(chef)/culinary/costing/page.tsx` has NO client component. It is `export default async function`. Enrichment data must be rendered inline or via a new lightweight client component if interactivity is needed.
- **Ingredient library uses `average_price_cents`.** The "Avg. Price" column in `ingredients-client.tsx` reads `average_price_cents`, NOT `last_price_cents`. Do not confuse the two columns.
- **Recipe detail already has cost status indicators.** `recipe-detail-client.tsx` (lines 354-419) already shows colored dots (accurate/estimated/stale/no_price) and `computedCostCents` per ingredient. You are enhancing this with store attribution, not building from scratch.
- **Admin price catalog already exists.** You are adding a tab to the existing 5-tab component, not building a new page. Read the existing `price-catalog-client.tsx` thoroughly before modifying it.
- **Costing page reads from `recipe_cost_summary` view.** This is a DB view that computes per-recipe totals. It does NOT expose per-ingredient enrichment. The costing page enrichment is therefore recipe-level only (freshness, coverage count), not per-ingredient attribution. Per-ingredient attribution happens in the recipe detail view.
- **`getRecipes()` does NOT join ingredients.** It fetches recipe metadata + cost summaries from the `recipe_cost_summary` view. `getRecipeById()` is the function that joins the `ingredients` table (and is the one needing enrichment column additions).
- **Pi calls in catalog tab only.** Phase 1 and Phase 2 read from PostgreSQL. Phase 3 (catalog tab) is the only part that calls the Pi directly, because the full 9,000+ catalog isn't synced to ChefFlow.
- **No em dashes.** Project rule. Use commas, semicolons, parentheses, or separate sentences.
- **Catalog is admin-only.** `requireAdmin()` on every server action. No chef nav entries. No public routes.
- **Formula > AI.** All pricing is deterministic. No LLM involvement anywhere in this spec.
- **`ingredient_price_history` already has RLS.** Don't add new RLS policies. The existing ones scope by tenant_id.
- **External API cost savings.** After Phase 2, external API calls should drop significantly. Track this: log when an external API is called vs when OpenClaw data was sufficient. This helps the developer monitor cost reduction.
