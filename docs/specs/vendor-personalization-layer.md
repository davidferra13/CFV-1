# Spec: Vendor Personalization Layer

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (5-7 files)

## Timeline

| Event         | Date             | Agent/Session | Commit |
| ------------- | ---------------- | ------------- | ------ |
| Created       | 2026-04-02 ~late | Planner       |        |
| Status: ready | 2026-04-02 ~late | Planner       |        |

---

## Developer Notes

### Raw Signal

"Create a unified Vendor Layer that sits between the user and the catalog. Right now the catalog is generic. The user has to mentally filter: where do I buy this, is this even relevant to me? That creates friction and slows everything down.

User can add vendors they work with (Whole Foods, Restaurant Depot, local farm, specific supplier). Every ingredient can be linked to one or more vendors. Once vendors are selected, the catalog becomes filtered automatically. User sees only relevant items, or prioritized items based on their vendors. Pricing becomes vendor-specific: 'Tomatoes = $X at Vendor A, $Y at Vendor B.' Fast selection UX: open catalog, click ingredient, see which vendors carry it, pricing per vendor, choose instantly.

This is not just a feature. This is personalization of the entire system. Without it, the app feels generic. With it, the app feels tailored and powerful. You're not adding complexity, you're removing friction, increasing relevance, making the system feel like it understands the user."

### Developer Intent

