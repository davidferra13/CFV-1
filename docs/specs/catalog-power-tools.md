# Spec: Catalog Power Tools - 9 Enhancements to Admin Price Catalog

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** openclaw-v2-unified-pricing.md (built)
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-28
> **Built by:** Claude Code (2026-03-28). SPEC IS BUILT.

---

## What This Does (Plain English)

Upgrades the admin price catalog tab from a basic search/filter table into a power-user tool. Adds visual price comparison bars, CSV export, bulk ingredient price check (paste a list, get prices for all), color-coded freshness indicators, click-to-filter shortcuts on table values, per-category coverage breakdown, price trend arrows, full keyboard navigation, and URL-synced filters. All 9 features are additive to the existing catalog-tab.tsx. No database changes. No new pages. Just a much better version of what's already there.

---

## Why It Matters

The catalog has 9,000+ ingredients across 39 stores. Right now browsing it is functional but slow. These enhancements make it a genuine daily-driver tool: see price comparisons at a glance, export filtered data, check a whole recipe's ingredient costs in one shot, and navigate without touching the mouse.

---

## Files to Create

| File                                                  | Purpose                                                           |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| `app/(admin)/admin/price-catalog/csv-export/route.ts` | GET endpoint: exports current filtered catalog view as CSV        |
| `components/pricing/price-comparison-bars.tsx`        | Mini horizontal bar chart showing store prices for one ingredient |
| `components/pricing/bulk-price-checker.tsx`           | Textarea + results panel: paste ingredient list, get best prices  |
| `components/pricing/category-coverage-chart.tsx`      | Horizontal bar chart showing coverage % per category              |
| `components/pricing/freshness-dot.tsx`                | Tiny colored dot (green/amber/red) based on date age              |

---

## Files to Modify

