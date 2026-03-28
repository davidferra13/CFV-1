# Spec: OpenClaw Phase 3 - Full Integration

> **Status:** built
> **Priority:** P1 (next up)
> **Depends on:** openclaw-v2-unified-pricing.md (built), openclaw-price-surfacing.md (built)
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-28
> **Built by:** Claude Code (2026-03-28)

---

## What This Does (Plain English)

Closes every remaining gap between OpenClaw's data collection on the Raspberry Pi and ChefFlow's chef-facing experience. After this spec is built: the Pi survives reboots without manual intervention, price coverage grows 3x through new scraper activation, chefs personalize which stores they care about, the dashboard proactively tells chefs what's on sale and what's getting expensive, and the system generates a weekly price intelligence briefing that makes every other food costing tool look like a spreadsheet.

This is not a new system. Everything here builds on infrastructure that already exists and works. The goal is to go from "the plumbing works" to "this is the reason chefs choose ChefFlow."

---

## Why It Matters

OpenClaw has 9,270 cataloged ingredients, 18 tracked stores, a nightly sync pipeline, an 8-tier price resolution chain, and a suite of intelligence components already built. But price coverage is at ~8%, five scrapers sit dormant, the sync-api dies on Pi reboot, chefs have no way to say "I shop at Market Basket and Shaw's," and the intelligence features are scattered across pages instead of surfacing proactively. The competitive moat (a living price database that no human maintains) only works if the data is comprehensive and the insights reach the chef without them having to go looking.

---

## Table of Contents

