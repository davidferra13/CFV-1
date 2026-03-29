# Spec: OpenClaw Total Catalog Intelligence

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none (all infrastructure exists)
> **Estimated complexity:** large (30+ files across Pi and ChefFlow)
> **Created:** 2026-03-29
> **Built by:** Claude Code session 2026-03-29

---

## What This Does (Plain English)

A chef opens ChefFlow, picks a store (Whole Foods, Market Basket, Walmart, Target, etc.), and browses that store's full catalog like walking through the aisles. Every item has a picture, a price, a unit price, availability status, and the store's logo. The chef adds items to a shopping cart, sees a running total, saves it, and knows exactly what they're paying before they leave the couch. Prices update daily. If something is unavailable, it says so. If a price changed, it shows.

This is powered by OpenClaw scrapers running daily on the Pi, capturing every product they can get their hands on (images, prices, availability, URLs) and serving it to ChefFlow through the existing sync API.

---

## Why It Matters

Chefs have no way to cost out a menu without physically going to the store or opening Instacart. This means every quote is a guess, every food cost calculation is stale, and every shopping trip has surprises. A chef who can see real, current store catalogs from their phone or laptop can price accurately, shop efficiently, and run their business on real numbers instead of memory.

---

## Connected Systems (Context for the Builder)

This spec doesn't exist in isolation. Better OpenClaw data automatically improves 20+ features across ChefFlow without any code changes to those features. The builder must understand what they're powering so they don't accidentally break these connections.

### Downstream Features That Get Better From Phase 1 Alone (No Code Changes Needed)

These all feed from the 8-tier price resolution chain (`lib/pricing/resolve-price.ts`). When OpenClaw data improves, they improve automatically:

| Feature                        | File                                                | How It Benefits                                                                                                      |
| ------------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Menu food cost calculation** | `lib/menus/menu-intelligence-actions.ts`            | Fewer "missing price" flags, more accurate food cost % for menu approval                                             |
| **Recipe cost propagation**    | `lib/pricing/cost-refresh-actions.ts`               | Nightly sync triggers automatic recipe cost recalculation. More ingredients matched = more recipes accurately costed |
| **Event cost forecasting**     | `lib/openclaw/cost-forecast-actions.ts`             | Uses 7-day price trends to project costs to event date. Better trend data = better projections                       |
| **Weekly price briefing**      | `lib/openclaw/weekly-briefing-actions.ts`           | Multi-store spikes/drops instead of limited single-source insights                                                   |
| **Costing coverage %**         | `app/(chef)/culinary/costing/page.tsx`              | Coverage improves as more ingredients auto-match to OpenClaw data                                                    |
| **Shopping optimizer**         | `components/pricing/shopping-optimizer.tsx`         | Pi uses OpenClaw data internally. Better data = better store recommendations                                         |
| **Store scorecard**            | `components/pricing/store-scorecard.tsx`            | More stores in comparison, more accurate rankings                                                                    |
| **Price anomaly detection**    | `lib/analytics/price-anomaly.ts`                    | Multi-source baselines make spike detection more reliable                                                            |
| **Event grocery quote**        | `lib/grocery/pricing-actions.ts`                    | Complements Spoonacular/Kroger API pricing with local store data                                                     |
| **Remy AI pricing commands**   | `lib/ai/command-orchestrator.ts`                    | "What's cheapest for tomatoes?" becomes accurate with local store data                                               |
| **Pricing suggestion panel**   | `components/analytics/pricing-suggestion-panel.tsx` | Food cost estimates improve, so quote recommendations get smarter                                                    |
| **Dashboard food cost cards**  | `app/(chef)/dashboard/_sections/business-cards.tsx` | Plate cost estimates become more accurate                                                                            |
| **Grocery list generation**    | `lib/documents/generate-grocery-list.ts`            | "Expected cost per item" becomes current, not stale                                                                  |
| **Menu engineering**           | `lib/menus/menu-engineering-actions.ts`             | Dish profitability analysis uses accurate ingredient costs                                                           |

**Key takeaway for the builder:** Phase 1 (scraper depth) is not just about the catalog UI. It powers the entire pricing backbone of ChefFlow. Treat data quality as the highest priority.

### Existing Grocery/Shopping Infrastructure (CRITICAL - Read Before Phase 3)

ChefFlow already has shopping list features. The new cart builder must COMPLEMENT these, not duplicate or conflict with them.

| Existing Feature               | Location                                                                   | What It Does                                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Consolidated Shopping Page** | `app/(chef)/culinary/prep/shopping/page.tsx`                               | Auto-generates ingredient requirements from planned events (14-day window). Adjusts by on-hand stock. Groups by category/supplier. CSV export      |
| **Smart Grocery Lists**        | `components/grocery/smart-list-view.tsx`                                   | Aisle-based organization (17 sections), drag-to-reorder, check items off, print mode. Uses `smart_grocery_lists` + `smart_grocery_items` DB tables |
| **Event Grocery Quote**        | `app/(chef)/events/[id]/grocery-quote/page.tsx`                            | Spoonacular + Kroger API pricing for an event's ingredients. Links to pre-filled Instacart cart                                                    |
| **Aisle Preferences**          | DB: `aisle_preferences` table (created with smart_grocery_lists migration) | Chef's preferred aisle ordering per store                                                                                                          |

**The distinction the builder must maintain:**

- **Existing smart grocery lists** = event-driven, auto-generated from planned events, organized by aisle for in-store efficiency. Purpose: "I have 3 events next week, what do I need to buy?"
- **New cart builder (this spec)** = catalog-driven, manually built by browsing store catalogs, priced at a specific store. Purpose: "I'm going to Whole Foods, let me see what they have and build my list with real prices."

These serve different workflows. A chef uses the event shopping page when prepping for booked events. A chef uses the cart builder when exploring what's available and what it costs, potentially before they even have events booked (e.g., costing out a new menu concept).

**Rules for Phase 3:**

1. Do NOT modify `smart_grocery_lists`, `smart_grocery_items`, or `aisle_preferences` tables
2. Do NOT modify `SmartListView`, `ShoppingListGenerator`, or `GroceryQuotePanel` components
3. The new `shopping_carts` + `shopping_cart_items` tables are separate and purpose-built for catalog-driven cart building
4. Future integration (v2): "Send to Smart List" button on the cart that exports items to the existing smart grocery list system. Not in this spec
5. Nav placement: the cart lives within the Price Catalog page (sidebar/bottom sheet), NOT as a separate nav entry competing with the existing Shopping List at `/culinary/prep/shopping`

---

## Architecture: Three Phases, One Job