| File                                                       | What to Change                                                                                                                                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(admin)/admin/price-catalog/catalog-tab.tsx`          | All 9 enhancements integrated into existing component                                                                                                                                    |
| `app/(admin)/admin/price-catalog/price-catalog-client.tsx` | Wrap `<CatalogTab>` in `<Suspense>` boundary (required by Feature 9's `useSearchParams`)                                                                                                 |
| `lib/openclaw/catalog-actions.ts`                          | Add `searchCatalogForExport()` (returns all rows, no pagination), `getCategoryCoverage()`, and `getShoppingOptimizationAdmin()` (admin-auth version of shopping optimizer for Feature 3) |
| `.openclaw-build/services/sync-api.mjs`                    | Add `GET /api/stats/category-coverage` endpoint + augment `/api/ingredients` with trend data                                                                                             |
| `docs/app-complete-audit.md`                               | Update catalog tab description with new features                                                                                                                                         |

---

## Database Changes

None. All data comes from existing Pi endpoints and existing server actions.

---

## The 9 Features (Build in This Order)

### Feature 1: Price Comparison Bars (expanded row upgrade)

**What:** When an ingredient row is expanded, replace the plain text price list with horizontal bars that visually compare prices across stores.

**Component:** `components/pricing/price-comparison-bars.tsx`

```tsx
interface PriceComparisonBarsProps {
  prices: CatalogItemDetail[] // already fetched by handleExpand()
}
```

**Behavior:**

- Each store gets a horizontal bar, width proportional to its price relative to the max price in the set
- The cheapest store's bar is green (`bg-emerald-500`), all others are `bg-stone-600`
- Price label and store name appear on the bar
- Confidence badge still shown. `ConfidenceBadge` is currently defined inline in `catalog-tab.tsx` (not exported). Either export it from catalog-tab.tsx or extract it to a shared file like `components/pricing/confidence-badge.tsx`. There's also a different `ConfidenceBadge` in `price-catalog-client.tsx` with different colors. Use the catalog-tab version (emerald/amber/stone).
- If only 1 store, show a single full-width bar (no comparison needed, but still visual)
- Bar heights: `h-7` with `text-xs` labels inside

**Integration in catalog-tab.tsx:**

- Replace the existing `expandedPrices.map(...)` div with `<PriceComparisonBars prices={expandedPrices} />`
- Keep the "All store prices (sorted cheapest first)" heading
- Keep the "Loading store prices..." state as-is

---

### Feature 2: CSV Export

**What:** A "Download CSV" button in the filter bar that exports the current filtered view.

**Server action:** Add to `lib/openclaw/catalog-actions.ts`:

```typescript
export async function searchCatalogForExport(params: {
  search?: string
  category?: string
  store?: string
  pricedOnly?: boolean
  sort?: 'name' | 'price' | 'stores' | 'updated'
}): Promise<CatalogItem[]>
```

Same as `searchCatalog()` but with `limit: 10000` and no pagination. Returns flat array.

**Route:** `app/(admin)/admin/price-catalog/csv-export/route.ts`

- GET endpoint with query params matching the filter state
- Auth: `requireAdmin()`
- Uses `csvRowSafe` from `lib/security/csv-sanitize`
- Columns: Name, Category, Best Price ($), Unit, Best Store, # Stores, Last Updated
- Filename: `catalog-{date}.csv`
- Prices formatted as dollars (divide cents by 100, 2 decimals)

**UI in catalog-tab.tsx:**

- Add a `Download` icon button (from lucide: `Download`) in the filter bar, after the result count
- On click: construct URL with current filter params as query string, open in new tab (triggers download)
- Disabled while `isPending`
- Tooltip: "Export filtered results as CSV"

---

### Feature 3: Bulk Price Checker

**What:** A collapsible panel above the results table where the admin can paste a list of ingredient names (one per line) and see the best price for each.

**Component:** `components/pricing/bulk-price-checker.tsx`

```tsx
interface BulkPriceCheckerProps {
  onFilterByIngredient?: (name: string) => void // click an ingredient to search for it
}
```

**Behavior:**

- Toggle button in the filter bar: "Bulk Check" with a `ListChecks` icon (lucide)
- When open: shows a `<textarea>` (6 rows) with placeholder "Paste ingredient names, one per line..."
- "Check Prices" button submits the list
- **Auth note:** The existing `getShoppingOptimization()` in `price-intelligence-actions.ts` uses `requireChef()`, but this page uses `requireAdmin()`. Create a parallel `getShoppingOptimizationAdmin()` in `lib/openclaw/catalog-actions.ts` that uses `requireAdmin()` and calls the same Pi endpoint (`POST /api/optimize/shopping-list`). Do NOT modify the existing chef action.
- Results displayed in a compact table below the textarea:
  - Columns: Ingredient, Best Price, Store, Status
  - Status: green checkmark if found, red X if not found
  - Totals row at bottom: sum of found prices
- Also shows single-store vs multi-store comparison from the ShoppingOptResult (already returned by the action)
- "Clear" button resets the panel
- Ingredient names in results are clickable (calls `onFilterByIngredient` which sets the search field)

**Integration in catalog-tab.tsx:**

- Add `showBulkChecker` state (boolean)
- Render `<BulkPriceChecker>` between the filter row and the results table when visible
- Wire `onFilterByIngredient` to `handleSearchChange`

---

### Feature 4: Price Freshness Indicators

**What:** Color-code the "Last Updated" column based on how old the price data is.

**Component:** `components/pricing/freshness-dot.tsx`

```tsx
interface FreshnessDotProps {
  date: string | null // ISO date string
}
```

**Rules:**

- < 7 days old: green dot (`bg-emerald-500`) + "Fresh" tooltip
- 7-30 days old: amber dot (`bg-amber-500`) + "Aging" tooltip
- > 30 days old: red dot (`bg-red-500`) + "Stale" tooltip
- No date: gray dot (`bg-stone-600`) + "Unknown" tooltip

**Rendering:** A 6px circle (`w-1.5 h-1.5 rounded-full inline-block`) rendered to the left of the date text.

**Integration in catalog-tab.tsx:**

- In the Last Updated `<td>`, prepend `<FreshnessDot date={item.lastUpdated} />` before the date text
- No other changes needed

---

### Feature 5: Click-to-Filter on Table Values

**What:** Clicking a category badge in the table filters by that category. Clicking a store name in the expanded price detail filters by that store.

**Behavior:**

- Category badge in each table row: `onClick` calls `handleCategoryClick(item.category)` (already exists)
- Add `cursor-pointer` and `hover:ring-1 hover:ring-brand-500` to the category badge span
- Store name in expanded price rows: clicking it calls a new `handleStoreSelectByName(storeName)` function
  - This function finds the store in the `stores` array by name match and calls `handleStoreSelect(store.id)`
  - If no match found (store name doesn't exactly match), falls back to setting the search field to the store name
- Add `cursor-pointer` and `hover:underline` to the store name span in expanded rows
- Both clicks must `e.stopPropagation()` to prevent the row expand/collapse toggle

---

### Feature 6: Category Coverage Breakdown

**What:** Replace or augment the simple "Coverage: X%" stat card with a per-category breakdown showing which categories have good price coverage and which have gaps.

**Pi endpoint needed:** `GET /api/stats/category-coverage`

Add to `.openclaw-build/services/sync-api.mjs`:

```javascript
// Category coverage: how many ingredients in each category have at least one price
if (path === '/api/stats/category-coverage') {
  const rows = db
    .prepare(
      `
    SELECT
      ci.category,
      COUNT(*) as total,
      COUNT(DISTINCT cp.canonical_ingredient_id) as priced
    FROM canonical_ingredients ci
    LEFT JOIN current_prices cp ON cp.canonical_ingredient_id = ci.id
    GROUP BY ci.category
    ORDER BY ci.category
  `
    )
    .all()
  return jsonResponse(res, { categories: rows })
}
```

**Server action:** Add to `lib/openclaw/catalog-actions.ts`:

```typescript
export type CategoryCoverage = {
  category: string
  total: number
  priced: number
  coveragePct: number
}

