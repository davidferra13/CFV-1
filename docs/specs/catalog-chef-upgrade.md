# Spec: Chef-Facing Price Catalog - Full Upgrade

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** `openclaw-canonical-scope-and-sequence.md`, `openclaw-internal-only-boundary-and-debranding.md`, openclaw-v2-intelligence.md (built), catalog-power-tools.md (built)
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-28
> **Built by:** Claude Code (2026-03-28). SPEC IS BUILT.
> **Boundary note (2026-04-01):** This chef-facing catalog can still exist as a product outcome, but visible chef-facing copy must describe it as ChefFlow's market or price catalog, not as OpenClaw. OpenClaw naming belongs only in internal docs/admin surfaces.
> **Scope note (2026-04-01):** This spec is the approved authority for a chef-facing ChefFlow market catalog. It supersedes the earlier admin-only catalog assumption inside `openclaw-price-surfacing.md`.

---

## What This Does (Plain English)

Moves the internal price catalog from an admin-only hidden page to a chef-facing tool under Culinary. The catalog becomes a real grocery intelligence hub: 15K+ ingredients from 39 local Haverhill-area stores, with stock status, freshness indicators, direct links to store websites (and product pages where available), infinite scroll instead of 50-item pages, and rich filtering (category, store, price range, stock status, tier). When you expand an ingredient, you see every store's price, whether it's in stock, when it was last confirmed, a link to view it on the store's site, a price history sparkline, and a one-click "Add to my pantry" button. Phase 2 (separate spec) adds product images, nutrition facts, Instacart deep links, and FDA recall tracking via scraper enhancements.

---

## Why It Matters

The catalog has 15K ingredients with real prices from local stores. Right now it's buried in admin settings where a chef would never find it. A chef planning a dinner needs to quickly check "what does salmon cost at Market Basket vs Hannaford" and "is it in stock." That's what this builds. The data is already there; this surfaces it where it belongs.

---

## Known Data Limitations (Day One)

These are not blockers, but the builder and user should understand them:

1. **Stock data is all "in stock" until the next scrape cycle.** The `detectStockStatus()` function was added to the deep scraper but no scrape has run since. Until one does, all 7,547 prices show `in_stock = 1`. Stock badges will appear uniformly green on day one. This resolves itself after the first post-update nightly scrape.

2. **Source URLs are mostly government data links.** Of 7,547 prices, only 1,014 have `source_url` and they're all BLS/USDA government links (e.g., `data.bls.gov/timeseries/...`), not store product pages. Instacart product URLs are NOT being captured yet (requires scraper enhancement in Phase 2). The "View" link falls back to the store's main website (e.g., hannaford.com, marketbasket.com) which is still useful for navigating to the store's online presence.

3. **~50% coverage.** 14,997 canonical ingredients but only 7,547 have prices. Half the catalog shows "No price data yet." The UI should make this clear (not a bug, just ingredients not found at local stores yet).

---

## Files to Create

| File                                                    | Purpose                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `app/(chef)/culinary/price-catalog/page.tsx`            | Chef-facing catalog page (server component, auth + metadata)                                |
| `app/(chef)/culinary/price-catalog/catalog-browser.tsx` | Client component: search, filters, infinite scroll, expanded detail                         |
| `components/pricing/stock-badge.tsx`                    | Small badge showing in-stock (green), limited (amber), or out-of-stock (red)                |
| `components/pricing/freshness-dot.tsx`                  | Tiny colored dot based on date age (green/amber/red). Shared with catalog-power-tools spec. |

---

## Files to Modify

