# Spec: Chef Catalog UX Overhaul (Store-First Shopping Experience)

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** openclaw-scraper-enrichment.md (for images, stock status, locations)
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-29
> **Built by:** not started

---

## What This Does (Plain English)

Redesigns the ingredient catalog at `/culinary/price-catalog` from a developer-oriented database browser into a chef's shopping experience. After this is built, a chef opens the catalog and sees a familiar retail-style interface: pick a store (or browse all), see what's available with real product photos, filter by category, see out-of-stock items grayed out, and build a shopping cart that connects directly to their events for automatic food costing. It should feel like Instacart or Amazon Fresh, not like a database admin tool.

---

## Why It Matters

The developer (a 10+ year private chef) described the current catalog as "confusing" and "set up like a developer." Chefs need to shop by store and location, see product images, and know what's actually available. The current filtering by crawler source names (Flipp, Instacart) is meaningless to a chef. This is the difference between a tool chefs will use daily and one they'll abandon.

---

## Current State

**File:** `components/culinary/catalog-browser.tsx` (1,194 lines)
**Route:** `app/(chef)/culinary/price-catalog/page.tsx`
**Admin:** `app/(admin)/admin/price-catalog/page.tsx` -> `price-catalog-client.tsx`

The current catalog has 3 views (table, grid, store-aisle), price comparison, trend indicators, a cart sidebar, and infinite scroll. The bones are good. The UX skin needs to change.

---

## Files to Modify

| File                                          | What to Change                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `components/culinary/catalog-browser.tsx`     | Major refactor: store-first navigation, image display, stock status styling, remove developer jargon |
| `app/(chef)/culinary/price-catalog/page.tsx`  | May need layout changes for store-first entry                                                        |
| `lib/actions/price-catalog-actions.ts`        | Add location-aware queries, store preference saving                                                  |
| `components/culinary/store-aisle-browser.tsx` | Update to use real locations instead of chain-level                                                  |

## Files to Create

| File                                           | Purpose                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `components/culinary/catalog-store-picker.tsx` | Store selection UI with logos, locations, and "near me" sorting        |
| `components/culinary/catalog-product-card.tsx` | Product card with image, price, stock badge, add-to-cart               |
| `components/culinary/catalog-stock-badge.tsx`  | Reusable stock status indicator (available/out-of-stock/mixed/unknown) |
| `components/culinary/catalog-event-linker.tsx` | Connect shopping cart to an event for auto food costing                |

---

## Database Changes

### New Columns on Existing Tables

```sql
-- Chef's preferred stores (saved filter preferences)
ALTER TABLE chefs ADD COLUMN preferred_stores JSONB DEFAULT '[]';
-- Example: ["market-basket-haverhill", "whole-foods-haverhill", "costco-methuen"]
```

### Migration Notes

- Check `database/migrations/` for highest timestamp before creating migration file
- Additive only (one new column)

---

## UI / Component Spec

### Entry Point: Store Picker

When a chef opens `/culinary/price-catalog`, the first thing they see is a store picker (not the raw ingredient list). This is the fundamental UX shift: **store-first, not ingredient-first.**

**Store Picker Layout:**

- Grid of store cards, each showing:
  - Store logo/icon (or styled initial letter as fallback)
  - Store name + location (e.g., "Market Basket - Haverhill")
  - Item count badge (e.g., "1,247 items")
  - Freshness indicator (when data was last updated)
  - Tier badge (Retail / Wholesale) - subtle, not dominant
- "All Stores" option at the top (current behavior, browse everything)
- "My Stores" section at top if chef has preferred stores saved
- Search bar to filter stores by name
- Sort: by proximity (if location known), alphabetical, or item count

**After selecting a store (or "All Stores"):** the existing catalog browser opens, pre-filtered to that store. The store context persists in a header bar with "Change Store" button.

### Product Display Redesign

**Grid View (default for store-browsing):**

- Product card: image (from OpenClaw `image_url`, fallback to category icon), product name, price, unit, store name (if browsing all stores)
- Out-of-stock items: grayed out, "Out of Stock" badge overlay, sorted to bottom within category
- "Add to Cart" button on each card
- Hover/tap: expand to show all-store price comparison (existing feature, keep it)

**Table View (power user mode):**

- Keep existing table but replace developer columns:
  - Remove: "Confidence" column (replace with subtle dot indicator)
  - Remove: "Source" column (no chef cares if it came from Flipp vs Instacart)
  - Add: Product image thumbnail (32px)
  - Add: Stock status badge
  - Rename: "Tier" -> just color-code retail vs wholesale subtly
- Out-of-stock rows: faded background, badge in stock column

**Store-Aisle View (keep, enhance):**

- Current store-aisle browser works well conceptually
- Enhance with images and stock badges
- Use location-specific store names

### Filter Redesign

**Remove or hide:**

- "Confidence" filter (developer concept)
- Source/scraper method filter
- Tier filter (fold into store selection: wholesale stores are just stores)

**Keep and improve:**

- Category dropdown - expand from 14 to subcategories (Produce > Vegetables > Root Vegetables) if data supports it
- Search bar (already good)
- "In Stock Only" toggle - now meaningful since stock data will be real
- Sort options (keep all)

**Add:**