export async function getCategoryCoverage(): Promise<CategoryCoverage[]>
```

Calls `GET /api/stats/category-coverage`, maps response, computes `coveragePct`.

**Component:** `components/pricing/category-coverage-chart.tsx`

```tsx
interface CategoryCoverageChartProps {
  data: CategoryCoverage[]
  onCategoryClick?: (category: string) => void
}
```

**Rendering:**

- Horizontal stacked bars, one per category
- Each bar shows: category name (left), coverage bar (proportional fill), "X/Y (Z%)" label (right)
- Bar fill color: >75% green, 25-75% amber, <25% red
- Clickable: clicking a category row triggers `onCategoryClick` (filters the main table)
- Sorted by coverage % ascending (worst gaps at top, most actionable)

**Integration in catalog-tab.tsx:**

- Fetch `getCategoryCoverage()` alongside stats on mount
- Replace the third stat card ("Coverage: X%") with a card that shows overall coverage AND has a "Show breakdown" toggle
- When toggled, render `<CategoryCoverageChart>` below the stat cards
- Wire `onCategoryClick` to `handleCategoryClick`

---

### Feature 7: Price Trend Indicators

**What:** Show an up/down arrow next to the best price indicating whether the price has risen or fallen recently.

**Data source:** The Pi already tracks price changes. The `getCatalogItemPrices()` action returns prices but not trends. Instead of adding a new endpoint, derive the trend client-side from the expanded price data, or add a lightweight field to the search results.

**Approach A (preferred, no Pi change):** Add trend data to the `/api/ingredients` response on the Pi.

Modify the SQL in the `/api/ingredients` handler in `sync-api.mjs` to LEFT JOIN `price_changes` and include a `recent_change_pct` field:

```sql
-- Add to the ingredients query when price data is joined.
-- IMPORTANT: SQLite doesn't support lateral joins. Use a window function
-- to get the most recent change per ingredient, not a global LIMIT 1.
LEFT JOIN (
  SELECT canonical_ingredient_id, change_pct,
         ROW_NUMBER() OVER (PARTITION BY canonical_ingredient_id ORDER BY observed_at DESC) as rn
  FROM price_changes
  WHERE observed_at > datetime('now', '-7 days')
) pc_trend ON pc_trend.canonical_ingredient_id = ci.id AND pc_trend.rn = 1
```

**Performance note:** This window function runs across all `price_changes` rows from the last 7 days. If the query adds >500ms latency to `/api/ingredients`, make trends opt-in via a `?trends=1` query param (only sent when the user hasn't disabled it). Measure before and after on the Pi.

Return `recent_change_pct` in the response. Map it in `searchCatalog()` to a new field on `CatalogItem`:

```typescript
// Add to CatalogItem type
trendPct: number | null // positive = price went up, negative = went down, null = no recent change
```

**UI in catalog-tab.tsx:**

- In the Best Price column, after the price text, render a trend indicator:
  - `trendPct > 0`: red up arrow (`TrendingUp` from lucide, `text-red-400 w-3 h-3`) + `+X%` in `text-red-400 text-xs`
  - `trendPct < 0`: green down arrow (`TrendingDown` from lucide, `text-emerald-400 w-3 h-3`) + `X%` in `text-emerald-400 text-xs`
  - `trendPct === 0` or `null`: nothing (no indicator)
- Only show trend for items that have a price (skip "No price" rows)

---

### Feature 8: Keyboard Navigation

**What:** Arrow keys to move through rows, Enter to expand/collapse, Escape to collapse and close any open panels.

**Implementation in catalog-tab.tsx:**

Add a `focusedIndex` state (number, default -1 = none focused).

Add a `useEffect` that registers a `keydown` listener on the component's wrapper div:

| Key         | Action                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------ |
| `ArrowDown` | `focusedIndex = Math.min(focusedIndex + 1, items.length - 1)`. Scroll into view if needed. |
| `ArrowUp`   | `focusedIndex = Math.max(focusedIndex - 1, 0)`                                             |
| `Enter`     | Toggle expand on `items[focusedIndex]` (call `handleExpand`)                               |
| `Escape`    | If an item is expanded, collapse it. If bulk checker is open, close it. Otherwise, blur.   |
| `Home`      | `focusedIndex = 0`                                                                         |
| `End`       | `focusedIndex = items.length - 1`                                                          |

**Visual feedback:**

- Focused row gets `ring-1 ring-brand-500 ring-inset` highlight
- Use a `ref` array or `data-index` attributes + `scrollIntoView({ block: 'nearest' })` for scroll management
- Only activate keyboard nav when the table area has focus (check `document.activeElement` is within the component)
- Don't capture keys when an input/textarea is focused (check `tagName`)

**Accessibility:**

- Add `tabIndex={0}` to the table wrapper so it can receive focus
- Add `role="grid"` to table, `role="row"` to rows, `aria-selected` on focused row
- Add a small hint text below the table: "Arrow keys to navigate, Enter to expand"

---

### Feature 9: URL-Synced Filters

**What:** Push filter state to the URL as query params so filtered views are bookmarkable and shareable.

**Implementation in catalog-tab.tsx:**

Use `useSearchParams()` and `useRouter()` from `next/navigation`.

**URL params:**

| Param    | Maps to         | Default (omitted from URL) |
| -------- | --------------- | -------------------------- |
| `q`      | `search`        | empty                      |
| `cat`    | `category`      | null                       |
| `store`  | `selectedStore` | null                       |
| `priced` | `pricedOnly`    | false (omit when false)    |
| `sort`   | `sort`          | "name" (omit when "name")  |
| `page`   | `page`          | 1 (omit when 1)            |

**Read on mount:** Initialize state from URL params instead of hardcoded defaults. If `?cat=beef&store=123` is in the URL, start with those filters active.

**Write on change:** Every filter change calls `router.replace(pathname + '?' + newParams.toString(), { scroll: false })` in addition to triggering `doSearch()`. Use `replace` not `push` to avoid polluting browser history with every filter change.

**Important:** The catalog tab is rendered inside `price-catalog-client.tsx` which manages tabs via local state (no URL params). The URL params must not conflict. Use a `tab` param if the builder also wants to URL-sync tabs, otherwise leave tab management as-is (local state is fine for tabs).

**CRITICAL - Suspense boundary required:** `useSearchParams()` in Next.js App Router throws if not wrapped in `<Suspense>`. The parent `price-catalog-client.tsx` currently renders `<CatalogTab />` directly with no Suspense. The builder MUST:

1. Import `Suspense` from `'react'` in `price-catalog-client.tsx`
2. Wrap `<CatalogTab />` in `<Suspense fallback={<div className="animate-pulse h-96 bg-stone-900 rounded-lg" />}>`
3. This is a prerequisite for Feature 9 to work at all. Build it first within this feature.

**CSV export route reads from URL:** The route at `csv-export/route.ts` reads filter params from `request.nextUrl.searchParams`, NOT from a POST body. The client constructs a URL like `/admin/price-catalog/csv-export?cat=beef&priced=1` and calls `window.open(url)` to trigger the download.

---

## Edge Cases and Error Handling

| Scenario                                                         | Correct Behavior                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Store dropdown doesn't close on outside click (PRE-EXISTING BUG) | Fix while touching catalog-tab.tsx: add a `useEffect` that listens for `mousedown` outside the dropdown ref and sets `showStoreDropdown(false)`. This bug exists today and should be fixed as part of this work. |
| CSV export with 10,000+ items                                    | Stream response, don't buffer entire CSV in memory. Use `ReadableStream` if needed. Practically, 10k rows of 7 columns is ~500KB, fine to buffer.                                                                |
| Bulk check with 0 items                                          | Disable "Check Prices" button when textarea is empty                                                                                                                                                             |
| Bulk check with 200+ items                                       | Truncate to 200 (Pi batch limit), show toast: "Checking first 200 items"                                                                                                                                         |
| Bulk check Pi timeout                                            | Show error state in the bulk checker panel, not a page-level error                                                                                                                                               |
| Freshness dot with future date                                   | Treat as "Fresh" (green). Don't break on timezone edge cases.                                                                                                                                                    |
| Keyboard nav on empty results                                    | Don't crash. `focusedIndex` stays -1. Arrow keys do nothing.                                                                                                                                                     |
| Keyboard nav while loading                                       | Ignore arrow keys while `isPending` is true                                                                                                                                                                      |
| URL params with invalid values                                   | `cat=invalid_category` just returns 0 results (server handles gracefully). Don't validate client-side.                                                                                                           |
| URL params with XSS attempt                                      | Search params are passed to server actions, never rendered as raw HTML. `encodeURIComponent` on write.                                                                                                           |
| Store name click with no ID match                                | Fall back to text search instead of silent failure                                                                                                                                                               |
| Category coverage fetch fails                                    | Hide the breakdown, keep the simple percentage stat card                                                                                                                                                         |
| Trend data missing from Pi response                              | Show no indicator (graceful degradation, not an error)                                                                                                                                                           |
| Bulk checker / coverage chart loading                            | Show `loading-bone` skeleton pattern (existing CSS class) while fetching. Never show empty panel with no feedback.                                                                                               |
| Mobile / narrow viewport                                         | This is admin-only, desktop-only. No mobile layout needed. Do not add responsive breakpoints for these features.                                                                                                 |
| Keyboard nav + page change                                       | ArrowDown past the last visible item does NOT auto-advance to next page. User must click Next explicitly. Keyboard nav operates within the current page only.                                                    |

---

## Verification Steps

1. Sign in with agent account at `localhost:3100`
2. Navigate to Admin > Price Catalog > Catalog tab

**Feature 1 - Price comparison bars:** 3. Search for "chicken breast", expand the row 4. Verify horizontal bars appear with store names and prices 5. Verify cheapest store bar is green

**Feature 2 - CSV export:** 6. Apply filters (category: beef, priced only) 7. Click Download button 8. Open CSV, verify it contains only beef items with prices 9. Verify no formula injection (no cells starting with `=`)

**Feature 3 - Bulk price checker:** 10. Click "Bulk Check" in filter bar 11. Paste: `chicken breast\nsalmon\nbutter\nza'atar\nfake_ingredient_xyz` 12. Click "Check Prices" 13. Verify found items show prices, fake item shows "not found" 14. Verify total row at bottom 15. Click an ingredient name, verify it populates the search field

