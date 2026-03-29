# OpenClaw Total Catalog Intelligence - Build Report

**Date:** 2026-03-29
**Spec:** `docs/specs/openclaw-total-catalog-intelligence.md`
**Status:** Built (pending verification)

## What Changed

### Phase 1: Pi-Side (Data Layer)

**`.openclaw-build/lib/db.mjs`**

- Added 3 columns to `current_prices`: `image_url`, `brand`, `aisle_category`
- Added 3 columns to `source_registry`: `logo_url`, `store_color`, `region`
- Updated `upsertPrice()` to accept and persist `imageUrl`, `brand`, `aisleCat`
- Uses `COALESCE` on updates so scrapers that don't yet provide metadata won't overwrite existing values

**`.openclaw-build/services/sync-api.mjs`**

- `/api/ingredients` endpoint now returns `image_url` and `brand` in grouped results
- `/api/ingredients/detail/:id` returns `imageUrl`, `brand`, `aisleCat` per price entry
- Source registry endpoints (`/api/sources`) auto-include new columns via `SELECT *`

### Phase 2: ChefFlow-Side (Visual Catalog)

**`lib/openclaw/catalog-actions.ts`**

- `CatalogItemV2` type: added `imageUrl`, `brand`
- `CatalogDetailPrice` type: added `imageUrl`, `brand`, `aisleCat`
- `CatalogStore` type: added `logoUrl`, `storeColor`, `region`, `city`, `state`

**New Components:**

- `components/pricing/image-with-fallback.tsx` - Category-specific SVG placeholders with fallback on broken images
- `components/pricing/product-card.tsx` - Compact card with image, brand, name, price, stock, freshness, add-to-cart
- `components/pricing/store-aisle-browser.tsx` - Store-first catalog view with region selector, category chips, infinite scroll

**`app/(chef)/culinary/price-catalog/catalog-browser.tsx`**

- Added 3-way view toggle: Table, Grid, Store Aisle
- Grid view renders ProductCard grid
- Store Aisle view renders self-contained StoreAisleBrowser

### Phase 3: Shopping Cart Builder

**`database/migrations/20260401000115_shopping_carts.sql`**

- `shopping_carts` table: id, tenant_id, name, store_filter, notes, timestamps
- `shopping_cart_items` table: id, cart_id, tenant_id, ingredient_name, canonical_ingredient_id, quantity, unit, price_cents, price_source, image_url, checked_off, sort_order, timestamps
- Indexes on tenant_id and cart_id

**`lib/openclaw/cart-actions.ts`** (server actions)

- `createCart()` - Create a named shopping cart
- `getCarts()` - List carts with item count and total
- `getCartWithItems()` - Full cart with all items
- `addToCart()` - Add item with snapshot price
- `updateCartItem()` - Update quantity, checked_off, sort_order
- `removeCartItem()` - Delete single item
- `deleteCart()` - Delete entire cart (CASCADE on items)
- `refreshCartPrices()` - Re-fetch latest prices from Pi API
- `changeCartStore()` - Switch store filter and reprice all items

**New Components:**

- `components/pricing/shopping-cart-sidebar.tsx` - Slide-over cart panel with cart list, item management, quantity controls, check-off, price refresh, totals
- `components/pricing/cart-summary-bar.tsx` - Floating FAB showing item count and total, opens sidebar

**Integration in CatalogBrowser:**

- Auto-creates default cart on first "Add to Cart"
- Grid view ProductCards have Add to Cart button with "In Cart" state
- CartSummaryBar floats at bottom-right when items exist
- Closing sidebar syncs cart state back to parent

## Architecture Decisions

1. **Cart prices are snapshots** - Price at add-time, refreshable via explicit "Update Prices" button
2. **Auto-create cart** - First add-to-cart auto-creates a "Shopping List" if none exists
3. **Optimistic updates** - All cart mutations use optimistic UI with rollback on failure
4. **Tenant-scoped** - All queries scoped by `tenant_id` from session
5. **Individual UPDATE statements** - `updateCartItem` uses separate UPDATE per field to avoid Drizzle parameterization issues with dynamic SQL