1. [Workstream A: Pi Hardening](#workstream-a-pi-hardening)
2. [Workstream B: Coverage Expansion](#workstream-b-coverage-expansion)
3. [Workstream C: Chef Store Preferences (OpenClaw Integration)](#workstream-c-chef-store-preferences-openclaw-integration)
4. [Workstream D: Proactive Price Intelligence](#workstream-d-proactive-price-intelligence)
5. [Workstream E: Sale Calendar](#workstream-e-sale-calendar)
6. [Workstream F: Weekly Price Briefing](#workstream-f-weekly-price-briefing)
7. [Workstream G: Menu Cost Forecasting](#workstream-g-menu-cost-forecasting)
8. [Workstream H: Vendor Price List Import](#workstream-h-vendor-price-list-import)
9. [Database Changes](#database-changes)
10. [Files to Create](#files-to-create)
11. [Files to Modify](#files-to-modify)
12. [Verification Steps](#verification-steps)
13. [Out of Scope](#out-of-scope)
14. [Notes for Builder Agent](#notes-for-builder-agent)

---

## Architecture Decisions (READ BEFORE BUILDING)

### Decision 1: Pi operations are SSH-based, not API-based

All Pi hardening and scraper activation (Workstreams A and B) are done via SSH from the dev machine. The builder agent can run `ssh pi "command"` to configure cron, install systemd services, and verify scraper status. No ChefFlow code changes needed for these workstreams.

### Decision 2: Store preferences live in ChefFlow, not the Pi

Chef store preferences are stored in ChefFlow's PostgreSQL database in the existing `chef_preferred_stores` table (migration `20260401000035`). Full CRUD already exists in `lib/grocery/store-shopping-actions.ts`. The sync and resolution chain read from this table to personalize results. The Pi does not know about individual chefs or their preferences.

### Decision 3: All new intelligence features are deterministic (formula > AI)

Weekly briefings, sale calendars, menu cost forecasts, and price alerts are computed from real data using math. No LLM involvement. This matches the project's "formula > AI" principle.

### Decision 4: Proactive intelligence surfaces on the dashboard and via Remy

New intelligence does not require chefs to navigate to the costing page. It surfaces as dashboard cards and as context Remy can reference when chefs ask "what should I buy this week?" or "is salmon expensive right now?"

### Decision 5: Vendor price list import is Phase 3's stretch goal

The email outreach system from the grand spec is complex (separate domain, permission tiers, PDF parsing). This spec includes a simpler version: manual PDF upload in ChefFlow's admin panel, parsed by the Pi. Full email automation is a separate future spec.

### Decision 6: Reuse existing pricing components

ChefFlow already has 14 components in `components/pricing/`: `price-attribution.tsx`, `price-badge.tsx`, `price-sparkline.tsx`, `price-watch-list.tsx`, `store-scorecard.tsx`, `cost-impact.tsx`, `event-shopping-planner.tsx`, `shopping-optimizer.tsx`, `bulk-price-checker.tsx`, `category-coverage-chart.tsx`, `freshness-dot.tsx`, `price-comparison-bars.tsx`, `stock-badge.tsx`, `rate-card-view.tsx`. New features in this spec MUST reuse these components. Do not create duplicates.

### Decision 7: Pi endpoints must be built before ChefFlow features that call them

Workstreams E (Sale Calendar) and H (Vendor Import) require new Pi endpoints that do not exist yet. The builder must add these to `.openclaw-build/services/sync-api.mjs`, SCP to Pi, and restart sync-api BEFORE building the ChefFlow UI that calls them.

### Decision 8: Remy tool addition must not duplicate existing tools

Remy already has `vendor.price_insights` (price trend analysis), `analytics.recipe_cost` (ingredient cost analysis), `menu.food_cost` (food cost analysis), and `analytics.cost_trends` (6-month trends). The new `price.check` tool is distinct: it does real-time single-ingredient lookup from OpenClaw data. It does NOT replace or overlap with the existing analytics tools which compute aggregated insights.

### Decision 9: All Pi HTTP calls use a 5-second timeout with graceful fallback

Workstreams D, E, F, G, and H all call Pi HTTP endpoints. The Pi is a Raspberry Pi on local network; it can be slow (Chromium scraper running, heavy I/O) or offline (rebooting, power loss). Every `fetch()` to `10.0.0.177:8081` MUST:

1. Use `AbortController` with a 5-second timeout
2. Catch `AbortError` and network errors
3. Return a typed error object (not throw) that UI components render as "Price data temporarily unavailable" with a retry button
4. Never block page rendering on Pi availability (use Suspense boundaries or conditional rendering)

```typescript
// Standard Pi fetch wrapper - use this for ALL Pi calls
async function fetchPi<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${OPENCLAW_API}${path}`, { ...options, signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return { data: null, error: `Pi returned ${res.status}` }
    return { data: await res.json(), error: null }
  } catch (err) {
    clearTimeout(timeout)
    return { data: null, error: 'Price data temporarily unavailable' }
  }
}
```

This pattern prevents a hung or offline Pi from blocking the dashboard, sale calendar, or any other page that calls Pi endpoints.

### Decision 10: Pi response caching to prevent overload

The Pi is single-threaded Node.js. If multiple chefs load their dashboards simultaneously, concurrent Pi HTTP requests can overwhelm it. Cache Pi responses in ChefFlow using `unstable_cache` with short TTLs:

- **Price drops, freshness, stock summary:** 5-minute TTL, global (not per-tenant, this data is the same for everyone)
- **Cost impact (per-chef ingredient list):** 5-minute TTL, keyed by tenant ID
- **Sale calendar:** 15-minute TTL, global
- **Coverage stats:** 1-hour TTL, global

Tag all caches with `'pi-data'` so they can be busted manually if needed. The nightly sync already busts ingredient-level caches; Pi response caches are separate and short-lived.

### Decision 11: `resolvePricesBatch()` takes ingredient IDs, not names

`resolvePricesBatch(ingredientIds: string[], tenantId: string)` in `lib/pricing/resolve-price.ts` (line 363) accepts **ingredient UUIDs**, not display names. Any code that starts with ingredient names (Remy tool, weekly briefing) must first look up IDs:

```sql
SELECT id FROM ingredients WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)
```

Or collect IDs directly from `recipe_ingredients` JOINed to `ingredients`. Never pass names to `resolvePricesBatch()`.

---

## Workstream A: Pi Hardening

**Goal:** The Pi survives reboots, the sync-api is managed by systemd, and the developer never has to manually restart services.

### A1: Install sync-api as systemd service

The service file already exists at `~/openclaw-prices/systemd/openclaw-sync-api.service`. It needs to be installed and enabled.

```bash
ssh pi "sudo cp ~/openclaw-prices/systemd/openclaw-sync-api.service /etc/systemd/system/"
ssh pi "sudo systemctl daemon-reload"
ssh pi "sudo systemctl enable --now openclaw-sync-api"
```

**Verification:** Reboot Pi, wait 60 seconds, `curl http://10.0.0.177:8081/health` returns 200.

### A2: Install backup-db as systemd timer

The backup script exists at `~/openclaw-prices/services/backup-db.mjs`. Add a nightly cron (if not already present):

```bash
ssh pi "crontab -l | grep -q backup-db || (crontab -l; echo '0 1 * * * cd ~/openclaw-prices && node services/backup-db.mjs >> logs/backup.log 2>&1') | crontab -"
```

**Verification:** `ssh pi "ls -la ~/openclaw-prices/backups/"` shows timestamped .db files.

### A3: Verify all cron entries

Run `ssh pi "crontab -l"` and verify against the documented schedule:

```text
0 1  * * *    backup-db.mjs
0 2  * * 1    scraper-government.mjs
0 3  * * *    scraper-flipp.mjs
0 4  * * *    cross-match.mjs
0 9  * * 3    scraper-wholesale.mjs
0 10 * * *    aggregator.mjs
*/15 * * * *  watchdog.mjs
0 23 * * *    sync-to-chefflow.mjs
```

Add any missing entries.

### A4: Watchdog upgrade - auto-restart sync-api

If `watchdog.mjs` doesn't already check sync-api health, add a check: `curl -s http://localhost:8081/health` and restart via systemd if down.

---

## Workstream B: Coverage Expansion

**Goal:** Grow price coverage from ~8% to 25-35% within 30 days by activating dormant scrapers.

### B1: Verify Chromium on Pi

```bash
ssh pi "which chromium-browser || which chromium || apt list --installed 2>/dev/null | grep chromium"
```

If missing: `ssh pi "sudo apt install -y chromium-browser"`. Puppeteer on ARM64 needs Chromium, not Chrome.

### B2: Schedule Puppeteer scrapers (staggered)

Only one Puppeteer process at a time (Pi has 8GB RAM but Chromium is heavy). Stagger to avoid overlap:

```text
0 5  * * *    scraper-instacart.mjs      (Market Basket proxy - daily)
0 6  * * 2,5  scraper-hannaford.mjs      (Tue/Fri)
0 7  * * 3,6  scraper-stopsandshop.mjs   (Wed/Sat)
```

Whole Foods/Amazon Fresh deferred (lower priority, complex auth).

### B3: Memory guard in watchdog

Add to `watchdog.mjs`: if any scraper process has been running > 45 minutes, kill it and log a warning. Prevents runaway Puppeteer from consuming all RAM.

### B4: Weekly flyer scraper activation

```text
0 12 * * 3    scraper-flyers.mjs    (Wednesday noon, after flyers publish)
```

### B5: Coverage tracking endpoint

**Note:** Pi already has `GET /api/stats/category-coverage` which returns per-category counts. Extend it (do NOT create a separate endpoint) to also return totals.

**File to modify:** `.openclaw-build/services/sync-api.mjs` (the existing `/api/stats/category-coverage` handler)

**Add to the existing response:**

```json
{
  "total_canonical": 9270,
  "with_price": 1014,
  "coverage_pct": 10.9,
  "by_category": { "poultry": { "total": 418, "priced": 45 }, ... }
}
```

**SQLite query addition:**

```sql
SELECT
  (SELECT COUNT(*) FROM canonical_ingredients) AS total_canonical,
  (SELECT COUNT(DISTINCT canonical_ingredient_id) FROM current_prices) AS with_price
```

ChefFlow can display this on the admin catalog and dashboard.

**Verification:** After 7 days, `ssh pi "node scripts/check-stats.mjs"` shows price count increasing. After 30 days, coverage should be 20-30%.

---

## Workstream C: Chef Store Preferences (OpenClaw Integration)

**Goal:** Connect the EXISTING store preferences system to OpenClaw's price resolution so chefs see personalized prices throughout the app.

### What Already Exists (DO NOT RECREATE)

The store preferences infrastructure is already fully built:

- **Table:** `chef_preferred_stores` (migration `20260401000035`) with `chef_id`, `store_name`, `store_type`, `address`, `notes`, `is_default`, `sort_order`
- **Table:** `store_item_assignments` (same migration) with per-ingredient store assignments and reason (`best_price`, `best_quality`, `only_source`, `convenience`)
- **Server actions:** `lib/grocery/store-shopping-actions.ts` exports full CRUD: `getPreferredStores()`, `addPreferredStore()`, `updatePreferredStore()`, `removePreferredStore()`, `setDefaultStore()`, `getStoreAssignments()`, `assignItemToStore()`, `removeStoreAssignment()`, `splitGroceryListByStore()`
- **Types:** `PreferredStore`, `StoreAssignment`, `StoreType`, `AssignmentReason`

### What's Missing (BUILD THIS)

The existing store preferences are used for grocery list splitting but NOT connected to OpenClaw's price resolution or price display. This workstream connects them.

### Database Change

**None.** Use the existing `chef_preferred_stores` table. Do NOT create a new table.

### New Server Action (thin wrapper)

**File:** `lib/openclaw/store-preference-actions.ts`

**Action 1: `getAvailableOpenClawStores()`**

- **Auth:** `requireChef()`
- **Input:** none
- **Output:** `string[]` (store display names from Pi's `GET /api/sources`)
- **Side Effects:** None

**Action 2: `getMyPrimaryStoreName()`**

- **Auth:** `requireChef()`
- **Input:** none
- **Output:** `string | null`
- **Side Effects:** None

`getMyPrimaryStoreName()` calls existing `getPreferredStores()` from `lib/grocery/store-shopping-actions.ts`, finds the one with `is_default = true`, returns its `store_name`. `getAvailableOpenClawStores()` calls Pi's `GET /api/sources` and returns display names.

### UI: Store Preferences Page

`components/grocery/store-manager.tsx` is a complete store preferences component (393 lines, full CRUD for preferred stores) but is **not mounted on any page yet**. No existing app page imports it.

**Build:** Create `app/(chef)/settings/store-preferences/page.tsx` that renders `StoreManager` from `components/grocery/store-manager.tsx`. Enhance it with OpenClaw store suggestions: call `getAvailableOpenClawStores()` to show Pi's tracked stores that aren't in the chef's list yet as quick-add chips.

### Integration Points

1. **`resolvePrice()` / `resolvePricesBatch()`** in `lib/pricing/resolve-price.ts`: The function already accepts `_options?: { preferredStore?: string }` but the parameter is unused (underscore-prefixed). Activate this stub: when `preferredStore` is provided and multiple OpenClaw prices exist for the same ingredient at the same tier, prefer the row matching `store_name = preferredStore`. If no match at that store, fall through normally. The caller passes the chef's primary store from `getMyPrimaryStoreName()`.

2. **PriceAttribution component**: When displaying "at Shaw's", use the chef's preferred store price when available instead of always showing the cheapest.

3. **Event Shopping Planner**: Default the "single store" option to the chef's default store (from `chef_preferred_stores.is_default`).

4. **Store Scorecard**: Highlight the chef's preferred stores in the ranking.

### States

- **No preferred stores set:** Show all stores equally (current behavior). Prompt on first visit to costing page: "Select your stores for personalized pricing."
- **Preferred stores set:** Prices throughout the app prioritize the default store, then other preferred stores, then any store.

### Store Name Matching (CRITICAL)

OpenClaw's Pi uses `source_id` (e.g., `market-basket-flipp`) internally. The `source_registry` table has a `name` field with the display name (e.g., `Market Basket`). ChefFlow's `chef_preferred_stores.store_name` stores display names. When the sync writes `last_price_store` to the ingredients table, it writes the Pi display name. Matching between the two systems is on display name. The builder must verify that Pi `source_registry.name` values match what chefs enter in `chef_preferred_stores.store_name` (case-insensitive comparison recommended).

---

## Workstream D: Proactive Price Intelligence

**Goal:** Price intelligence surfaces on the dashboard without the chef navigating to the costing page.

### D1: Enhanced Dashboard Price Card

The dashboard already has three separate price cards in `alerts-cards.tsx` (lines 236-283):

1. **Price Drop Alerts** (line 237) - calls `getPriceDropAlerts(5)`, shows top drops, links to `/culinary/ingredients`
2. **Price Freshness** (line 249) - calls `getPriceFreshness()`, shows current/stale/expired %, links to `/admin/price-catalog`
3. **Stock Availability** (line 268) - calls `getStockSummary()`, shows OOS count and availability %, links to `/culinary/ingredients`

**What to change:** Consolidate these three cards into one unified "Price Intelligence" card. Remove the three individual cards. The unified card replaces them (same data, better presentation).

**File to modify:** `app/(chef)/dashboard/_sections/alerts-cards.tsx`

**After:** A unified "Price Intelligence" card that shows:

```text
Price Intelligence
------------------
3 ingredients dropped this week     [View]
  Chicken breast: $3.49/lb at Shaw's (was $4.29, down 19%)
  Salmon fillet: $8.99/lb at Stop & Shop (was $11.99, down 25%)
  Butter: $3.99/lb at Market Basket (was $4.49, down 11%)

2 ingredients spiking               [View]
  Eggs (large): $4.99/dz everywhere (up 22% in 7 days)
  Heavy cream: $6.49/qt at Shaw's (up 15%)

Your prices: 67% current, 22% recent, 11% stale
```

**Server action:** `getPriceIntelligenceSummary()` in `lib/openclaw/price-intelligence-actions.ts`

**Action: `getPriceIntelligenceSummary()`**

- **Auth:** `requireChef()`
- **Input:** none
- **Output:** `{ drops: PriceDrop[], spikes: PriceSpike[], freshness: FreshnessBreakdown, topSavingsStore: string }`

**Logic:**

1. Get chef's ingredient IDs and names from their recipes (see Decision 11)
2. Call Pi's `/api/alerts/price-drops` and `/api/prices/cost-impact`
3. Call Pi's `/api/freshness`
4. Filter to only ingredients the chef actually uses
5. Return personalized summary

### D2: Remy Price Context

When Remy (the AI assistant) is asked about pricing, ingredients, or shopping, it should have access to current price intelligence.

**Existing Remy tools that touch pricing (DO NOT duplicate these):**

- `vendor.price_insights` - aggregated trend analysis across vendors (broad analytics)
- `analytics.recipe_cost` - recipe-level cost breakdown with substitution suggestions
- `menu.food_cost` - food cost % and per-guest cost for a menu
- `analytics.cost_trends` - 6-month cost trend chart

**What's missing:** None of these do a simple "what does X cost right now at which store?" lookup. That's what `price.check` adds.

**Remy's tool system is a 4-file pipeline.** The builder must modify all four files:

1. **`lib/ai/command-task-descriptions.ts`** - Add `price.check` to the `TASK_DESCRIPTIONS` array following the existing pattern (each entry has `type`, `tier`, `name`, `description`, `inputSchema`). Place it in the "Vendor Intelligence" section near `vendor.price_insights`.

2. **`lib/ai/command-intent-parser.ts`** - Add `price.check` to the intent classification so natural language like "how much is salmon?" or "what does chicken cost?" routes to this tool.

3. **`lib/ai/command-orchestrator.ts`** - Add a `case 'price.check':` handler in the main switch statement (near line ~1650, alongside `vendor.price_insights`). The handler calls an executor function.

4. **`lib/ai/remy-actions.ts`** - No changes needed here. `remy-actions.ts` delegates to the orchestrator via `runCommand()`. Adding the tool to the three files above is sufficient.

**The executor function (`executePriceCheck`):**

```typescript
async function executePriceCheck(inputs: Record<string, unknown>) {
  const ingredientNames = (inputs.ingredients as string[]) || []
  // Look up ingredient IDs from names first (Decision 11)
  const rows = await db.execute(sql`
    SELECT id, name FROM ingredients
    WHERE tenant_id = ${tenantId}
      AND LOWER(name) = ANY(${ingredientNames.map((n) => n.toLowerCase())})
  `)
  const ids = rows.map((r: any) => r.id)
  if (ids.length === 0) return { message: 'No matching ingredients found in your library.' }

  const resolved = await resolvePricesBatch(ids, tenantId)
  return formatPricesForRemy(resolved, rows)
}
```

This is read-only (no mutation), safe for Remy to call. It lets a chef ask "How much is salmon right now?" or "What's the cheapest store for my Saturday menu?" and get real answers from real data. It complements (not replaces) the existing analytics tools which work at the recipe/menu/trend level.

---

## Workstream E: Sale Calendar

**Goal:** Chefs see what's on sale right now across their preferred stores.

OpenClaw's Flipp scraper already captures sale indicators and the aggregator tracks price drops. This workstream surfaces that data as a "What's on Sale" view.

### Server Action

**File:** `lib/openclaw/sale-calendar-actions.ts`

**Action 1: `getCurrentSales(stores?)`**

- **Auth:** `requireChef()`
- **Input:** `{ stores?: string[] }` (defaults to chef's preferred stores)
- **Output:** `SaleItem[]`

**Action 2: `getSalesByCategory(category, stores?)`**

- **Auth:** `requireChef()`
- **Input:** `{ category: string, stores?: string[] }`
- **Output:** `SaleItem[]`

```typescript
interface SaleItem {
  ingredientName: string
  canonicalId: string
  store: string
  salePriceCents: number
  regularPriceCents: number | null // null if unknown
  savingsPct: number | null
  unit: string
  validThrough: string | null // sale end date if known
  category: string
}
```

**Pi endpoint needed (MUST BE BUILT FIRST):** `GET /api/sales/current?stores=Shaw's,Market+Basket`

**File to modify:** `.openclaw-build/services/sync-api.mjs`

This endpoint does NOT exist yet. Builder must add it to sync-api.mjs, SCP to Pi, and restart sync-api before building the ChefFlow UI.

**SQLite query on Pi:**

**IMPORTANT:** Pi's `current_prices.source_id` is a system identifier (e.g., `market-basket-flipp`), NOT a display name. All queries MUST JOIN `source_registry` to get human-readable store names.

```sql
-- Items explicitly marked as sale prices
SELECT ci.name, ci.category, cp.price_cents, cp.price_unit,
       sr.name AS store, cp.sale_start_date, cp.sale_end_date
FROM current_prices cp
JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.id
JOIN source_registry sr ON cp.source_id = sr.source_id
WHERE cp.price_type = 'sale'
  AND (cp.sale_end_date IS NULL OR cp.sale_end_date >= date('now'))

UNION ALL

-- Items with significant recent price drops (>15% in 7 days)
SELECT ci.name, ci.category, cp.price_cents, cp.price_unit,
       sr.name AS store, NULL AS sale_start_date, NULL AS sale_end_date
FROM current_prices cp
JOIN canonical_ingredients ci ON cp.canonical_ingredient_id = ci.id
JOIN source_registry sr ON cp.source_id = sr.source_id
JOIN price_changes pc ON pc.canonical_ingredient_id = cp.canonical_ingredient_id
  AND pc.source_id = cp.source_id
WHERE pc.observed_at >= date('now', '-7 days')
  AND pc.change_pct <= -15.0
ORDER BY category, name
```

If `stores` query param is provided, filter by display name: `AND sr.name IN (...)`. This matches `chef_preferred_stores.store_name` on the ChefFlow side.

**Response shape:**

```json
{
  "sales": [
    {
      "ingredient": "Chicken Breast Boneless Skinless",
      "canonical_id": "chicken-breast-boneless-skinless",
      "category": "poultry",
      "price_cents": 349,
      "unit": "lb",
      "store": "Shaw's",
      "regular_price_cents": 429,
      "savings_pct": 18.6,
      "valid_through": "2026-04-02"
    }
  ],
  "count": 23,
  "as_of": "2026-03-28T10:00:00Z"
}
```

`regular_price_cents` comes from `price_changes.old_price_cents` for drop-detected items, or null for items where we only know the sale price.

### UI: Sale Calendar Tab on Costing Page

**File:** `app/(chef)/culinary/costing/sales/page.tsx`

Add a new sub-route under costing (alongside food-cost, recipe, menu):

- **Header:** "On Sale This Week" with store filter chips (chef's preferred stores pre-selected)
- **Grid:** Cards grouped by category (Produce, Proteins, Dairy, Pantry, etc.)
- Each card: ingredient name, sale price, savings %, store, "valid through [date]" if known
- **"Browse your recipes"** link to `/culinary/recipes` (ingredient-filtered recipe search is a future enhancement; for now, link to the recipe list so chefs can browse and mentally cross-reference)
- **Empty state:** "No current sales data. Sales refresh weekly on Wednesdays."
- **Error state:** "Could not reach price database." with retry

### Nav Integration

Add "Sales" as a sub-item under Culinary > Costing in the nav, or as a tab within the costing page layout.

---

## Workstream F: Weekly Price Briefing

**Goal:** Every Monday morning, the chef's dashboard shows a price briefing summarizing the previous week's price movements for ingredients they actually use.

### F1: Weekly Briefing Server Action

**File:** `lib/openclaw/weekly-briefing-actions.ts`

**Action: `getWeeklyPriceBriefing()`**

- **Auth:** `requireChef()`
- **Input:** none
- **Output:** `WeeklyBriefing`

```typescript
interface WeeklyBriefing {
  weekOf: string // "March 24-28, 2026"
  headline: string // "Your ingredient costs dropped 3% overall this week"
  totalBasketCents: number // cost of all chef's ingredients at best prices
  basketChangePct: number // week-over-week change
  biggestDrops: PriceMove[] // top 5 drops
  biggestSpikes: PriceMove[] // top 5 spikes
  bestStoreThisWeek: string // which store had most wins
  newPricesAdded: number // items that got first-ever price this week
  coveragePct: number // % of chef's ingredients with current prices
  seasonalNote: string | null // DEFERRED: always return null for initial implementation. Seasonal detection requires 3+ months of accumulated price data. Future enhancement: compare current month's avg price to prior months; if an ingredient dropped >20% vs 2-month avg, flag as "entering peak season"
}

interface PriceMove {
  ingredient: string
  oldCents: number
  newCents: number
  changePct: number
  store: string
  direction: 'up' | 'down'
}
```

**Logic:**

1. Get all ingredient IDs from chef's recipes via `recipe_ingredients` JOIN `ingredients` (see Decision 11: `resolvePricesBatch` takes IDs, not names)
2. Get ingredient names from the same query for display purposes
3. Call Pi's `/api/prices/cost-impact` with 7-day lookback (using ingredient names for the Pi API)
4. Call Pi's `/api/stats/category-coverage` for coverage numbers (same endpoint extended in B5)
5. Compute current basket total using `resolvePricesBatch(ingredientIds, tenantId)`
6. Compute previous week's basket from `ingredient_price_history`:

```sql
SELECT ingredient_id, price_per_unit_cents, unit
FROM ingredient_price_history
WHERE tenant_id = $1
  AND ingredient_id = ANY($2)
  AND purchase_date BETWEEN (CURRENT_DATE - INTERVAL '14 days') AND (CURRENT_DATE - INTERVAL '7 days')
ORDER BY ingredient_id, purchase_date DESC
```

Deduplicate by ingredient_id (take most recent per ingredient). Sum for last week's basket total. If fewer than 50% of ingredients have history from last week, set `basketChangePct` to null and show "Not enough history for week-over-week comparison yet."

1. Generate headline string deterministically (no AI):
   - If basket down: "Your ingredient costs dropped X% this week"
   - If basket up: "Ingredient costs up X% this week, driven by [top spike ingredient]"
   - If flat: "Prices stable this week"
   - If insufficient history: "Your ingredients cost $X.XX total this week"

### UI: Dashboard Briefing Card

**File:** `components/pricing/weekly-briefing-card.tsx`

Renders on the dashboard (in the intelligence or business section) on Monday through Wednesday. After Wednesday, it fades to a "View last briefing" link.

**Layout:**

- Headline in bold
- Basket total with change arrow
- Top 3 drops (green) and top 3 spikes (red) with ingredient name, price, store
- "Best store this week: [store]"
- Coverage progress bar

---

## Workstream G: Menu Cost Forecasting

**Goal:** When a chef is building a menu for a future event, show projected cost based on price trends.

### G1: Cost Forecast Server Action

**File:** `lib/openclaw/cost-forecast-actions.ts`

**Action: `forecastMenuCost(menuId, eventDate)`**

- **Auth:** `requireChef()`
- **Input:** `{ menuId: string, eventDate: string }`
- **Output:** `CostForecast`

```typescript
interface CostForecast {
  currentCostCents: number // what it would cost today
  forecastCostCents: number // projected cost on event date
  changePct: number
  daysOut: number
  confidence: 'high' | 'medium' | 'low' // based on trend data coverage
  ingredientForecasts: IngredientForecast[]
  caveat: string | null // "Based on 14 days of trend data. Accuracy improves over time."
}

interface IngredientForecast {
  name: string
  currentCents: number
  forecastCents: number
  trendDirection: 'up' | 'down' | 'flat' | 'unknown'
  trendPct7d: number | null
}
```

**Logic (deterministic, no AI):**

1. Get all ingredients for the menu (via recipe joins, collect IDs per Decision 11)
2. Resolve current prices with `resolvePricesBatch()`
3. For each ingredient with `price_trend_pct` data, extrapolate linearly:
   - `forecastCents = currentCents * (1 + (trendPct7d / 100) * (daysOut / 7))`
   - Cap extrapolation at +/- 30% (trends don't continue forever)
4. Sum for total forecast
5. Confidence:
   - `high`: >80% of ingredients have trend data, event < 14 days out
   - `medium`: >50% trend data OR event 14-30 days out
   - `low`: <50% trend data OR event >30 days out

### UI Integration

**File to modify:** `components/events/event-detail-client.tsx` or the menu section within event detail

Add a small forecast badge next to the menu cost:

```text
Menu Cost: $847.00 today
Forecast for June 15: ~$872.00 (+3%)  [i]
```

The `[i]` tooltip explains: "Based on current price trends for 18 of 22 ingredients. Actual cost may vary."

Only show when event date is in the future and trend data exists. Hide when event date has passed.

---

## Workstream H: Vendor Price List Import

**Goal:** Admin can upload a PDF price list from a farm, fish market, or specialty supplier, and the Pi parses it into prices.

This is the simplified version of the email outreach system. No automated email. Just manual upload and parse.

### Pi Endpoint (new)

**File:** `.openclaw-build/services/sync-api.mjs` (add endpoint)

`POST /api/vendor/import`

```json
Request (multipart/form-data):
  file: <PDF binary>
  vendor_name: "Portland Fish Exchange"
  vendor_type: "fish_market"
  pricing_tier: "wholesale"

Response:
{
  "parsed_items": 47,
  "matched_to_catalog": 31,
  "new_catalog_entries": 8,
  "unmatched": 8,
  "items": [
    {
      "raw_name": "Fresh Atlantic Salmon Fillet",
      "canonical_id": "salmon-atlantic-fillet",
      "price_cents": 1299,
      "unit": "lb",
      "confidence": "direct_scrape",
      "matched": true
    }
  ]
}
```

**This endpoint does NOT exist yet.** Builder must add it to `.openclaw-build/services/sync-api.mjs`, SCP to Pi, and restart sync-api before building the ChefFlow admin UI.

**Prerequisites on Pi:** `pdftotext` must be installed. Check: `ssh pi "which pdftotext"`. If missing: `ssh pi "sudo apt install -y poppler-utils"`.

**Processing pipeline on Pi (implement in the endpoint handler):**

1. Receive multipart upload, save PDF to temp file
2. Extract text: `const { execFileSync } = require('child_process'); const text = execFileSync('pdftotext', ['-layout', tmpPath, '-']).toString()` (use `execFileSync` with array args to prevent shell injection)
3. Parse line items with regex: look for patterns like `product_name ... $X.XX` or `product_name\t$X.XX`
   - Regex: `/^(.+?)\s{2,}\$?(\d+\.\d{2})\s*\/?\s*(lb|oz|each|dz|gal|qt|pt|bunch|ct)?/gm`
   - Each match produces: `{ raw_name, price_cents: Math.round(parseFloat(match[2]) * 100), unit: match[3] || 'each' }`
4. Match each `raw_name` to canonical ingredients via existing `smartLookup(db, raw_name)` from `lib/smart-lookup.mjs`
5. For matched items: first register the vendor in `source_registry` if not already present (slugify vendor_name for `source_id`, e.g., `"Portland Fish Exchange"` becomes `"portland-fish-exchange"`, set `type: vendor_type`). Then upsert to `current_prices` with the slugified `source_id`, `pricing_tier` from request, `confidence: 'direct_scrape'`
6. Return parsed results for admin review (do NOT auto-import unmatched items without admin confirmation)

### ChefFlow Server Actions

**File:** `lib/openclaw/vendor-import-actions.ts`

**Action 1: `parseVendorPriceList(formData)`**

- **Auth:** `requireAdmin()`
- **Input:** `FormData` with fields:
  - `file`: PDF file (max 10MB)
  - `vendor_name`: string
  - `vendor_type`: `'farm' | 'fish_market' | 'butcher' | 'specialty' | 'wholesale'`
  - `pricing_tier`: `'retail' | 'wholesale' | 'farm_direct'`
- **Output:** `{ success: boolean, parsed_items: number, matched: number, unmatched: number, items: ParsedVendorItem[], error?: string }`
- **Side Effects:** None (parse only, no persistence)

**Action 2: `confirmVendorImport(payload)`**

- **Auth:** `requireAdmin()`
- **Input:** `{ vendor_name: string, vendor_source_id: string, items: { canonical_id: string, raw_name: string, price_cents: number, unit: string }[] }`
- **Output:** `{ success: boolean, imported: number, error?: string }`
- **Side Effects:** Calls Pi's `POST /api/vendor/confirm` to upsert confirmed items into `current_prices`. Revalidates `/admin/price-catalog`.

```typescript
interface ParsedVendorItem {
  raw_name: string
  canonical_id: string | null // null if unmatched
  canonical_name: string | null
  price_cents: number
  unit: string
  matched: boolean
  confidence: number
}
```

`parseVendorPriceList()` proxies the PDF to Pi's `POST /api/vendor/import` and returns parsed results for admin review. `confirmVendorImport()` sends the admin-reviewed items back to Pi for persistence. These are two separate actions because the admin must review and correct matches between parse and confirm.

**Pi confirmation endpoint (MUST ALSO BE BUILT):** `POST /api/vendor/confirm` - accepts the confirmed items array and upserts to `current_prices`. Add this alongside `POST /api/vendor/import` in `.openclaw-build/services/sync-api.mjs`.

### ChefFlow Admin UI

**File:** `app/(admin)/admin/price-catalog/vendor-import-tab.tsx`

Add a 7th tab to the admin price catalog: "Vendor Import". The admin catalog currently has 6 tabs: overview, prices, sources, changes, sync, catalog.

- File upload dropzone (PDF only, max 10MB)
- Vendor name text input
- Vendor type dropdown (farm, fish market, butcher, specialty supplier, wholesale distributor)
- Pricing tier dropdown (retail, wholesale, farm direct)
- "Parse" button calls `parseVendorPriceList()` server action
- Results table: raw name, matched canonical, price, unit, confidence
- Admin can correct matches (reassign canonical_id or dismiss unmatched items)
- "Confirm Import" button calls `confirmVendorImport()` with the reviewed items

### H3: Vendor Import UI States

- **Idle:** Upload form with instructions
- **Parsing:** Progress spinner, "Processing PDF..."
- **Results:** Table with parsed items, match status, edit capability
- **Error (Pi offline):** "Cannot reach OpenClaw Pi. Ensure Pi is online."
- **Error (bad PDF):** "Could not extract text from this PDF. Try a clearer scan."

---

## Database Changes

**None.** This spec requires no new migrations. The `chef_preferred_stores` table already exists (migration `20260401000035`). All new data flows through existing tables (`chef_preferred_stores`, `ingredients`, `ingredient_price_history`) or lives on the Pi's SQLite database.

---

## Files to Create

| File                                                    | Purpose                                                                    | WS  |
| ------------------------------------------------------- | -------------------------------------------------------------------------- | --- |
| `lib/openclaw/store-preference-actions.ts`              | Thin wrappers: `getAvailableOpenClawStores()`, `getMyPrimaryStoreName()`   | C   |
| `app/(chef)/settings/store-preferences/page.tsx`        | Store selection UI: renders existing `StoreManager` + OpenClaw suggestions | C   |
| `lib/openclaw/sale-calendar-actions.ts`                 | Current sales data from Pi                                                 | E   |
| `app/(chef)/culinary/costing/sales/page.tsx`            | "On Sale This Week" page                                                   | E   |
| `lib/openclaw/weekly-briefing-actions.ts`               | Weekly price briefing computation                                          | F   |
| `components/pricing/weekly-briefing-card.tsx`           | Dashboard briefing card                                                    | F   |
| `lib/openclaw/cost-forecast-actions.ts`                 | Menu cost forecasting                                                      | G   |
| `app/(admin)/admin/price-catalog/vendor-import-tab.tsx` | Vendor PDF import UI                                                       | H   |
| `lib/openclaw/vendor-import-actions.ts`                 | `parseVendorPriceList()` + `confirmVendorImport()` server actions          | H   |

---

## Files to Modify

**Workstream A:**

- `.openclaw-build/services/watchdog.mjs` - Add sync-api health check with systemd restart

**Workstream B:**

- `.openclaw-build/services/sync-api.mjs` - Extend `GET /api/stats/category-coverage` with totals

**Workstream C:**

- `lib/pricing/resolve-price.ts` - Activate unused `_options.preferredStore` param: prefer chef's primary store when multiple prices exist at same tier
- `components/pricing/price-attribution.tsx` - Use preferred store price when available
- `components/pricing/event-shopping-planner.tsx` - Default single-store to chef's primary store
- `components/pricing/store-scorecard.tsx` - Highlight chef's preferred stores
- `app/(chef)/settings/page.tsx` - Add link to store preferences

**Workstream D:**

- `lib/openclaw/price-intelligence-actions.ts` - Add `getPriceIntelligenceSummary()` function (file already exists with 8 functions, 349 lines)
- `app/(chef)/dashboard/_sections/alerts-cards.tsx` - Consolidate 3 price cards (lines 236-283) into unified Price Intelligence card
- `lib/ai/command-task-descriptions.ts` - Add `price.check` tool definition to `TASK_DESCRIPTIONS` array (Vendor Intelligence section)
- `lib/ai/command-intent-parser.ts` - Add `price.check` intent classification for natural language like "how much is X?"
- `lib/ai/command-orchestrator.ts` - Add `case 'price.check':` handler in main switch (near line ~1650) calling `executePriceCheck()`

**Workstream E:**

- `.openclaw-build/services/sync-api.mjs` - Add `GET /api/sales/current` endpoint
- `components/navigation/nav-config.tsx` - Add "Sales" nav entry under Culinary > Costing

**Workstream F:**

- `app/(chef)/dashboard/page.tsx` - Add weekly briefing card (Monday-Wednesday)

**Workstream G:**

- `components/events/event-detail-client.tsx` - Add cost forecast badge next to menu cost

**Workstream H:**

- `.openclaw-build/services/sync-api.mjs` - Add `POST /api/vendor/import` and `POST /api/vendor/confirm` endpoints
- `app/(admin)/admin/price-catalog/price-catalog-client.tsx` - Add 7th "Vendor Import" tab (existing tabs: overview, prices, sources, changes, sync, catalog)

**All:**

- `docs/app-complete-audit.md` - Update with all new pages, tabs, components

---

## Server Actions (Complete List)

All server actions follow the standard checklist: auth first, tenant-scoped queries, input validation, error propagation, cache busting.

**Workstream C** (`store-preference-actions.ts`):

- `getAvailableOpenClawStores()` - `requireChef()` - read-only
- `getMyPrimaryStoreName()` - `requireChef()` - read-only

**Workstream D** (`price-intelligence-actions.ts`, existing file):

- `getPriceIntelligenceSummary()` - `requireChef()` - read-only

**Workstream E** (`sale-calendar-actions.ts`):

- `getCurrentSales(stores?)` - `requireChef()` - read-only
- `getSalesByCategory(category, stores?)` - `requireChef()` - read-only

**Workstream F** (`weekly-briefing-actions.ts`):

- `getWeeklyPriceBriefing()` - `requireChef()` - read-only

**Workstream G** (`cost-forecast-actions.ts`):

- `forecastMenuCost(menuId, eventDate)` - `requireChef()` - read-only

**Workstream H** (`vendor-import-actions.ts`):

- `parseVendorPriceList(formData)` - `requireAdmin()` - read-only (proxies to Pi, no ChefFlow mutation)
- `confirmVendorImport(payload)` - `requireAdmin()` - mutating (writes to Pi via `POST /api/vendor/confirm`)

### Cache Invalidation for Mutating Actions

**`confirmVendorImport()`:**

- Mutates: Pi's `current_prices` (via Pi API)
- Bust: `revalidatePath('/admin/price-catalog')`, `revalidateTag('pi-data')`

**Store preference changes** (via existing `addPreferredStore`, `setDefaultStore` in `lib/grocery/store-shopping-actions.ts`):

- Mutates: `chef_preferred_stores`
- Bust: `revalidatePath('/culinary/costing')`, `revalidatePath('/culinary/recipes')`, `revalidateTag('pi-data')` (resolved prices change when store preference changes)

All other actions in this spec are read-only and do not need cache busting.

---

## Edge Cases and Error Handling

**Pi connectivity:**

- **Pi offline (any workstream):** Show "Price data temporarily unavailable" with retry button. Never block page rendering. Never show empty results as "no data" (Decision 9).
- **Pi slow (scraper running, heavy I/O):** All Pi fetches use 5-second AbortController timeout (Decision 9). Timeout treated same as offline.
- **Multiple chefs load dashboard simultaneously:** Pi responses cached via `unstable_cache` with 5-minute TTL (Decision 10). Most dashboard loads don't hit Pi directly.

**Store preferences (C):**

- **Chef has no preferred stores:** All features work with "any store" mode (current behavior). Prompt on first costing page visit: "Select your stores for personalized pricing."
- **Chef's primary store has no price for an ingredient:** Fall through to other preferred stores, then any store. PriceAttribution shows whichever store had the price.

**Price intelligence (D, F):**

- **Weekly briefing on a week with no price changes:** Show "Prices stable this week. No significant changes for your ingredients."
- **Weekly briefing has insufficient history for basket comparison:** Show current basket total only. Set `basketChangePct` to null. Display "Not enough history for week-over-week comparison yet."
- **`seasonalNote` field:** Always return null for initial implementation. Seasonal detection deferred until 3+ months of data accumulated.

**Forecasting (G):**

- **No trend data for forecast (new system):** Show current cost only. Hide forecast badge. Show tooltip: "Cost forecasting available after 2+ weeks of price data."
- **Menu has ingredients with zero price data:** Forecast shows current cost as "incomplete" with count of unpriced items. Does not guess.

**Vendor import (H):**

- **Vendor PDF is scanned/image-based:** `pdftotext` cannot extract text. Return error: "This PDF appears to be a scanned image. Please upload a digital PDF or type the prices manually."
- **Vendor PDF has no recognizable prices:** Return `parsed_items: 0` with message: "No price patterns found in this document."

**Scrapers (B):**

- **Scraper activated but returns 0 results:** Watchdog logs warning. Does not corrupt existing data. Next run retries. After 3 consecutive zeros, marks source as needs_attention.

---

## Build Order

**Workstreams have dependencies.** The sequence below is mandatory, not a suggestion:

1. **A (Pi Hardening)** - 1 hour. SSH commands only. No code. Must come first so Pi is reliable for everything else.
2. **B (Coverage Expansion)** - 1-2 hours. SSH commands + minor Pi code. Depends on A (Pi must be stable). More data makes everything else better. B5 (coverage endpoint extension) must be done before F.
3. **C (Store Preferences)** - Half day. No migration (table exists). Thin wrappers + resolve-price.ts activation + UI integration. Should precede D-G because store preference integration affects all price displays.
4. **D (Proactive Intelligence)** - Half day. Dashboard enhancement + Remy tool (3 files in command pipeline).
5. **E (Sale Calendar)** - Half day. Requires building Pi endpoint (`GET /api/sales/current`) first, then ChefFlow page.
6. **F (Weekly Briefing)** - Half day. Server action + dashboard card. Depends on B5 (coverage endpoint).
7. **G (Menu Cost Forecast)** - 2-3 hours. Server action + small UI addition.
8. **H (Vendor Import)** - Half day. Requires building two Pi endpoints (`POST /api/vendor/import` + `POST /api/vendor/confirm`) first, then ChefFlow admin tab.

**A and B are Pi-side operations (SSH).** C through H are ChefFlow code changes. A builder agent can do A+B in one session, then C-H in subsequent sessions.

---

## Verification Steps

### Workstream A (Pi Hardening)

1. `ssh pi "sudo systemctl status openclaw-sync-api"` - shows active/running
2. `ssh pi "sudo reboot"` - wait 90 seconds - `curl http://10.0.0.177:8081/health` returns 200
3. `ssh pi "ls -la ~/openclaw-prices/backups/"` - shows recent backup files

### Workstream B (Coverage Expansion)

1. `ssh pi "crontab -l"` - shows all expected cron entries
2. After 48 hours: `ssh pi "node scripts/check-stats.mjs"` - price count higher than before
3. `ssh pi "tail -20 logs/scraper-instacart.log"` - shows successful scrape output

### Workstream C (Store Preferences)

1. Sign in with agent account
2. Navigate to `/settings/store-preferences` - verify page renders `StoreManager` component
3. Add preferred stores (verify Pi's tracked stores appear as suggestions)
4. Set one as default via `setDefaultStore()`
5. Navigate to `/culinary/costing` - verify prices show preferred store attribution
6. Navigate to a recipe - verify ingredient prices reflect store preference
7. Verify `resolvePrice()` returns the default store's price when available (not just cheapest)

### Workstream D (Proactive Intelligence)

1. Navigate to dashboard
2. Verify Price Intelligence card shows drops, spikes, freshness (unified, not 3 separate cards)
3. Open Remy, ask "how much is chicken breast right now?" - verify real price response with store attribution
4. Verify Pi offline gracefully shows "Price data temporarily unavailable"

### Workstream E (Sale Calendar)

1. Verify Pi endpoint first: `curl http://10.0.0.177:8081/api/sales/current` returns JSON
2. Navigate to `/culinary/costing/sales`
3. Verify sale items display grouped by category
4. Filter by store - verify results change
5. Verify empty state when no sales data

### Workstream F (Weekly Briefing)

1. Navigate to dashboard on a Monday
2. Verify weekly briefing card appears with headline, drops, spikes, basket total
3. Verify card content is personalized to chef's actual ingredients
4. Navigate on a Thursday - verify card shows "View last briefing" link instead

### Workstream G (Menu Cost Forecast)

1. Navigate to an event with a future date and a menu
2. Verify forecast badge appears next to menu cost
3. Verify tooltip explains the forecast basis
4. Navigate to a past event - verify no forecast badge
5. Navigate to an event with no trend data - verify forecast badge is hidden

### Workstream H (Vendor Import)

1. Verify Pi endpoints first: `curl -X POST http://10.0.0.177:8081/api/vendor/import` returns expected error (no file)
2. Sign in as admin
3. Navigate to `/admin/price-catalog`, click "Vendor Import" tab (7th tab)
4. Upload a sample PDF price list
5. Verify parsed items display with match status
6. Correct a match, then click "Confirm Import"
7. Verify confirmed prices appear in Pi database

---

## Out of Scope

- **Automated email outreach to vendors** - separate spec, requires dedicated email domain and permission system
- **Location-aware pricing** (different prices for Boston vs Springfield chefs) - separate spec
- **Seasonal price prediction models** - needs 3+ months of data accumulation first
- **Mobile receipt camera capture** - receipt scanning exists via upload; native camera integration is a PWA feature
- **Price comparison with competitor platforms** (Meez, ChefTec pricing) - not relevant
- **Changing the nightly sync schedule** - 11 PM works, no reason to change
- **Modifying existing scraper logic** - scrapers work; this spec activates them, not rewrites them
- **Cloud normalization (Claude Haiku for product names)** - blocked on developer approval per v2-unified spec Phase 5
- **Public-facing price data** - all pricing is chef-only or admin-only, never public

---

## Notes for Builder Agent

- **Pi SSH alias:** `ssh pi` is configured in `~/.ssh/config`. User: `davidferra`. All Pi paths are relative to `~/openclaw-prices/`.
- **Pi code edits:** Edit in `.openclaw-build/`, then `scp` to Pi. Never edit directly on Pi.
- **Never restart the dev server** without developer permission (CLAUDE.md rule).
- **Never restart Pi services** without developer permission, except via systemd (which auto-restarts).
- **Migration timestamp:** Run `glob database/migrations/*.sql` before creating migration. Pick timestamp strictly higher than the highest existing one.
- **Store names must match exactly** between Pi's `source_registry.name` (JOINed from `current_prices.source_id`) and ChefFlow's `chef_preferred_stores.store_name`. Get the canonical list from Pi's `GET /api/sources`.
- **Formula > AI everywhere.** Weekly briefing headline is a conditional string, not an LLM call. Forecast is linear extrapolation, not a prediction model. Sale detection is a price comparison, not sentiment analysis.
- **No em dashes.** Use commas, semicolons, parentheses, or separate sentences.
- **Test with agent account** after building. Verify in the real UI. Don't tell the developer to check.
- **The Pi's Flipp scraper just started automated runs on 2026-03-28.** Coverage data will be sparse initially. All UI must handle "no data" gracefully.
- **Workstreams A and B are SSH operations.** The builder agent has bash access and can SSH to the Pi. These don't require ChefFlow code changes.
- **The `resolve-price.ts` modification (Workstream C) is the most sensitive change.** It affects every price display in the app. Test thoroughly with ingredients that have multiple store prices.
- **Remy tool addition (Workstream D) spans 3 files, NOT `remy-actions.ts`.** Read `lib/ai/command-task-descriptions.ts`, `lib/ai/command-intent-parser.ts`, and `lib/ai/command-orchestrator.ts` to understand the tool registration pipeline. Add `price.check` to all three. `remy-actions.ts` delegates to the orchestrator and does not need changes.
- **`resolvePricesBatch()` takes ingredient UUIDs, not names.** Any code that starts with ingredient names (Remy's `price.check` handler, weekly briefing) must query `ingredients` table for IDs first. See Decision 11.
- **Pi SQLite schema verification (Workstreams E and H):** Before writing the Sale Calendar or Vendor Import Pi endpoints, verify schema: `ssh pi "sqlite3 ~/openclaw-prices/data/prices.db '.schema current_prices'"` and `ssh pi "sqlite3 ~/openclaw-prices/data/prices.db '.schema price_changes'"`. Adjust SQL if column names differ from what this spec assumes (`price_type`, `sale_start_date`, `sale_end_date`, `observed_at`, `change_pct`).
- **All Pi HTTP calls must use the `fetchPi()` wrapper** defined in Decision 9. This ensures 5-second timeouts and graceful offline handling across all workstreams. Never call `fetch()` directly to `10.0.0.177:8081`.
- **`price-intelligence-actions.ts` already exists** (349 lines, 8 functions). Add `getPriceIntelligenceSummary()` to it. Do NOT create a new file.
- **`vendor-import-actions.ts` needs TWO server actions:** `parseVendorPriceList()` (proxies PDF to Pi for parsing) and `confirmVendorImport()` (sends admin-reviewed items back to Pi for persistence). These are separate because the admin must review matches between parse and confirm.
- **Vendor import (Workstream H)** depends on `pdftotext` being installed on the Pi. Check: `ssh pi "which pdftotext"`. If missing: `ssh pi "sudo apt install -y poppler-utils"`.
- **`seasonalNote` in weekly briefing:** Always return null for initial implementation. Do not attempt to compute seasonal patterns yet.