- Store location filter (if browsing "All Stores")
- "My Stores Only" toggle (uses chef's preferred_stores)
- Price range filter (under $5, $5-$15, $15+)
- "On Sale" filter (items with `price_type = 'sale'`)

### Shopping Cart Improvements

**Current cart** is session-only and disconnected from events. Changes:

1. **Auto-save carts** to `shopping_carts` table (already exists)
2. **Event linker:** "Link to Event" dropdown in cart sidebar. Selecting an event:
   - Shows the event name, date, guest count
   - Auto-calculates scaled quantities (if recipe yields are known)
   - Shows running food cost total for the event
   - Saves the cart-event association
3. **Store grouping in cart:** If cart has items from multiple stores, group them by store with subtotals. This is what a chef actually needs: "here's my Market Basket list ($47), here's my Costco list ($89)."

### Out-of-Stock Treatment

Items that are out of stock (`in_stock = 0`) or have stale data (last confirmed >7 days):

- **Still visible** in the catalog (never hidden)
- **Visually distinct:** grayed out card/row, "Out of Stock" or "Unverified" badge
- **Sorted lower** within their category (available items first)
- **Tooltip:** "Last confirmed [date]. Price may have changed." for stale items
- **Tooltip:** "Currently out of stock at [store]." for out-of-stock items
- **Cross-store suggestion:** "Available at [other store] for [price]" if the same ingredient is in stock elsewhere

### Confidence Display (Simplified)

Replace developer jargon with chef-friendly indicators:

| Internal Confidence   | Chef Sees         | Visual          |
| --------------------- | ----------------- | --------------- |
| `exact_receipt`       | "Verified price"  | Green checkmark |
| `direct_scrape`       | "Current price"   | Blue dot        |
| `instacart_adjusted`  | "Estimated price" | Amber dot       |
| `flyer_scrape`        | "Sale price"      | Sale tag icon   |
| `government_baseline` | "Average price"   | Gray dot        |

Show as a small icon + tooltip, not a text label. Chefs don't need to understand the data pipeline.

---

## States

- **Loading:** Skeleton cards/rows matching the expected layout. Store picker shows skeleton cards.
- **Empty (no results for filter):** "No ingredients found matching your filters. Try broadening your search." with clear-filters button.
- **Empty (store has no data):** "We don't have pricing data for this store yet. [Browse all stores]"
- **Error (Pi offline):** "Ingredient catalog is temporarily unavailable. Our pricing service is being updated." Never show fake data or zeros.
- **Populated:** Normal display with all enrichments.

---

## Edge Cases and Error Handling

| Scenario                              | Correct Behavior                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| Pi is offline (sync-api unreachable)  | Show error state, not empty catalog. Toast: "Price data temporarily unavailable" |
| Image URL returns 404                 | Show category fallback icon. Don't break layout. Don't retry endlessly.          |
| Item has no image_url                 | Show category fallback icon (existing behavior, already works)                   |
| All items at a store are out of stock | Show them all grayed out with explanation, not an empty page                     |
| Chef has no preferred stores          | Skip "My Stores" section, show all stores                                        |
| Cart linked to deleted event          | Unlink gracefully, toast notification                                            |
| Price is $0 or negative               | Filter out in display (data error), don't show to chef                           |

---

## Verification Steps

1. Sign in with agent account
2. Navigate to `/culinary/price-catalog`
3. Verify store picker appears as entry point
4. Select a store, verify catalog filters to that store
5. Verify product images display (or fallback icons for items without images)
6. Verify out-of-stock items appear grayed with badge
7. Verify "Confidence" and "Source" developer jargon is gone
8. Add items to cart, verify cart auto-saves
9. Link cart to an event, verify food cost calculation
10. Set preferred stores, reload page, verify "My Stores" section appears
11. Screenshot before/after comparison

---

## Out of Scope

- OpenClaw scraper changes (separate spec: openclaw-scraper-enrichment.md)
- Price alerts / watchlists (future spec)
- CSV/PDF export of shopping lists (future spec)
- Wholesale minimum order quantities (future spec)
- Regional expansion beyond current Pi scraping area (future spec)
- Mobile-native shopping experience (future spec)
- Receipt upload from catalog (existing feature, separate flow)

---

## Notes for Builder Agent

- Read the research report first: `docs/research/openclaw-price-intel-full-audit.md`
- The existing `catalog-browser.tsx` is 1,194 lines. Refactor, don't rewrite. Extract components.
- The catalog queries the Pi sync-api DIRECTLY (not local DB) for browsing. The Pi is at `10.0.0.177:8081`. Check `lib/actions/price-catalog-actions.ts` for the API calls.
- The `shopping_carts` table already exists. Use it for auto-save.
- Store logos: use a simple mapping of chain name to icon/color. Don't overcomplicate. Styled first letter as fallback.
- This spec depends on `openclaw-scraper-enrichment.md` for images, stock data, and locations. If those aren't ready, the UI should degrade gracefully (no images = fallback icons, no stock data = don't show stock badges, no locations = chain-level only).
- Test with the Pi running. If Pi is off, the catalog should show a clear error, not crash.
- Follow existing patterns in `catalog-browser.tsx` for API calls, state management, and Tailwind styling.