**The job:** Let a chef see what's at their store, what it costs, and build a shopping list.

All three phases serve this single job. Phase 1 makes the data deep and fresh. Phase 2 makes it browsable and visual. Phase 3 makes it actionable.

### Phase 1: Scraper Depth + Daily Freshness (Pi-side)

Make every scraper capture 10x more products, capture images and stock status, and run daily.

### Phase 2: Visual Catalog Experience (ChefFlow-side)

Transform the catalog from a data table into a visual store browser with product cards, images, and store-first navigation.

### Phase 3: Shopping Cart Builder (ChefFlow-side)

Let chefs build a shopping cart, pick a store, see totals, and save for later.

---

## Files to Create

### Pi-Side (`.openclaw-build/`)

| File                              | Purpose                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/schedule-all.sh`         | Cron orchestrator: runs all scrapers daily at staggered times (5 AM WF, 6 AM Instacart, 7 AM Walmart, 8 AM Target, etc.)                        |
| `lib/image-cache.mjs`             | Download + cache product images on Pi. Serves via `/api/images/{hash}.jpg`. LRU eviction at 1GB cap. Fallback: return category placeholder path |
| `scripts/expand-search-terms.mjs` | Generates expanded search term lists from canonical_ingredients table (auto-grow search coverage)                                               |

### ChefFlow-Side

| File                                          | Purpose                                                                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/pricing/product-card.tsx`         | Product card: image (with fallback), price, unit price, store logo/name, stock badge, "Add to Cart" button. Compact and responsive             |
| `components/pricing/store-aisle-browser.tsx`  | Store-first catalog view: pick a store, browse by category (aisle), grid of product cards. Uses existing `searchCatalogV2()` with store filter |
| `components/pricing/shopping-cart.tsx`        | Cart sidebar: item list with quantities, per-item price, running total, store selector, save/clear actions                                     |
| `components/pricing/cart-summary-bar.tsx`     | Sticky bottom bar showing cart item count + total. Tap to expand cart sidebar                                                                  |
| `lib/openclaw/cart-actions.ts`                | Server actions: `saveCart()`, `loadCarts()`, `deleteCart()`, `updateCartItem()`, `getCartWithPrices()`                                         |
| `components/pricing/image-with-fallback.tsx`  | `<img>` wrapper: loads image URL, on error shows category-specific placeholder SVG icon. No broken images ever                                 |
| `docs/openclaw-total-catalog-intelligence.md` | Implementation doc (created post-build per CLAUDE.md rules)                                                                                    |

---

## Files to Modify

### Pi-Side

| File                                     | What to Change                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/db.mjs`                             | Add columns to `current_prices`: `image_url TEXT`, `brand TEXT`, `aisle_category TEXT`. (`source_url` already exists, use it instead of adding `product_url`.) Add to `source_registry`: `logo_url TEXT`, `store_color TEXT`, `region TEXT`. Add `migrateSchema()` step for new columns. Update `upsertPrice()` signature to accept `imageUrl`, `brand`, `aisleCat` and write them on insert/update |
| `services/scraper-wholefoodsapfresh.mjs` | Investigate and capture `image_url` from ALM product tiles (UNVERIFIED, inspect DOM first). Expand from 7 categories to all available. Increase pagination depth (currently stops too early). Ensure `sourceUrl` is populated for every item (maps to existing `source_url` column). Populate `in_stock` (1 for items found, leave null for unknown)                                                |
| `services/scraper-instacart-bulk.mjs`    | Investigate and capture `image_url` from GraphQL response (UNVERIFIED, dump response JSON first). Expand `SEARCH_TERMS` from 80 to 200+ (generate from canonical_ingredients). Capture `in_stock` from availability field. Ensure `sourceUrl` is populated as Instacart product page link                                                                                                           |
| `services/scraper-walmart.mjs`           | Investigate and capture `image_url` from `__NEXT_DATA__` JSON (UNVERIFIED, dump JSON first). Extract `in_stock` from availability flags. Expand `SEARCH_TERMS` to 150+. Ensure `sourceUrl` is populated as Walmart product page URL                                                                                                                                                                 |
| `services/scraper-target.mjs`            | Investigate and capture `image_url` from Redsky API response (UNVERIFIED, log response first). Extract `in_stock` from availability fields. Expand `GROCERY_SEARCHES` to 150+. Ensure `sourceUrl` is populated as Target product page URL                                                                                                                                                           |
| `services/scraper-hannaford.mjs`         | Add image and stock capture where available. Expand search terms                                                                                                                                                                                                                                                                                                                                    |
| `services/scraper-stopsandshop.mjs`      | Add image and stock capture where available. Expand search terms                                                                                                                                                                                                                                                                                                                                    |
| `services/scraper-flipp.mjs`             | Capture flyer images (Flipp API returns them). Map to canonical ingredients                                                                                                                                                                                                                                                                                                                         |
| `services/sync-api.mjs`                  | Add `image_url`, `source_url`, `brand`, `in_stock`, `aisle_category` to all price response shapes (`/api/prices`, `/api/prices/enriched`, `/api/ingredients`, `/api/ingredients/detail/{id}`). Currently these endpoints only return name/price/unit/store fields. The columns exist (or will after migration) but the SELECT queries and response mappings don't include them                      |
| `services/watchdog.mjs`                  | Tighten staleness thresholds: all retail sources to 26 hours (currently 48h). Add image cache size monitoring                                                                                                                                                                                                                                                                                       |
| `lib/scrape-utils.mjs`                   | Add `downloadImage(url, destPath)` utility for image caching. Add image URL validation helper                                                                                                                                                                                                                                                                                                       |

### ChefFlow-Side

| File                                                    | What to Change                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/openclaw/catalog-actions.ts`                       | Update `CatalogItemV2` type to include `image_url`, `source_url`, `brand`, `in_stock`. Pass through from Pi API responses. Update `CatalogDetailPrice` to include `image_url`, `source_url`, `in_stock` per store. Note: `CatalogItemV2` already has `hasSourceUrl` boolean; change to pass the actual URL string |
| `app/(chef)/culinary/price-catalog/catalog-browser.tsx` | Add view toggle: "Table" (existing) / "Grid" (new product cards) / "Store Aisle" (new). Grid view renders `ProductCard` components. Store Aisle view renders `StoreAisleBrowser`. Preserve all existing functionality (filters, infinite scroll, URL sync, expanded rows)                                         |
| `app/(chef)/culinary/price-catalog/page.tsx`            | Update subtitle to reflect actual catalog size dynamically                                                                                                                                                                                                                                                        |
| `components/pricing/stock-badge.tsx`                    | Already exists. Now receives real `in_stock` data instead of always "unknown". Add "Available" label (not "In Stock") per honesty rule                                                                                                                                                                            |
| `components/pricing/freshness-dot.tsx`                  | No changes needed, already handles all freshness states                                                                                                                                                                                                                                                           |
| `components/pricing/price-badge.tsx`                    | No changes needed, already handles all price display states                                                                                                                                                                                                                                                       |