**Feature 4 - Freshness dots:** 16. Look at the Last Updated column 17. Verify green dots for recent dates, amber for older, red for very old 18. Hover over a dot, verify tooltip text

**Feature 5 - Click-to-filter:** 19. Click a "beef" category badge in the results table 20. Verify the category filter activates and results update 21. Clear filters, expand an item, click a store name 22. Verify the store filter activates

**Feature 6 - Category coverage:** 23. Check the stats bar, verify "Show breakdown" toggle exists 24. Click it, verify per-category bars appear 25. Verify worst-coverage categories are at the top 26. Click a category bar, verify it filters the main table

**Feature 7 - Price trends:** 27. Look at items with prices in the main table 28. Verify some show up/down arrows with percentage 29. Verify no arrows on items without recent changes

**Feature 8 - Keyboard navigation:** 30. Click on the results table area to focus it 31. Press ArrowDown, verify first row highlights 32. Press Enter, verify row expands 33. Press Escape, verify row collapses 34. Press Home, verify jumps to first row

**Feature 9 - URL sync:** 35. Select category "Seafood", verify URL updates to include `?cat=seafood` 36. Copy URL, open in new tab, verify same filters are active 37. Use browser back, verify filters revert 38. Screenshot the final catalog tab with some filters active

---

## Out of Scope