- **Core goal:** Make the catalog feel personal by connecting it to the chef's actual vendors, so browsing and pricing feel tailored, not generic.
- **Key constraints:** Build on the existing vendor/store infrastructure (don't reinvent). No new tables needed for the minimal version. Don't break existing price resolution.
- **Motivation:** The catalog has 32K+ items and 11+ chains. Without vendor filtering, it's overwhelming. Chefs know exactly where they shop. The system should respect that.
- **Success from the developer's perspective:** Chef opens the catalog, it's already filtered to their vendors/stores. Pricing shows per-vendor. Adding a new vendor is fast and obvious. The whole system feels like "mine."

---

## What This Does (Plain English)

After this is built, the chef opens the Food Catalog and sees it pre-filtered to their vendors and preferred stores. Each ingredient shows vendor-specific pricing ("$3.49 at Market Basket, $4.19 at Whole Foods"). The chef can toggle vendors on/off to compare. A new "My Vendors" sidebar section in the catalog replaces the current store picker with a unified view that merges the chef's manual vendors (`vendors` table) and their preferred catalog stores (`chef_preferred_stores` table). Adding a new vendor or store is one click from the catalog itself.

---

## Why It Matters

The catalog currently feels like a generic database. Chefs shop at specific stores and have specific vendor relationships. Connecting those to the catalog transforms a data browser into a personal procurement tool. This is the single highest-leverage UX improvement for daily catalog usage.

---

## Current State (What Already Exists)

The database and backend infrastructure for this feature is **90% built**. The gap is in the catalog UI and the unification layer.

### Already Built (do NOT rebuild)

| What                                 | Where                                                                                               | Status                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `vendors` table                      | `database/migrations/20260303000023_vendor_management.sql` + `20260401000044_vendor_management.sql` | Full CRUD, contact info, types, ratings         |
| `vendor_preferred_ingredients` table | `database/migrations/20260401000062_vendor_ingredient_pricing.sql`                                  | Multi-vendor per ingredient, per-vendor pricing |
| `vendor_price_entries` table         | `20260401000044_vendor_management.sql`                                                              | Historical vendor price log                     |
| `chef_preferred_stores` table        | `20260401000035_store_shopping_lists.sql`                                                           | Store selection with types, default flag        |
| `store_item_assignments` table       | Same migration                                                                                      | Keyword-to-store mapping                        |
| `ingredient_price_history.vendor_id` | `20260401000061_ingredient_price_history.sql`                                                       | FK to vendors table                             |
| `ingredient_best_vendor_price` view  | `20260401000062_vendor_ingredient_pricing.sql`                                                      | Best price per ingredient across vendors        |
| `resolvePrice()` with preferredStore | `lib/pricing/resolve-price.ts`                                                                      | Already prioritizes preferred store             |
| Store preferences page               | `app/(chef)/settings/store-preferences/`                                                            | Add/remove stores, set default                  |
| Vendor directory page                | `app/(chef)/culinary/vendors/`                                                                      | Add/star/delete vendors                         |
| Vendor management pages              | `app/(chef)/vendors/`                                                                               | Full CRUD, invoices, price comparison           |
| Catalog store picker                 | `components/pricing/catalog-store-picker.tsx`                                                       | "My Stores" + "All Stores" sections             |

### What's Missing (build this)

1. **Catalog doesn't auto-filter by vendor/store on load** - opens showing everything
2. **No unified vendor+store concept in the catalog** - two separate systems not connected
3. **Vendor-specific pricing not surfaced in catalog browse** - only shows "best price" not per-vendor
4. **No quick vendor assignment from catalog** - can't link ingredient to vendor while browsing
5. **Store picker doesn't include manual vendors** - only shows OpenClaw catalog stores

---

## Files to Create

| File                                   | Purpose                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `lib/vendors/unified-vendor-source.ts` | Server action that merges `vendors` + `chef_preferred_stores` into one list for catalog filtering |

---

## Files to Modify

| File                                                    | What to Change                                                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/culinary/price-catalog/catalog-browser.tsx` | Auto-filter by preferred vendors/stores on load; add vendor-specific price column; add "assign to vendor" quick action     |
| `components/pricing/catalog-store-picker.tsx`           | Merge manual vendors into "My Sources" section alongside preferred stores                                                  |
| `lib/pricing/resolve-price.ts`                          | Add `resolveVendorPrices()` (returns all vendor prices) AND add `vendor_manual` as Tier 1.5 in main `resolvePrice()` chain |
| `lib/grocery/store-shopping-actions.ts`                 | Add `getUnifiedSources()` that combines vendors + preferred stores                                                         |

---

## Database Changes

None. All required tables, columns, and views already exist. This is a UI/integration spec.

---

## Data Model

### Unified Source (runtime type, not a table)

```typescript
type UnifiedSource = {
  id: string // vendor.id or chef_preferred_stores.id
  type: 'vendor' | 'catalog_store'
  name: string // vendor_name or store_name
  subtype: string // vendor_type or store_type
  isDefault: boolean // is_preferred or is_default
  hasContactInfo: boolean // vendors have contact; stores don't
  // For catalog stores only:
  chainSlug?: string // links to openclaw.chains for logo
  city?: string
  state?: string
}
```

### Vendor Price Row (for multi-vendor display)

```typescript
type VendorPriceRow = {
  sourceId: string
  sourceName: string
  sourceType: 'vendor' | 'catalog_store'
  priceCents: number
  unit: string
  confidence: number
  freshness: 'current' | 'recent' | 'stale'
  lastSeen: string
  isPreferred: boolean
}
```

---

## Server Actions

| Action                                        | Auth            | Input                                          | Output                                 | Side Effects                                                                                |
| --------------------------------------------- | --------------- | ---------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `getUnifiedSources()`                         | `requireChef()` | none                                           | `UnifiedSource[]`                      | None (read-only)                                                                            |
| `resolveVendorPrices(ingredientId)`           | `requireChef()` | `{ ingredientId: string }`                     | `VendorPriceRow[]`                     | None (read-only)                                                                            |
| `quickAssignVendor(ingredientName, vendorId)` | `requireChef()` | `{ ingredientName: string, vendorId: string }` | `{ success: boolean, error?: string }` | Upserts `store_item_assignments` or `vendor_preferred_ingredients` depending on source type |

---

## UI / Component Spec

### Catalog Browser Changes

**On load behavior (new):**

1. Fetch `getUnifiedSources()`
2. If chef has preferred sources, auto-filter catalog to those sources
3. Show a dismissible banner: "Showing prices from your vendors. [Show all]"

**Source Picker (replaces current store picker):**

- Section 1: "My Sources" - merged list of vendors + preferred stores, each with type icon
- Section 2: "All Catalog Stores" - unchanged from current
- Toggle behavior: selecting/deselecting a source filters the catalog in real time
- Add source inline: "+" button opens a quick-add for either vendor or store

**Product rows (enhanced):**

- Current: shows best price + store name
- New: shows best price + store name, with expandable "Compare prices" row showing all vendor prices
- Each vendor price row: vendor name, price, unit, freshness dot, "preferred" star

**Quick assign (new):**

- On any product row, a small "Link to vendor" button
- Opens a dropdown of chef's sources
- Selecting one creates the assignment (calls `quickAssignVendor`)

### States

- **Loading:** Skeleton cards (existing pattern)
- **Empty (no sources):** "Add your vendors and stores to personalize pricing. [Set up vendors]" linking to `/culinary/vendors`
- **Error:** "Could not load vendor data" toast, falls back to unfiltered catalog
- **Populated:** Filtered catalog with vendor pricing

---

## Edge Cases and Error Handling

| Scenario                                             | Correct Behavior                                               |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| Chef has no vendors or preferred stores              | Show unfiltered catalog with "Personalize your catalog" CTA    |
| Vendor has no prices for an ingredient               | Show vendor name with "No price data" instead of hiding it     |
| Both a vendor and a catalog store have the same name | Show both with type badge ("Vendor" vs "Store") to distinguish |
| Quick assign fails                                   | Toast error, no optimistic update needed (non-critical action) |
| Chef deselects all sources                           | Show unfiltered catalog (same as having no sources)            |

---

## Verification Steps

1. Sign in with agent account
2. Navigate to `/culinary/vendors`, add 2 test vendors
3. Navigate to `/settings/store-preferences`, add 2 preferred stores
4. Navigate to `/culinary/price-catalog`
5. Verify: catalog loads pre-filtered to the 4 sources
6. Verify: source picker shows "My Sources" with all 4 merged
7. Verify: expanding a product shows per-vendor pricing
8. Verify: clicking "Link to vendor" on a product creates the assignment
9. Verify: deselecting all sources shows full unfiltered catalog
10. Verify: "Show all" banner link works
11. Screenshot the filtered catalog view with vendor pricing visible

---

## Out of Scope

- Vendor CRUD changes (existing pages at `/vendors` and `/culinary/vendors` are unchanged)
- Store preferences page changes (existing page unchanged)
- Vendor invoice/price comparison pages (already exist, untouched)
- Vendor-specific availability tracking (future expansion)
- Vendor ordering/PO generation (future expansion)

---

## Notes for Builder Agent

1. **Do NOT create new database tables or migrations.** Everything needed already exists. If you think you need a migration, re-read the Current State section.

2. **The unified source list is a runtime merge, not a DB view.** Query both `vendors` and `chef_preferred_stores` for the current chef, normalize into `UnifiedSource[]`. Keep it simple.

3. **`resolveVendorPrices()` should query:**
   - `vendor_preferred_ingredients` for manual vendor prices
   - `openclaw.store_products` joined through preferred stores for catalog prices
   - `ingredient_price_history` for historical purchase data
   - Return all as `VendorPriceRow[]`, sorted by price ascending

4. **The catalog browser (`catalog-browser.tsx`) is ~56KB.** Read it thoroughly before editing. The store picker integration point is where `CatalogStorePicker` is rendered. The product expansion is where `getCatalogDetail()` is called.

5. **Follow the existing pattern** in `catalog-store-picker.tsx` for the source picker UI. It already has "My Stores" and "All Stores" sections. You're merging vendors into "My Stores" and renaming it "My Sources."

6. **Quick assign uses existing tables.** For catalog stores, upsert `store_item_assignments`. For manual vendors, upsert `vendor_preferred_ingredients`. Check the source type to route correctly.

7. **The `preferredStore` option in `resolvePrice()` already exists.** The new `resolveVendorPrices()` is a separate function that returns ALL prices, not just the best one.

8. **Cost Propagation (CRITICAL - added after continuity audit).** This spec is not just a display feature. Vendor prices must feed into the cost chain:
   - Add `vendor_manual` as a new `PriceSource` in `resolvePrice()` at `lib/pricing/resolve-price.ts`
   - Insert it as **Tier 1.5** (between Receipt and API Quote, confidence 0.9). Query: `vendor_preferred_ingredients` where `chef_id = tenantId` and ingredient matches, within 90 days of `last_ordered_at`
   - The existing `ingredient_best_vendor_price` view (`SELECT DISTINCT ON (chef_id, ingredient_name) ... ORDER BY unit_price_cents`) is ready to query
   - After `quickAssignVendor()` creates/updates a vendor-ingredient link with a price, call `propagatePriceChange([ingredientId])` from `lib/pricing/cost-refresh-actions.ts` so recipe and menu costs update immediately
   - This closes the gap identified in the cross-system continuity audit (H3): vendor prices were reference-only, never feeding the cost chain

9. **Reference:** `docs/research/cross-system-continuity-audit.md` documents the full wiring gap this spec addresses. The vendor spec covers H3 (vendor prices as price tier) and M3 (catalog filtering). The companion wiring spec (`docs/specs/cost-propagation-wiring.md`) covers C2, C3, M1, and H1.