| File                                    | What to Change                                                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/navigation/nav-config.tsx`  | Add "Price Catalog" link under Culinary section (NOT adminOnly)                                                                              |
| `.openclaw-build/services/sync-api.mjs` | Add composite index, update `/api/ingredients` with stock counts, add `/api/ingredients/detail/:id` endpoint, add `/api/categories` endpoint |
| `lib/openclaw/catalog-actions.ts`       | Add `searchCatalogV2()`, `getCatalogDetail()`, `getCatalogCategories()`, and `addCatalogIngredientToLibrary()` actions                       |
| `docs/app-complete-audit.md`            | Add catalog page entry under Culinary section                                                                                                |

---

## Database Changes

### Pi SQLite (performance index, no schema change)

Before deploying the updated `/api/ingredients` with stock subqueries, add this index to `db.mjs`'s `initSchema()` or `migrateSchema()`:

```sql
CREATE INDEX IF NOT EXISTS idx_cp_ingredient_stock ON current_prices(canonical_ingredient_id, in_stock);
```

Without this, the two correlated subqueries per ingredient row will table-scan `current_prices` (7,500+ rows) for every one of 15K ingredients. This index makes the stock count lookups O(log n).

### ChefFlow PostgreSQL

None. The "Add to my pantry" action uses the existing `ingredients` table insert pattern from `lib/recipes/actions.ts`.

---

## Data Model

### What the Pi Already Has (No Changes Needed)

The `current_prices` table stores per-store prices with these fields already populated:

- `in_stock` (INTEGER 0/1) - tracked since stock tracking was added
- `source_url` (TEXT) - populated for ~1,014 government data items; null for Instacart/flyer items (Phase 2 will add Instacart deep links)
- `price_type` (TEXT) - regular, sale, bulk
- `pricing_tier` (TEXT) - retail, wholesale, farm_direct
- `confidence` (TEXT) - exact_receipt, direct_scrape, instacart_adjusted, flyer_scrape, government_baseline
- `last_confirmed_at` (TEXT) - when this price was last verified

The `source_registry` table has:

- `website` (TEXT) - store's main website URL (populated for Hannaford, Market Basket, Shaw's, etc.)
- `city`, `state` - store location

### Link Fallback Chain

For the "View" link on each store price row:

1. If `source_url` exists and is non-empty: link to `source_url` (product page)
2. Else if `source_registry.website` exists: link to store's main website
3. Else: show no link (dash)

This means most rows will link to store websites (hannaford.com, marketbasket.com, etc.) until Phase 2 adds Instacart product URLs.

---

## Pi API Changes

### Prerequisite: Add composite index

Add to `migrateSchema()` in `db.mjs`:

```javascript
// Add composite index for stock count queries
const idxCheck = db
  .prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_cp_ingredient_stock'")
  .get()
if (!idxCheck) {
  db.exec(
    'CREATE INDEX idx_cp_ingredient_stock ON current_prices(canonical_ingredient_id, in_stock)'
  )
}
```

### New: `GET /api/categories`

Simple endpoint returning all distinct categories:

```javascript
if (path === '/api/categories') {
  const rows = db
    .prepare('SELECT DISTINCT category FROM canonical_ingredients ORDER BY category')
    .all()
  return jsonResponse(res, { categories: rows.map((r) => r.category) })
}
```

This avoids hardcoding categories in the client (the admin catalog hardcodes 14 but the Pi has more).

### Modify: `GET /api/ingredients`

Add to the response per ingredient:

- `in_stock_count` - number of stores where this ingredient is in stock
- `out_of_stock_count` - number of stores where it's out of stock
- `has_source_url` - boolean, at least one store has a direct product link or website

SQL change: add subqueries to the existing ingredients query (performant with the new composite index):

```sql
(SELECT COUNT(*) FROM current_prices cp2
 WHERE cp2.canonical_ingredient_id = ci.ingredient_id AND cp2.in_stock = 1) as in_stock_count,
(SELECT COUNT(*) FROM current_prices cp3
 WHERE cp3.canonical_ingredient_id = ci.ingredient_id AND cp3.in_stock = 0) as out_of_stock_count