- Not changing the other 5 tabs in price-catalog (Overview, Prices, Sources, Changes, Sync)
- Not adding any new database tables or columns
- Not modifying the Pi's SQLite schema (only adding a new read-only endpoint and augmenting an existing one)
- Not building the full V2 unified pricing spec (that's a separate spec, already built)
- Not adding these features to the chef-facing views (admin only)

---

## Notes for Builder Agent

**Existing patterns to follow:**

- CSV export: copy the pattern from `app/(chef)/events/csv-export/route.ts` exactly. Use `csvRowSafe` from `lib/security/csv-sanitize`.
- Pricing components: follow the style in `components/pricing/price-badge.tsx` and `components/pricing/price-sparkline.tsx`
- Server actions: follow the abort controller + timeout pattern already in `lib/openclaw/catalog-actions.ts`
- Keyboard nav: reference `components/search/command-palette.tsx` for keyboard handler patterns (capture phase, input element check)

**Pi deployment (sync-api runs via nohup, NOT systemd):**

- After modifying `.openclaw-build/services/sync-api.mjs`, SCP to Pi: `scp .openclaw-build/services/sync-api.mjs davidferra@10.0.0.177:/home/davidferra/openclaw-prices/services/sync-api.mjs`
- Restart: `ssh davidferra@10.0.0.177 "kill \$(lsof -ti:8081) 2>/dev/null; cd ~/openclaw-prices && nohup node services/sync-api.mjs > /tmp/sync-api.log 2>&1 &"`
- Verify: `curl http://10.0.0.177:8081/health`
- Do NOT use `systemctl` - the sync-api service file exists but is not installed. It runs via nohup.

**Build order matters:**

- Features 4 (freshness dots) and 5 (click-to-filter) are simple, self-contained. Build these first as warmup.
- Feature 9 (URL sync) touches initialization logic, so build it before Feature 8 (keyboard nav) to avoid conflicts.
- Feature 7 (trends) requires a Pi endpoint change. Deploy the Pi change before building the client-side rendering.
- Feature 3 (bulk checker) is the most complex UI. Build it last or second-to-last.

**Suggested build sequence:**

1. Fix pre-existing bug: store dropdown outside-click close (do this first while reading the file)
2. Feature 4 (freshness dots) - standalone component, quick warmup
3. Feature 5 (click-to-filter) - minor catalog-tab edits, quick warmup
4. Features 6 + 7 together (Pi changes) - modify sync-api.mjs ONCE, SCP ONCE, restart ONCE. Build both Pi endpoints, then deploy, then build both client-side components
5. Feature 1 (comparison bars) - new component + swap in expanded row
6. Feature 2 (CSV export) - route + button
7. Feature 9 (URL sync) - add Suspense boundary to parent FIRST, then useSearchParams integration
8. Feature 8 (keyboard nav) - event handler + focus management (after URL sync so init logic is settled)
9. Feature 3 (bulk checker) - most complex standalone panel, build last. Create `getShoppingOptimizationAdmin()` in catalog-actions.ts

**Do not:**

- Add `'use server'` to component files
- Break the existing filter/search/pagination flow
- Add database migrations (everything reads from Pi)
- Use `useRouter().push()` for filter changes (use `replace` to avoid history pollution)
- Forget `e.stopPropagation()` on click-to-filter handlers (or the row will toggle expand)
- Call `getShoppingOptimization()` from `price-intelligence-actions.ts` on this page (it uses `requireChef()`, not `requireAdmin()`). Use the new `getShoppingOptimizationAdmin()` in `catalog-actions.ts` instead.
- Forget that adding `trendPct` to `CatalogItem` is a type-level change. Search for any other consumers of `CatalogItem` and ensure the new nullable field doesn't break them. (Currently only `catalog-tab.tsx` consumes it, so this should be safe.)