---

## Database Changes

### Pi-Side (SQLite - `lib/db.mjs` migrateSchema)

```sql
-- These run as ALTER TABLE in migrateSchema() function
-- SQLite doesn't support IF NOT EXISTS for columns, so check pragma table_info first

ALTER TABLE current_prices ADD COLUMN image_url TEXT;
-- NOTE: source_url already exists on current_prices. Do NOT add product_url.
-- Use source_url for product links. Just ensure scrapers populate it.
ALTER TABLE current_prices ADD COLUMN brand TEXT;
ALTER TABLE current_prices ADD COLUMN aisle_category TEXT;

ALTER TABLE source_registry ADD COLUMN logo_url TEXT;
ALTER TABLE source_registry ADD COLUMN store_color TEXT;
ALTER TABLE source_registry ADD COLUMN region TEXT;
-- region values: 'haverhill-ma', 'portland-me', etc.
-- source_registry already has city and state columns, but region is a grouping key
```

### ChefFlow-Side (PostgreSQL Migration)

```sql
-- Shopping cart tables for chef cart builder
-- Check existing migrations for highest timestamp before creating file

CREATE TABLE shopping_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Shopping List',
  store_filter TEXT,  -- optional: lock cart to one store (source_id)
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopping_carts_tenant ON shopping_carts(tenant_id);

CREATE TABLE shopping_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,        -- display name
  canonical_ingredient_id TEXT,          -- OpenClaw canonical ID (nullable if manual entry)
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'each',     -- lb, oz, each, etc.
  price_cents INTEGER,                   -- price at time of add (snapshot)
  price_source TEXT,                     -- store name where price came from
  image_url TEXT,                        -- cached image URL
  checked_off BOOLEAN NOT NULL DEFAULT false,  -- for in-store use
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cart_items_cart ON shopping_cart_items(cart_id);
CREATE INDEX idx_cart_items_tenant ON shopping_cart_items(tenant_id);
```

### Migration Notes

- Check `database/migrations/` for highest timestamp before creating file
- All additive (CREATE TABLE only, no modifications to existing tables)
- `tenant_id` on both tables for tenant scoping (CLAUDE.md rule)
- `price_cents` on cart items is a snapshot at add-time (cart shows what price was when you added it; refreshable via "Update Prices" action)
- `checked_off` enables in-store use (check items off as you shop)

---

## Data Model

### Product Card Data (from Pi API)

```typescript
interface CatalogProduct {
  ingredient_id: string // canonical ID
  name: string // normalized name
  category: string // produce, dairy, meat, etc.
  brand: string | null // original brand (stripped for matching, kept for display)
  image_url: string | null // product image URL (Pi-cached or direct)
  source_url: string | null // link back to store page (existing column, not new)
  in_stock: boolean | null // true/false/null (null = unknown)
  aisle_category: string | null // store-specific department
  prices: StorePrice[] // all stores carrying this item
  best_price: StorePrice | null // cheapest option
  trend: { direction: 'up' | 'down' | 'flat'; change_7d_pct: number } | null
}

interface StorePrice {
  source_id: string // e.g., 'whole-foods-haverhill-ma'
  store_name: string // e.g., 'Whole Foods'
  store_location: string // e.g., 'Haverhill, MA'
  price_cents: number
  price_unit: string // lb, oz, each
  price_per_standard_unit_cents: number
  standard_unit: string
  image_url: string | null // store-specific image
  source_url: string | null
  in_stock: boolean | null
  confidence: string // government_baseline, flyer_scrape, direct_scrape
  last_confirmed_at: string // ISO timestamp
  price_type: string // regular, sale
}
```

### Shopping Cart Data

```typescript
interface ShoppingCart {
  id: string
  tenant_id: string
  name: string
  store_filter: string | null
  notes: string | null
  items: ShoppingCartItem[]
  total_cents: number // computed from items
  created_at: string
  updated_at: string
}

interface ShoppingCartItem {
  id: string
  ingredient_name: string
  canonical_ingredient_id: string | null
  quantity: number
  unit: string
  price_cents: number | null
  price_source: string | null
  image_url: string | null
  checked_off: boolean
  sort_order: number
}
```

---

## Server Actions

### New Actions (`lib/openclaw/cart-actions.ts`)

| Action                      | Auth            | Input                                                                                                                                                            | Output                                                          | Side Effects                                                              |
| --------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `createCart(input)`         | `requireChef()` | `{ name: string, store_filter?: string }`                                                                                                                        | `{ success: boolean, cart?: ShoppingCart, error?: string }`     | None                                                                      |
| `getCarts()`                | `requireChef()` | None                                                                                                                                                             | `ShoppingCart[]` (without items, for list view)                 | None                                                                      |
| `getCartWithItems(cartId)`  | `requireChef()` | `{ cartId: string }`                                                                                                                                             | `ShoppingCart` (with items + current prices)                    | None                                                                      |
| `addToCart(input)`          | `requireChef()` | `{ cartId: string, ingredientName: string, canonicalId?: string, quantity: number, unit: string, priceCents?: number, priceSource?: string, imageUrl?: string }` | `{ success: boolean, item?: ShoppingCartItem, error?: string }` | None                                                                      |
| `updateCartItem(input)`     | `requireChef()` | `{ itemId: string, quantity?: number, checked_off?: boolean, sort_order?: number }`                                                                              | `{ success: boolean, error?: string }`                          | None                                                                      |
| `removeCartItem(itemId)`    | `requireChef()` | `{ itemId: string }`                                                                                                                                             | `{ success: boolean, error?: string }`                          | None                                                                      |
| `deleteCart(cartId)`        | `requireChef()` | `{ cartId: string }`                                                                                                                                             | `{ success: boolean, error?: string }`                          | None                                                                      |
| `refreshCartPrices(cartId)` | `requireChef()` | `{ cartId: string }`                                                                                                                                             | `{ success: boolean, updated: number, error?: string }`         | Updates `price_cents` and `price_source` on all items with latest Pi data |

All cart actions scope queries with `tenant_id = user.tenantId!` (CLAUDE.md rule). All mutations return `{ success, error? }` (server action quality checklist). All wrapped in try/catch with proper error propagation.