```

Add cursor-based pagination support:

- New query param: `after` (ingredient_id string). When provided, add `WHERE ci.ingredient_id > ?` to the query (for alphabetical sort) or equivalent for other sorts.
- Keep existing `page` param for backward compatibility (admin catalog still uses it).
- Response adds: `hasMore` (boolean) and `nextCursor` (ingredient_id of last item, or null).

Add `in_stock_only` query param:

- When `in_stock_only=1`, add `HAVING in_stock_count > 0` to filter out ingredients with no in-stock stores.

Add `tier` query param:

- When `tier=wholesale` or `tier=retail`, join with `current_prices` and filter by `pricing_tier`.

### New: `GET /api/ingredients/detail/:id`

Returns everything about one ingredient across all stores:

```json
{
  "ingredient": { "id": "...", "name": "...", "category": "...", "standardUnit": "..." },
  "prices": [
    {
      "store": "Market Basket (via Instacart)",
      "storeCity": "Haverhill",
      "storeState": "MA",
      "storeWebsite": "https://www.shopmarketbasket.com",
      "priceCents": 499,
      "priceUnit": "lb",
      "priceType": "regular",
      "pricingTier": "retail",
      "confidence": "instacart_adjusted",
      "inStock": true,
      "sourceUrl": null,
      "lastConfirmedAt": "2026-03-28T12:00:00Z",
      "lastChangedAt": "2026-03-27T08:00:00Z",
      "packageSize": "1 lb"
    }
  ],
  "summary": {
    "storeCount": 8,
    "inStockCount": 7,
    "outOfStockCount": 1,
    "cheapestCents": 399,
    "cheapestStore": "Hannaford",
    "avgCents": 524,
    "hasSourceUrls": false
  }
}
```

SQL: JOIN `current_prices` with `source_registry`, return all fields. Sort by: in-stock first, then cheapest first.

---

## Server Actions

| Action                                  | Auth            | Input                                                                                               | Output                                                                             | Side Effects                                                          |
| --------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `searchCatalogV2(params)`               | `requireChef()` | `{ search?, category?, store?, pricedOnly?, inStockOnly?, tier?, sort, limit, after? }`             | `{ items: CatalogItemV2[], total: number, hasMore: boolean, nextCursor?: string }` | None                                                                  |
| `getCatalogDetail(ingredientId)`        | `requireChef()` | `string`                                                                                            | `CatalogDetailResult`                                                              | None                                                                  |
| `getCatalogCategories()`                | `requireChef()` | none                                                                                                | `string[]`                                                                         | None                                                                  |
| `addCatalogIngredientToLibrary(params)` | `requireChef()` | `{ name: string, category: string, defaultUnit: string, priceCents?: number, priceStore?: string }` | `{ success: boolean, id?: string, error?: string }`                                | Inserts into `ingredients` table, revalidates `/culinary/ingredients` |

**Auth note:** These use `requireChef()`, not `requireAdmin()`. The existing admin catalog actions (`searchCatalog`, `getCatalogItemPrices`) use `requireAdmin()` and remain unchanged. Do NOT modify the existing admin actions.

### Types

```typescript
export type CatalogItemV2 = {
  id: string
  name: string
  category: string
  standardUnit: string
  bestPriceCents: number | null
  bestPriceStore: string | null
  bestPriceUnit: string | null
  priceCount: number
  inStockCount: number
  outOfStockCount: number
  hasSourceUrl: boolean
  lastUpdated: string | null
}

export type CatalogDetailPrice = {
  store: string
  storeCity: string | null
  storeState: string | null
  storeWebsite: string | null
  priceCents: number
  priceUnit: string
  priceType: string
  pricingTier: string
  confidence: string
  inStock: boolean
  sourceUrl: string | null
  lastConfirmedAt: string
  lastChangedAt: string
  packageSize: string | null
}

