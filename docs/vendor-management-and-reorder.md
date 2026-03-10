# Vendor Management Hub + Smart Reorder Triggers

Two complementary features that extend ChefFlow's existing vendor and inventory systems.

## Feature U1: Vendor Management Hub

Enhances the existing vendor directory with reliability tracking, per-ingredient vendor preferences, and expanded price comparison capabilities.

### What was added

**Migration** (`20260331000020_vendor_hub_and_reorder.sql`):

- Added `reliability_score` (numeric) and `minimum_order_cents` (integer) columns to `vendors` table
- New `vendor_preferred_ingredients` table: maps each ingredient to its preferred vendor (chef_id, ingredient_name unique constraint)
- New `reorder_settings` table: per-ingredient reorder configuration (par level, reorder qty, preferred vendor)
- Full RLS policies on all new tables

**Server Actions** (added to `lib/vendors/actions.ts`):

- `updateReliabilityScore(vendorId, onTimeDeliveries, totalDeliveries)`: deterministic score = (onTime / total) \* 100
- `getPreferredVendor(ingredientName)`: per-ingredient vendor lookup
- `setPreferredVendor(ingredientName, vendorId)`: upsert preferred vendor for an ingredient
- `getAllPreferredVendors()`: all mappings for the current chef
- `compareVendorPrices(ingredientName)`: latest price from each vendor for a given ingredient name
- `getCheapestVendor(ingredientName)`: vendor with the lowest current price
- `getVendorPriceList(vendorId)`: all current prices from one vendor (latest per item)
- `getPriceHistory(ingredientName, days?)`: price over time across all vendors

**UI** (`components/vendors/vendor-directory.tsx`):

- Client component with live search/filter
- Shows reliability badges (green 95%+, yellow 80%+, red below)
- Shows preferred status, payment terms, minimum order, delivery days
- Wraps existing vendor page data

### How it connects to existing systems

The vendor system already had:

- `vendors` table with CRUD actions
- `vendor_items` table (catalog mapping)
- `vendor_price_points` table (price history)
- Price comparison UI and deterministic recommendation engine
- Invoice tracking and document intake

This enhancement adds the missing reliability and per-ingredient preference layer on top.

---

## Feature U6: Smart Reorder Triggers

When inventory drops below par level, automatically detects shortfalls and generates draft purchase orders to preferred vendors.

### What was added

**Server Actions** (`lib/vendors/reorder-actions.ts`):

- `checkReorderPoints()`: scans all `inventory_counts` with par levels, enriches with reorder settings, preferred vendor mappings, and last known prices. Returns items below par with urgency ranking (critical = below 50% of par, low = below par).
- `getReorderAlertCount()`: lightweight count for dashboard widget
- `generateReorderPO(vendorId, items[])`: creates a draft `purchase_orders` record with pre-filled items, quantities, and estimated prices. Integrates with the existing PO system.
- `getReorderSettings()`: all configured reorder points
- `setReorderSettings(input)`: upsert reorder config per ingredient, syncs par_level to inventory_counts
- `deleteReorderSetting(id)`: remove a reorder config

**UI Components**:

- `components/vendors/reorder-alerts.tsx`: Alert cards grouped by vendor with color-coded urgency. "Generate PO" button per vendor group. Uses startTransition with try/catch and rollback.
- `components/vendors/reorder-settings.tsx`: Table with inline editing for par level, reorder qty, unit, and preferred vendor dropdown. Add/edit/delete with proper error handling.

**Pages**:

- `app/(chef)/inventory/reorder/page.tsx`: Two-tab layout (Alerts, Settings). Breadcrumb back to inventory. Links to purchase orders and vendors.

**Dashboard Widget**:

- Added `getReorderAlertCount()` to dashboard alert cards section
- Shows "Below Par" stat card with count of items needing reorder, linking to `/inventory/reorder`

**Inventory Landing Page**:

- Added "Smart Reorder" to the sub-page navigation grid

### How it connects to existing systems

The reorder system builds directly on:

- `inventory_counts` table (existing par_level and current_qty)
- `purchase_orders` + `purchase_order_items` tables (existing PO lifecycle)
- `vendor_preferred_ingredients` (new, for routing reorders to the right vendor)
- `vendor_price_points` (existing, for estimated prices on draft POs)

All deterministic. No AI involved. Formula > AI.

---

## Architecture Notes

- All actions use `requireChef()` for auth and `user.tenantId!` for tenant scoping
- Financial amounts in cents (integer)
- Reliability score is deterministic: `(onTimeDeliveries / totalDeliveries) * 100`
- Urgency is deterministic: `currentQty / parLevel < 0.5` = critical, else low
- Draft POs link to the existing PO lifecycle (draft, submitted, partially_received, received, cancelled)
- All UI components use startTransition with try/catch for mutations per project rules