### Modified Actions (`lib/openclaw/catalog-actions.ts`)

| Action               | Change                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `searchCatalogV2()`  | Return `image_url`, `source_url`, `brand`, `in_stock` in results (currently returns `hasSourceUrl` boolean and stock counts but not the actual URLs or image) |
| `getCatalogDetail()` | Return `image_url`, `source_url`, `in_stock` per store price                                                                                                  |
| `getCatalogStores()` | Return `logo_url`, `store_color` per store                                                                                                                    |

---

## UI / Component Spec

### Product Card (`components/pricing/product-card.tsx`)

A compact card (roughly 200x280px) showing one product:

```
+---------------------------+
|  [Product Image]          |
|  or category placeholder  |
|                           |
+---------------------------+
|  Brand (if known)         |
|  **Product Name**         |
|  $3.49/lb                 |
|  [WF logo] Whole Foods    |
|  [Available] [Updated 3h] |
|  [ + Add to Cart ]        |
+---------------------------+
```

- Image: 1:1 aspect ratio, object-fit cover, rounded top corners
- Fallback: category-specific placeholder icon (meat = red, produce = green, dairy = blue, pantry = amber)
- Price: large, bold. Unit price smaller below if different from display price
- Store: small logo or colored dot + store name
- Stock: "Available" (green), "Unavailable" (red), or hidden if unknown (never lie)
- Freshness: "Updated 3h ago" in muted text. Amber if > 24h. Red if > 7 days
- Add to Cart: ghost button, becomes primary on hover. Shows quantity selector if already in cart
- Mobile: cards stack 2-wide. Tap to expand detail (shows all stores carrying this item)

### Store Aisle Browser (`components/pricing/store-aisle-browser.tsx`)

```
+------------------------------------------+
| [Store selector dropdown]  [Region: MA]  |
| [Whole Foods - Haverhill, MA        v]   |
+------------------------------------------+
| Categories (horizontal scroll):          |
| [Produce] [Meat] [Dairy] [Pantry] [...]  |
+------------------------------------------+
| Showing: Produce at Whole Foods          |
| 342 items - Updated 3 hours ago          |
+------------------------------------------+
| [ProductCard] [ProductCard] [ProductCard]|
| [ProductCard] [ProductCard] [ProductCard]|
| ... (infinite scroll)                    |
+------------------------------------------+
```

- Store selector: dropdown with all stores from Pi. Shows store name + location + item count
- Categories: horizontal scrollable chips. Derived from Pi's category list for that store
- Grid: responsive (3 cols desktop, 2 cols tablet, 2 cols mobile)
- All product cards filtered to selected store only
- Search bar at top (searches within selected store)
- Sort: name, price low-high, price high-low, recently updated

### Shopping Cart Sidebar (`components/pricing/shopping-cart.tsx`)

```
+--------------------------------+
| Shopping Cart          [Close] |
| Whole Foods - Haverhill        |
| [Change Store v]               |
+--------------------------------+
| [ ] Chicken Breast   2 lb     |
|     $3.49/lb = $6.98          |
| [x] Olive Oil        1 bottle |
|     $8.99                     |
| [ ] Baby Spinach     1 bag    |
|     $3.99                     |
+--------------------------------+
| Subtotal: $19.96              |
| 3 items                       |
+--------------------------------+
| [Save List] [Clear] [Share]   |
+--------------------------------+
```

- Slides in from right (desktop) or bottom sheet (mobile)
- Items show checkbox (for in-store use), name, quantity (editable), unit price, line total
- Checked items move to bottom, struck through
- "Change Store" recalculates all prices for new store (calls Pi API)
- "Save List" persists to `shopping_carts` table
- "Share" copies as formatted text (ingredient - qty - price)
- "Update Prices" button refreshes all items with latest Pi data
- Empty state: "Your cart is empty. Browse a store catalog to add items."
- Error state: "Could not load cart. Check your connection." (never show $0.00 total)

### Cart Summary Bar (`components/pricing/cart-summary-bar.tsx`)

Sticky bar at bottom of catalog pages when cart has items:

```
+--------------------------------------------------+
| Cart: 5 items - $47.23 at Whole Foods  [View ->] |
+--------------------------------------------------+
```

Tap to open cart sidebar.

### View Toggle on Catalog Browser

Add to existing `catalog-browser.tsx` header:

```
[Table view] [Grid view] [Store Aisle]
```

- Table view: existing implementation (no changes)
- Grid view: same filters, but renders ProductCard grid instead of table rows
- Store Aisle: renders StoreAisleBrowser (store-first navigation)

### States

- **Loading:** Skeleton grid of product card outlines (same size as real cards). Never blank screen.
- **Empty (no results for search):** "No items found for '{query}' at {store}. Try a different search or store."
- **Empty (store has no data):** "We don't have catalog data for this store yet. Data is collected daily - check back tomorrow."
- **Error (Pi offline):** "Price catalog is temporarily unavailable. The pricing service will reconnect automatically." Show last-known data if cached.
- **Populated:** Product card grid with live data.

---

## Region Handling

Chefs operate in specific areas. A Haverhill chef doesn't need Portland prices cluttering their view; a Portland chef doesn't need Methuen Walmart.

### How It Works

**Region is selected by the chef in the Store Aisle view, persisted in localStorage.**

**IMPORTANT:** The `chefs` table does NOT have city/state/address fields. Region cannot be derived from the chef's profile. Instead:

1. The Store Aisle view has a region dropdown at the top: "Haverhill / Merrimack Valley, MA" or "Portland, ME" (more added as store locations are scraped).
2. Default region on first visit: "Haverhill / Merrimack Valley, MA" (most users are local). Stored in `localStorage('openclaw-region')` after first selection.
3. The store selector below the region dropdown only shows stores in the selected region.
4. Chef can switch regions at any time. All stores remain accessible.
5. Future enhancement (not this spec): add a `preferred_region` column to `chefs` table so it persists across devices. For v1, localStorage is sufficient.

### Region-to-Store Mapping (hardcoded, not geocoded)

| Region                           | Stores Available                                                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Haverhill / Merrimack Valley, MA | Whole Foods Haverhill, Market Basket (Instacart), Hannaford (Instacart), Walmart Methuen, Target Methuen, Stop & Shop (Instacart), Shaw's (Instacart), Aldi (Instacart), Costco (Instacart), BJ's (Instacart) |
| Portland, ME                     | Whole Foods Portland, Hannaford (Instacart), Shaw's (Instacart)                                                                                                                                               |