export type CatalogDetailResult = {
  ingredient: { id: string; name: string; category: string; standardUnit: string }
  prices: CatalogDetailPrice[]
  summary: {
    storeCount: number
    inStockCount: number
    outOfStockCount: number
    cheapestCents: number | null
    cheapestStore: string | null
    avgCents: number | null
    hasSourceUrls: boolean
  }
}
```

---

## UI / Component Spec

### Page Layout: `/culinary/price-catalog`

```
[Breadcrumb: Culinary > Price Catalog]

[Page Title: "Price Catalog"]
[Subtitle: "15,247 ingredients across 39 local stores"]  <- live counts from Pi
[Last scraped: "2h ago"]  <- from Pi /api/stats lastScrapeAt

[Filter Bar]
  [Search input] [Category dropdown] [Store dropdown] [In Stock toggle] [Tier dropdown] [Sort dropdown]
  [Active filter pills with X to remove] [Clear All button]

[Results - infinite scroll, table layout]
  [IngredientRow] [IngredientRow] [IngredientRow] ...
  [Expanded detail panel when row is clicked]

[Load more spinner at bottom when scrolling]
[Footer: "Showing X of Y results" or "All results loaded"]
```

### Table Row (default view)

Each row shows these columns:

- **Name** (bold, clickable to expand)
- **Category** badge (colored, clickable to filter by that category)
- **Best Price**: "$4.99/lb at Market Basket" (or "No price data" in muted text)
- **Stock**: `StockBadge` component showing status
- **Stores**: "8 stores" count
- **Updated**: `FreshnessDot` + relative time ("2h ago", "3d ago")

### Responsive Layout

This is a chef-facing page. Chefs use tablets and phones in kitchens.

- **Desktop (>=1024px):** Full table with all 6 columns
- **Tablet (>=768px):** Hide "Stores" column, compact spacing
- **Mobile (<768px):** Card layout (single column). Each card stacks: Name, Category badge, Price + Store, Stock badge, Updated time. Tap to expand.

### Expanded Detail (when row/card is clicked)

Slides open below the row. Shows:

**Action buttons (top right of expanded panel):**

- **"Add to My Pantry"** button: adds this ingredient to the chef's personal ingredient library. Uses `addCatalogIngredientToLibrary()` with the best price pre-filled. Shows toast on success. Disabled if already in library (check by name match).
- **"Watch Price"** button: opens inline form to set a target price (reuses the `addPriceWatch()` action from `price-watch-actions.ts`). Pre-fills ingredient name.

**Per-store price table:**
| Store | Location | Price | Stock | Type | Source | Confirmed | Link |
|-------|----------|-------|-------|------|--------|-----------|------|
| Market Basket | Haverhill, MA | $4.99/lb | In Stock | Regular | Instacart | 2h ago | [View] |
| Hannaford | Haverhill, MA | $5.49/lb | In Stock | Sale | Flyer | 1d ago | [View] |
| Shaw's | Haverhill, MA | $6.99/lb | Out of Stock | Regular | Instacart | 3d ago | - |

- **"View" link** follows the fallback chain: `sourceUrl` > `storeWebsite` > no link. Opens in new tab.
- **Stock column** uses `StockBadge` component
- **Source** shows confidence tier as colored badge (same pattern as existing `PriceAttribution`)
- **Confirmed** uses `FreshnessDot` + relative time
- Sorted: in-stock items first, then cheapest first within each group

**Price history sparkline** at bottom of expanded panel (reuse existing `PriceSparkline` component with `getPriceHistory()`)

### StockBadge Component

```tsx
interface StockBadgeProps {
  inStockCount: number
  outOfStockCount: number
  compact?: boolean // for table cells, shows just the dot + short text
}
```

Rules:

- All stores in stock: green dot + "In Stock" (or "In Stock (N)" if compact)
- Some stores out of stock: amber dot + "Limited (X/Y stores)"
- All stores out of stock: red dot + "Out of Stock"
- No price data: gray dot + "Unknown"

### FreshnessDot Component

```tsx
interface FreshnessDotProps {
  date: string | null // ISO date string
  showLabel?: boolean // show "Fresh"/"Aging"/"Stale" text next to dot
}
```

Rules:

- < 7 days old: green dot (`bg-emerald-500`) + "Fresh" tooltip
- 7-30 days old: amber dot (`bg-amber-500`) + "Aging" tooltip
- > 30 days old: red dot (`bg-red-500`) + "Stale" tooltip
- No date: gray dot (`bg-stone-600`) + "Unknown" tooltip
- Rendering: 6px circle (`w-1.5 h-1.5 rounded-full inline-block`)

**Shared component:** This component is also used by `catalog-power-tools.md` for the admin catalog. Build it once here; the other spec reuses it.

### States

- **Loading:** Skeleton rows (8 placeholders with animated pulse) while initial search runs
- **Empty (no results):** "No ingredients match your filters. Try broadening your search." with Clear Filters button
- **Empty (Pi offline):** "Price catalog is temporarily unavailable. The data source is offline." (NOT fake zeros, NOT an empty table)
- **Error:** "Could not load catalog data" with retry button
- **Populated:** Rows with data, infinite scroll loads more as user scrolls
- **Half-coverage note:** For ingredients with no price data, show "Not found at local stores yet" in muted text. This is expected for ~50% of the catalog; it's not an error.

### Filter Interactions

| Filter        | Behavior                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Search        | Debounced 400ms, searches ingredient name. Clears cursor (resets to page 1).                                                                                       |
| Category      | Dropdown populated from `getCatalogCategories()` (dynamic from Pi, not hardcoded). Single select. Clicking a category badge in results also activates this filter. |
| Store         | Searchable dropdown of all stores from Pi. Shows store name + city/state. Single select.                                                                           |
| In Stock Only | Toggle. When on, only shows ingredients with at least 1 in-stock store.                                                                                            |
| Tier          | Dropdown: All, Retail, Wholesale. Filters by pricing tier.                                                                                                         |
| Sort          | Name (A-Z), Price (low first), Most stores, Recently updated.                                                                                                      |
| Clear All     | Resets all filters to defaults, clears search.                                                                                                                     |
| Filter pills  | Each active filter shows as a pill with X button. Click X to remove that filter.                                                                                   |

### Infinite Scroll

Use `IntersectionObserver` on a sentinel div at the bottom of the results list.

- When the sentinel enters the viewport and `hasMore` is true and not currently loading: call `searchCatalogV2` with the `after` cursor set to the `id` of the last item in the current list.
- Append new results to the existing array (don't replace).
- Stop observing when `hasMore` is false.
- Show a small spinner while loading the next page.
- The `after` cursor is the `ingredient_id` of the last item. On the Pi, the query uses `WHERE ci.ingredient_id > ?` for alphabetical sort. For other sorts, fall back to `page` param (offset-based) since cursor pagination only works cleanly with a stable sort key.

---

## Edge Cases and Error Handling

| Scenario                                          | Correct Behavior                                                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Pi offline                                        | Show error state with "Price catalog offline" message. Never show empty catalog as if there are 0 ingredients.                   |
| Ingredient has no prices                          | Show row with "No price data yet" in muted text instead of $0.00.                                                                |
| All stores out of stock                           | Red `StockBadge`: "Out of Stock everywhere"                                                                                      |
| source_url is null                                | Follow fallback chain: try `storeWebsite`, then show no link.                                                                    |
| source_url AND storeWebsite both null             | Show "-" in the link column.                                                                                                     |
| Instacart deep link 404s                          | Not our problem (opens in new tab). Phase 2 may add link health checking.                                                        |
| Infinite scroll reaches end                       | Show "Showing all X results" footer, stop loading spinner.                                                                       |
| Search returns 0 results                          | Show "No ingredients match" with "Clear Filters" button.                                                                         |
| Filter by store that has 0 priced items           | Show empty results with clear message, not a spinner.                                                                            |
| Very long ingredient name                         | Truncate with ellipsis at 60 chars, show full name in expanded detail.                                                           |
| "Add to Pantry" for ingredient already in library | Disable button, show "Already in your library" tooltip. Check by case-insensitive name match against chef's `ingredients` table. |
| "Add to Pantry" server action fails               | Show toast error, keep button enabled for retry.                                                                                 |
| Category dropdown has 50+ categories              | Searchable dropdown (type to filter). Not a flat list.                                                                           |
| Concurrent scrolling + filter change              | Filter change resets the results array and cursor. Any in-flight scroll fetch is aborted via AbortController.                    |
| Mobile viewport                                   | Switch to card layout (single column stacked). Expanded detail uses full-width panel.                                            |

---

## Verification Steps

1. Sign in with agent account at `localhost:3100`
2. Navigate to Culinary section in sidebar
3. Verify "Price Catalog" link appears (NOT admin-only)
4. Click it, verify page loads with ingredient count + store count in subtitle
5. Verify rows show: name, category badge, best price, stock badge, store count, freshness dot
6. Search for "chicken", verify results filter and debounce works
7. Select category "Seafood" from dropdown, verify filter works
8. Click a category badge in results, verify it activates that category filter
9. Toggle "In Stock Only", verify filtering works (note: all items are in-stock until first post-update scrape)
10. Click an ingredient row, verify expanded detail shows per-store prices
11. Verify per-store rows show: store name, location, price, stock badge, price type, confidence badge, freshness, link
12. Verify "View" links go to store websites (hannaford.com, marketbasket.com, etc.) in new tab
13. Verify "Add to My Pantry" button appears in expanded detail
14. Click "Add to My Pantry" for an ingredient, verify toast success
15. Navigate to `/culinary/ingredients`, verify the ingredient was added
16. Go back to catalog, expand same ingredient, verify button says "Already in your library"
17. Verify freshness dots are colored correctly (green for <7d, amber for 7-30d, red for >30d)
18. Scroll down past the initial results, verify more items load via infinite scroll
19. Verify the price history sparkline appears in expanded view
20. Resize browser to mobile width, verify card layout activates
21. Test "Clear All" button resets all filters
22. Screenshot the final result

---

## Out of Scope

- Product images and nutrition facts (requires scraper changes, separate Phase 2 spec)
- FDA recall tracking (requires new Pi service, separate Phase 2 spec)
- Instacart deep links to product pages (requires scraper to capture URLs, Phase 2)
- The admin catalog page stays as-is (`catalog-power-tools.md` covers its upgrades separately)
- Modifying the existing chef ingredients page (`/culinary/ingredients`). That page shows the chef's own ingredient library. This page shows the full market catalog. Different views, different data sources.
- Shopping optimizer integration (already on costing page)
- CSV export from chef catalog (admin catalog gets this via `catalog-power-tools.md`)

---

## Coordination with catalog-power-tools.md

Both specs modify `.openclaw-build/services/sync-api.mjs`:

- **This spec** adds: composite index, `/api/categories`, `/api/ingredients/detail/:id`, stock counts + cursor pagination on `/api/ingredients`
- **catalog-power-tools.md** adds: `/api/stats/category-coverage`, trend data on `/api/ingredients`

**If building both:** Do all Pi changes in a single session. Modify `sync-api.mjs` once, SCP once, restart once. Deploy all Pi changes, verify all endpoints, then build both UIs.

**If building sequentially:** This spec goes first (it's chef-facing, higher priority). catalog-power-tools builds on top.

**Shared component:** `components/pricing/freshness-dot.tsx` is used by both specs. Build it once here. The admin catalog spec references it by import path.

---

## Notes for Builder Agent

**Key distinction: Chef's Ingredients vs Market Catalog**

- `/culinary/ingredients` = the chef's personal ingredient library (from their recipes). Uses ChefFlow PostgreSQL.
- `/culinary/price-catalog` = the full market catalog (15K+ items from 39 stores). Uses Pi SQLite via API.
- These are separate pages with separate data sources. Don't mix them.
- The "Add to My Pantry" action bridges them: it reads from Pi (catalog) and writes to PostgreSQL (chef's library).

**Existing patterns to follow:**

- Server actions calling Pi: copy the abort controller + timeout pattern from `lib/openclaw/catalog-actions.ts`
- Stock badge: similar to the stock alerts card in `app/(chef)/dashboard/_sections/alerts-cards.tsx`
- Freshness: similar to the Freshness column on the costing page
- Sparklines: reuse `components/pricing/price-sparkline.tsx` directly
- Price attribution: reuse `components/pricing/price-attribution.tsx` for confidence display
- Add ingredient: reference `addIngredient()` in `lib/recipes/actions.ts` for the insert pattern
- Responsive layout: reference existing card/table patterns in `app/(chef)/culinary/ingredients/page.tsx`

**Pi deployment (sync-api runs via nohup, NOT systemd):**

```bash
scp .openclaw-build/services/sync-api.mjs davidferra@10.0.0.177:~/openclaw-prices/services/sync-api.mjs
scp .openclaw-build/lib/db.mjs davidferra@10.0.0.177:~/openclaw-prices/lib/db.mjs
ssh davidferra@10.0.0.177 'kill $(lsof -ti:8081) 2>/dev/null; cd ~/openclaw-prices && nohup node services/sync-api.mjs > /tmp/sync-api.log 2>&1 &'
curl http://10.0.0.177:8081/health
```

Do NOT use `systemctl`. The sync-api runs via nohup.

**Infinite scroll cursor implementation:**

- The `after` cursor is the `ingredient_id` of the last item in the current result set.
- On the Pi, for alphabetical sort: `WHERE ci.ingredient_id > ? ORDER BY ci.ingredient_id ASC LIMIT 200`
- For price/stores/updated sorts: cursor pagination doesn't work cleanly (non-unique sort keys). Fall back to offset-based: `LIMIT 200 OFFSET ?`. The server action calculates offset from the current item count.
- The client sends `after` for name sort and `page` for other sorts. The Pi handler checks which param is present and uses the appropriate query.

**Non-blocking Pi calls:**
All Pi calls must be wrapped in try/catch with AbortSignal.timeout(). If the Pi is offline, show a clear error state. Never show an empty catalog as if there are zero ingredients.

**Nav placement:**
Add under Culinary section in `nav-config.tsx`. Use the `Store` icon from lucide. Set `tier: 'secondary'`. Do NOT set `adminOnly: true`. Place it after "Ingredients" and before "Costing" in the Culinary group.

**Build order:**

1. Pi changes: add composite index to `db.mjs`, add `/api/categories`, update `/api/ingredients` (stock counts, cursor, filters), add `/api/ingredients/detail/:id`
2. Deploy `db.mjs` and `sync-api.mjs` to Pi, verify all new endpoints with curl
3. Server actions: `searchCatalogV2`, `getCatalogDetail`, `getCatalogCategories`, `addCatalogIngredientToLibrary`
4. Small components: `StockBadge`, `FreshnessDot`
5. Catalog browser: main client component with filters, infinite scroll, expanded detail, action buttons
6. Page component + nav link
7. Verify in browser via agent account
8. Responsive check at mobile/tablet widths

**Do not:**

- Add `'use server'` to component files
- Modify the existing admin catalog actions (`searchCatalog`, `getCatalogItemPrices`) - those use `requireAdmin()` and must stay as-is
- Hardcode the category list - fetch it from Pi via `/api/categories`
- Show $0.00 for ingredients without prices - show "No price data yet"
- Show an empty catalog when the Pi is offline - show an error state
- Forget `AbortController` on Pi fetches (the user may change filters rapidly)
- Forget responsive layout - this is a chef tool used on tablets/phones in kitchens