More regions added as more store locations are scraped. No geocoding API needed. Simple city-string matching.

### What the Builder Must Do

- Add `region` field to `source_registry` on Pi (e.g., `'haverhill-ma'`, `'portland-me'`)
- Pi API `/api/sources` returns region per store
- `getCatalogStores()` in ChefFlow passes region to group stores
- `StoreAisleBrowser` defaults store selector to chef's region
- No new migration on ChefFlow side (chef profile fields already exist)

---

## Mobile Experience

Chefs shop from their phone on the couch. Mobile is not an afterthought.

### Catalog Browsing (Mobile)

- **Grid view:** 2 columns, full-width product cards. No horizontal scroll.
- **Store Aisle view:** Store selector is a full-width dropdown (not a tiny select). Category chips scroll horizontally with momentum (not wrapped).
- **Product card tap:** Opens an expandable detail panel (slides up from bottom, not a new page). Shows all stores carrying this item, price comparison, and "Add to Cart."
- **Search:** Sticky search bar at top. Keyboard opens, results filter live. No separate search page.

### Cart (Mobile)

- **Cart summary bar:** Fixed to bottom of screen, above any browser nav bars. 44px tall minimum (touch target).
- **Cart expanded:** Bottom sheet that slides up to 80% of screen height. Drag handle at top to dismiss. NOT a full-page navigation (chef should feel like they're still in the catalog).
- **Quantity editing:** Tap the quantity number to get a small inline stepper (+/- buttons). Not a modal. Not a text input that opens the keyboard.
- **Check-off items:** Large checkbox (44x44px minimum touch target). Swipe-right to check off is a nice-to-have but not required for v1.

### What the Builder Must Do

- Use Tailwind responsive breakpoints (`sm:`, `md:`, `lg:`) for all new components
- Test at 375px width (iPhone SE) as the minimum
- Cart sidebar: `md:` and above = right sidebar slide-in. Below `md:` = bottom sheet
- Product card detail: `md:` and above = expanded row in grid. Below `md:` = bottom sheet
- All touch targets: minimum 44x44px per Apple HIG

---

## Cart Store Behavior (Single-Store vs Multi-Store)

A cart is tied to one store at a time. This is simpler and matches how chefs actually shop (you go to one store per trip).

### Rules

1. **When a chef adds the first item to a new cart**, the cart's `store_filter` is set to whatever store that item's price came from. The cart header shows "Shopping at Whole Foods - Haverhill."
2. **All subsequent items added to this cart** are priced at the same store. If the chef adds "chicken breast" from the Store Aisle view (already filtered to Whole Foods), the price is Whole Foods' price. If they add from the Grid view (all stores), the system uses the price from the cart's store.
3. **"Change Store" button** reprices every item in the cart at the new store. Items not available at the new store show "Not available at [store]" with no price (they stay in the cart but don't count toward the total). A confirmation dialog warns: "Reprice all items for Market Basket? Items not available there will show as unavailable."
4. **If an item has no price at the cart's store**, show "Price unavailable at [store]" instead of $0.00. The item stays in the cart. The total only sums items with known prices, and shows "(3 of 5 items priced)" below the total.

### What the Builder Must Do

- `shopping_carts.store_filter` is set on first item add (not on cart creation)
- `addToCart()` action: if cart has a `store_filter`, look up price for that store specifically (not best price across all stores)
- `refreshCartPrices(cartId)` action: re-queries Pi for all items at the cart's current `store_filter`
- "Change Store" calls a new action `changeCartStore(cartId, newSourceId)` that updates `store_filter` and calls `refreshCartPrices`
- Add `changeCartStore()` to the server actions table in this spec

### New Server Action

| Action                   | Auth            | Input                                  | Output                                                                        | Side Effects                                                                                              |
| ------------------------ | --------------- | -------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `changeCartStore(input)` | `requireChef()` | `{ cartId: string, sourceId: string }` | `{ success: boolean, repriced: number, unavailable: number, error?: string }` | Updates `store_filter` on cart, reprices all items, updates `price_cents` and `price_source` on each item |

---

## Quantity and Unit Defaults

When a chef clicks "Add to Cart," the system must pick a sensible default quantity and unit. Guessing wrong here means the cart total is meaningless.

### Rules

1. **Default unit** = the canonical ingredient's `standard_unit` from the Pi database. Chicken breast = `lb`. Eggs = `dozen`. Olive oil = `fl_oz`. Bread = `each`.
2. **Default quantity** depends on unit:

| Unit     | Default Qty | Why                                                          |
| -------- | ----------- | ------------------------------------------------------------ |
| `lb`     | 1           | 1 pound is a natural starting point for proteins and produce |
| `oz`     | 8           | 8 oz is a common package size for spices, sauces             |
| `fl_oz`  | 16          | 16 fl oz (1 pint) is a reasonable starting size for liquids  |
| `gallon` | 1           | 1 gallon for milk, etc.                                      |
| `each`   | 1           | 1 item                                                       |
| `dozen`  | 1           | 1 dozen                                                      |
| `bunch`  | 1           | 1 bunch for herbs                                            |

3. **Quantity is always editable.** Inline stepper on desktop (+/- buttons flanking the number). Tap-to-edit on mobile. Accepts decimals (e.g., 2.5 lb).
4. **Line total = quantity x price_per_standard_unit_cents.** If chicken breast is $3.49/lb and chef sets 2.5 lb, line total = $8.73. Integer math: `Math.round(quantity * pricePerUnitCents)`.
5. **Unit is editable** but defaults are good enough that most chefs won't change it. Dropdown with common units for that category. Changing unit recalculates price (uses Pi's unit normalization).

### What the Builder Must Do

- Pi API must return `standard_unit` per ingredient (already does via canonical_ingredients table)
- `addToCart()` defaults: look up `standard_unit`, apply quantity table above
- Cart item display: show `{quantity} {unit}` with inline edit
- Line total: `Math.round(item.quantity * item.price_cents)` where `price_cents` is already per standard unit

---

## Failed Scrape Recovery

When a scraper fails at 6 AM, the data goes stale. The spec says "daily freshness" but doesn't say what happens when that's missed.

### Rules

1. **`schedule-all.sh` retries each scraper once on failure.** If the 6 AM Instacart run fails (exit code != 0), wait 30 minutes, retry once. If the retry also fails, log the failure and move on. No infinite retry loops.
2. **Watchdog detects staleness at the next 15-minute check.** If a source exceeds 26 hours, watchdog logs a WARN. After 48 hours, it escalates to ERROR.
3. **The UI shows staleness honestly.** If Walmart data is 30 hours old (missed today's scrape), the Store Aisle view shows "Last updated: yesterday at 7:00 AM" in amber text. The chef can still browse, but they know the data is a day old.
4. **No automatic fallback to older data from a different source.** If Walmart's scraper failed, we show Walmart's last known data (stale) with a staleness indicator. We don't silently substitute Instacart prices for Walmart.
5. **The watchdog does NOT auto-trigger re-scrapes.** It monitors and alerts. Manual re-runs are done via SSH. Adding auto-recovery is a v2 enhancement.

### What the Builder Must Do

- `schedule-all.sh`: after each scraper call, check `$?`. If non-zero, sleep 1800, retry once, log outcome
- Watchdog: no changes needed (already monitors staleness)
- UI: `FreshnessDot` already handles this. Just ensure `last_confirmed_at` is passed through to all product cards

---

## Search Term Expansion Mechanism

The spec says "expand search terms" but doesn't say how they get into scraper files.

### Mechanism

1. `scripts/expand-search-terms.mjs` reads all canonical ingredients from the Pi DB
2. Groups them by category. For each category, selects the most common root terms (e.g., from "chicken-breast-boneless-skinless" extract "chicken breast")
3. Deduplicates and writes to `data/search-terms.json`:

```json
{
  "produce": ["apple", "banana", "avocado", ...],
  "meat": ["chicken breast", "ground beef", "ribeye", ...],
  "dairy": ["milk", "butter", "cheddar cheese", ...],
  ...
}
```

4. Each scraper imports from `data/search-terms.json` instead of having hardcoded arrays:

```javascript
import { readFileSync } from 'fs'
const TERMS = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'search-terms.json'), 'utf8'))
const SEARCH_TERMS = [
  ...TERMS.produce,
  ...TERMS.meat,
  ...TERMS.dairy,
  ...TERMS.pantry,
  ...TERMS.seafood,
  ...TERMS.spices,
  // store-specific additions
]
```

5. The hardcoded arrays in each scraper are replaced with this import. Store-specific additions (terms that only make sense for one store) stay as a small local array merged with the shared list.
6. Re-run `expand-search-terms.mjs` whenever the canonical ingredient list grows significantly (after bulk imports, new category additions, etc.). Not on every scrape.

### What the Builder Must Do

- Create `scripts/expand-search-terms.mjs` first (Phase 1, step 4)
- Run it once to generate `data/search-terms.json`
- Refactor each scraper to import from the JSON file instead of hardcoded arrays
- Keep store-specific terms as small local additions (e.g., Walmart has "great value chicken" as a brand-specific search that other stores don't need)

---

## Edge Cases and Error Handling

| Scenario                                            | Correct Behavior                                                                                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Product has no image from any scraper               | Show category placeholder icon (meat/produce/dairy/pantry/seafood/bakery). Never show broken `<img>` tag                                        |
| Price is $0.00 (BOGO or data error)                 | Filter out $0.00 prices from display. Log as warning. Show next cheapest price                                                                  |
| Chef searches for item not in Pi catalog            | Show "Not found in catalog. This item may not be available at tracked stores." with option to request it (feeds Pi catalog suggestion endpoint) |
| Cart item's price changed since it was added        | Show original price struck through + new price. "Update Prices" button refreshes all                                                            |
| Pi is offline                                       | Catalog pages show "Pricing service offline" banner. Cart still works with cached prices (snapshot at add-time). Never show fake $0             |
| Store removed from Pi (scraper disabled)            | Cart items for that store show "Store data unavailable." Don't delete the cart                                                                  |
| Chef has no carts yet                               | Show "Create your first shopping list" prompt on cart page. Not blank                                                                           |
| Two items with same canonical_ingredient_id in cart | Allow it (different variants, e.g., organic vs conventional). Group by canonical ID with expand                                                 |
| Image URL returns 404                               | `ImageWithFallback` component catches `onError`, swaps to category placeholder. No retry loop                                                   |
| Concurrent cart edits (two browser tabs)            | Last-write-wins per item. No locking needed for single-user carts                                                                               |
| Instacart markup vs in-store price                  | Show price as-is with source label "via Instacart (est. 15% markup)". Don't fabricate an "estimated in-store" price                             |

---

## Scraper Expansion Details

### Search Term Expansion Strategy

Current: each scraper has 60-80 hardcoded search terms. This misses thousands of products.

New approach:

1. `scripts/expand-search-terms.mjs` reads all 12,979 canonical ingredients from Pi DB
2. Groups by category, picks the most common/useful search terms per category
3. Generates 200-300 search terms per scraper (deduplicated, category-balanced)
4. Scraper files import the generated term list (or the script writes it as JSON)

This is a one-time generation that can be re-run as the canonical list grows.

### Per-Scraper Image Capture

**CRITICAL: No scraper currently captures images. The field paths below are UNVERIFIED assumptions based on typical API structures. The builder MUST inspect actual API/page responses before coding extraction.**

Phase 1, step 0 for each scraper: run a single search, dump the raw response (JSON or HTML), and locate the image field. If the field doesn't exist, skip image capture for that scraper and use placeholders.

| Scraper             | Expected Image Source                                               | Status              | Builder Action                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole Foods (ALM)   | Product tile `<img>` tags on Amazon listing pages                   | **UNVERIFIED**      | Run Puppeteer, screenshot a product tile, inspect DOM for `<img>` src. Amazon product pages typically have images but the ALM browse view may not |
| Instacart (GraphQL) | GraphQL response may contain `image_url` or `thumbnail_url`         | **UNVERIFIED**      | Intercept one GraphQL response, log full JSON, search for image/thumbnail/photo fields. Instacart UI shows images so the data is likely there     |
| Walmart (SSR)       | `__NEXT_DATA__` JSON may contain `imageInfo` or `image` per product | **UNVERIFIED**      | Parse one Walmart search page, dump `__NEXT_DATA__` JSON, search for image fields. Current parser only extracts name + priceInfo                  |
| Target (Redsky)     | Redsky API may return `enrichment.images.primary_image_url`         | **UNVERIFIED**      | Make one Redsky API call, log full response, search for image fields. Target's API is well-structured so this is likely                           |
| Flipp               | Flyer item images in API response                                   | **UNVERIFIED**      | Check Flipp API response for image URLs. Flyers are visual so images are expected                                                                 |
| Hannaford/S&S       | Store website product images                                        | **LOW PROBABILITY** | These scrapers are lightweight HTTP. Images may not be available without Puppeteer                                                                |

**If a scraper cannot find image URLs in the response: that's fine.** Mark it as `image_url: null` and move on. The `ImageWithFallback` component handles missing images with category placeholders. Do not block Phase 1 on image capture for any individual scraper.

### Daily Scrape Schedule (`scripts/schedule-all.sh`)

```bash
# Staggered to avoid overloading Pi
# Run via cron on Pi

# 4:00 AM - Government/USDA (monthly, skip if recent)
# 5:00 AM - Whole Foods (both regions)
# 6:00 AM - Instacart stores (Market Basket, Hannaford, Shaw's, etc.)
# 7:00 AM - Walmart
# 7:30 AM - Target
# 8:00 AM - Flipp flyers
# 8:30 AM - Cross-match new items
# 9:00 AM - Stats report

# Each scraper runs sequentially within its slot
# Watchdog kills anything running > 30 min
# 11:00 PM - ChefFlow sync (existing cron)
```

### Staleness Enforcement

Update watchdog thresholds:

| Source Type      | Current Threshold | New Threshold                       | Level |
| ---------------- | ----------------- | ----------------------------------- | ----- |
| Whole Foods      | 26 hours          | 26 hours (no change)                | ERROR |
| Instacart stores | 48 hours          | 26 hours                            | WARN  |
| Walmart          | 48 hours          | 26 hours                            | WARN  |
| Target           | 48 hours          | 26 hours                            | WARN  |
| Flipp/flyers     | 48 hours          | 48 hours (no change, weekly flyers) | WARN  |
| Government/USDA  | 720 hours         | 720 hours (no change)               | WARN  |

---

## Image Handling Strategy

### The Problem

Store CDN URLs may rotate, require auth cookies, or block external referrers. Hotlinking is unreliable.

### V1 Approach (Simple, Ship First)

1. Scrapers capture `image_url` directly from store pages/APIs
2. Store the URL as-is in `current_prices.image_url`
3. Pi API returns the URL to ChefFlow
4. ChefFlow `ImageWithFallback` component renders `<img src={url}>` with `onError` fallback to category placeholder
5. If images work: great. If they break: placeholder is fine for v1

### V2 Approach (If URLs Break - Build Later)

1. `lib/image-cache.mjs` downloads images to Pi local storage
2. Pi serves via `/api/images/{hash}.jpg` endpoint
3. LRU eviction at 1GB cap (keeps ~20,000 images)
4. ChefFlow points to Pi image endpoint instead of store CDN

**Decision: ship v1 (direct URLs). Only build v2 if breakage is observed.**

### Category Placeholder Icons

When no image is available, show a simple SVG icon:

| Category       | Icon         | Color             |
| -------------- | ------------ | ----------------- |
| Produce        | Leaf         | Green (#22c55e)   |
| Meat & Poultry | Drumstick    | Red (#ef4444)     |
| Seafood        | Fish         | Blue (#3b82f6)    |
| Dairy & Eggs   | Milk bottle  | Sky (#0ea5e9)     |
| Pantry         | Jar          | Amber (#f59e0b)   |
| Bakery         | Bread        | Warm (#d97706)    |
| Frozen         | Snowflake    | Slate (#64748b)   |
| Spices & Herbs | Herb sprig   | Emerald (#10b981) |
| Beverages      | Cup          | Indigo (#6366f1)  |
| Default        | Shopping bag | Gray (#9ca3af)    |

---

## Store Branding

Populate `source_registry.logo_url` and `store_color` for known stores:

| Store         | Color                | Logo Source                                   |
| ------------- | -------------------- | --------------------------------------------- |
| Whole Foods   | #00674b (dark green) | Text "WF" in circle (no external logo needed) |
| Market Basket | #e31837 (red)        | Text "MB" in circle                           |
| Walmart       | #0071dc (blue)       | Text "W" in circle                            |
| Target        | #cc0000 (red)        | Text "T" in circle                            |
| Hannaford     | #e21836 (red)        | Text "H" in circle                            |
| Stop & Shop   | #e31837 (red)        | Text "S&S" in circle                          |
| Shaw's        | #e4002b (red)        | Text "S" in circle                            |
| Costco        | #e31837 (red)        | Text "C" in circle                            |
| BJ's          | #00529b (blue)       | Text "BJ" in circle                           |
| Aldi          | #00005f (navy)       | Text "A" in circle                            |

Use colored circle with initials. No external logo files needed. Simple, reliable, no licensing issues.

---

## Verification Steps

### Phase 1 (Scraper Depth)

1. SSH to Pi, run `node .openclaw-build/services/scraper-wholefoodsapfresh.mjs`
2. After completion, query: `SELECT COUNT(*) FROM current_prices WHERE image_url IS NOT NULL`
3. Verify image count is > 0 for WF products
4. Run `node .openclaw-build/scripts/check-stats.mjs` - verify total prices > 10,000
5. Check watchdog: `node .openclaw-build/services/watchdog.mjs` - all sources within 26h threshold
6. Verify `schedule-all.sh` is in crontab and runs without errors

### Phase 2 (Visual Catalog)

1. Sign in with agent account on dev server (port 3100)
2. Navigate to `/culinary/price-catalog`
3. Click "Grid" view toggle - verify product cards render with images (or placeholders)
4. Click "Store Aisle" view - select Whole Foods
5. Verify categories appear as horizontal chips
6. Click "Produce" - verify grid of produce items with images and prices
7. Verify stock badges show "Available" where data exists, nothing where unknown
8. Verify freshness shows "Updated X hours ago" per item
9. Screenshot the grid view and store aisle view
10. Search for "chicken breast" - verify results across stores with images

### Phase 3 (Cart Builder)

1. From store aisle view, click "Add to Cart" on 3 items
2. Verify cart summary bar appears at bottom with count + total
3. Click to expand cart sidebar
4. Verify items show with correct prices and quantities
5. Change quantity on an item - verify total updates
6. Click "Save List" - verify persistence
7. Navigate away, come back to `/culinary/price-catalog` - verify cart loads
8. Click "Update Prices" - verify prices refresh from Pi
9. Check off an item - verify it moves to bottom, struck through
10. Screenshot the cart with items

---

## Out of Scope (Explicitly NOT in This Spec)

| Feature                                      | Why Not                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Trader Joe's scraper**                     | No public API, aggressive anti-bot. Too hard for v1. Revisit when core is solid    |
| **Amazon Fresh scraper**                     | Different auth system than WF ALM. Defer to v2                                     |
| **Restaurant Depot scraper**                 | Members-only, would need login credentials. Defer                                  |
| **Email outreach for catalog requests**      | Cool but complex (email automation + response parsing). v2 feature                 |
| **Real-time SSE for price changes**          | Daily refresh is sufficient. Real-time adds complexity for marginal gain           |
| **Push notifications for price drops**       | In-app weekly briefing already exists. Push = mobile app territory                 |
| **Barcode scanning**                         | Requires native mobile app features. Out of scope for web                          |
| **Instacart ordering integration**           | Legal/TOS concerns. We show prices, not place orders                               |
| **Price prediction / "buy next Tuesday"**    | ML scope creep. Not in v1                                                          |
| **Multi-state expansion beyond New England** | Infrastructure not ready. Haverhill MA + Portland ME first                         |
| **Recipe-to-cart auto-population**           | Clean future extension of cart, but separate spec. Cart must work standalone first |
| **Shared carts (multi-chef)**                | Carts are tenant-scoped. No sharing for v1                                         |

---

## Unconventional Data Acquisition Methods (v2 Roadmap - Document Now, Build Later)

These are aggressive but legal methods to get catalog data from stores that don't expose APIs. They are NOT part of v1 but should be planned for:

1. **Automated catalog request emails** - OpenClaw sends professional emails to store managers requesting digital price lists or wholesale catalogs. Template-based, tracks responses
2. **PDF catalog parsing** - Many vendors/wholesale suppliers email PDF price sheets. Auto-parse with OCR + AI extraction (vendor-import-tab already does this manually)
3. **Flyer aggregation** - Flipp scraper already captures weekly circulars. Expand to more chains
4. **Receipt crowd-sourcing** - Chef uploads receipt after shopping. OCR extracts items + prices + store. Already partially built (receipt processor on Pi port 8082)
5. **Store loyalty app API reverse engineering** - Some stores (Market Basket, Hannaford) have mobile apps with APIs. Reverse engineer for catalog data. Legal gray area, proceed carefully
6. **Google Shopping API** - Paid API that returns product prices by location. Expensive but comprehensive
7. **Community price reporting** - Chefs in the network report prices they see in-store. Crowd-sourced accuracy

---

## Non-Negotiable Constraints

1. **Pi RAM limit** - all scrapers run sequentially, one store at a time, 30-min kill
2. **No hotlinking store images without fallback** - broken images are worse than no images
3. **Honesty about data quality** - "Available" not "In Stock." Show "Last confirmed" timestamps. Never fake precision
4. **All prices in cents (integer math)** - no floating point
5. **Tenant scoping on all cart data** - every query includes `tenant_id`
6. **Additive migrations only** - no DROP, no ALTER TYPE
7. **Existing components untouched** - PriceBadge, PriceAttribution, resolve-price.ts all continue working
8. **Daily freshness target, not real-time** - "Updated 6 hours ago" is acceptable
9. **No em dashes anywhere** - per CLAUDE.md
10. **Cart prices are snapshots** - show price at time of add. "Update Prices" refreshes explicitly. Never silently change cart totals

---

## What Would Still Be Incomplete After This Ships

1. **Stores without APIs** - Trader Joe's, local ethnic markets, farm stands will have zero coverage
2. **In-stock is best-guess** - "Available in catalog" != "on the shelf right now." We're honest about this
3. **Instacart markup gap** - MB via Instacart is ~15% higher than in-store. Labeled but not corrected
4. **Seasonal produce** - no seasonality model. Asparagus in January shows last known price
5. **Package size variants** - same ingredient may appear as 1lb and 5lb pack. Cross-matcher may not distinguish perfectly
6. **Image coverage will be partial** - some scrapers won't get images for every product. Placeholders fill the gap

---

## Implementation Order

**Build in this exact order. Each phase is independently shippable.**

### Phase 1: Scraper Depth (Pi-side, no ChefFlow changes)

1. Add `image_url`, `brand`, `aisle_category`, `region` columns to Pi DB schema (`source_url` already exists)
2. Update `upsertPrice()` to accept and store new fields
3. Update each scraper to capture images, URLs, and stock status
4. Expand search terms (generate from canonical ingredients)
5. Update sync-api.mjs to return new fields
6. Set up daily cron schedule (`schedule-all.sh`)
7. Tighten watchdog staleness to 26h for all retail
8. Run all scrapers. Verify prices > 15,000 and images > 5,000

### Phase 2: Visual Catalog (ChefFlow-side, depends on Phase 1)

1. Create `ImageWithFallback` component with category placeholders
2. Create `ProductCard` component
3. Update `catalog-actions.ts` types to include new fields
4. Add view toggle to `catalog-browser.tsx` (table/grid/store-aisle)
5. Create `StoreAisleBrowser` component
6. Populate `source_registry` logo/color data
7. Verify in browser with agent account

### Phase 3: Cart Builder (ChefFlow-side, depends on Phase 2)

1. Write migration for `shopping_carts` + `shopping_cart_items`
2. Create `cart-actions.ts` server actions
3. Create `ShoppingCart` sidebar component
4. Create `CartSummaryBar` sticky bar
5. Wire "Add to Cart" on ProductCard to cart actions
6. Test full flow: browse -> add -> save -> reload -> verify

---

## Notes for Builder Agent

- **Read `lib/openclaw/catalog-actions.ts` first** - this is where Pi API calls happen. All new fields flow through here
- **Read `.openclaw-build/services/sync-api.mjs`** - understand every endpoint shape before modifying
- **Test on Pi via SSH** - scrapers run on Pi, not local machine. `ssh pi@10.0.0.177`
- **The existing catalog-browser.tsx is ~1000 lines** - don't rewrite it. Add view modes alongside existing table view
- **19 pricing components already exist** - reuse PriceBadge, FreshnessDot, StockBadge, PriceSparkline. Don't recreate
- **`upsertPrice()` in `lib/db.mjs`** handles all price writes. Current signature accepts 16 params (sourceId through inStock). You must add `imageUrl`, `brand`, `aisleCat` to the destructured parameter object AND update the INSERT/UPDATE SQL to write them. Also ensure each scraper passes the new fields when calling `upsertPrice()`. The existing `sourceUrl` param already maps to `source_url` column (use this for product links, do NOT create a separate `product_url` column)
- **Sequential scraper execution** is mandatory. Never parallelize on Pi. Use `schedule-all.sh` with time-separated cron entries
- **The `in_stock` column already exists** in the schema but is almost never populated. This spec fills it
- **Cart items snapshot prices at add-time.** The "Update Prices" action re-fetches from Pi. This prevents silent total changes that would confuse chefs
- **Store logos are colored circles with initials** - no external logo files. `<div>` with background color + white text. Simple, reliable, zero licensing risk
