# FIFO/Shelf Life Tracking (U19) and Multi-Location Awareness (U21)

## Overview

Two features added to ChefFlow for inventory lifecycle management and multi-location operations.

## U19: FIFO / Shelf Life Tracking

Tracks received date and use-by date per inventory lot. Provides FIFO rotation alerts and expired item flagging.

### What changed

**Migration:** `20260331000027_fifo_shelf_life_and_multi_location.sql`

- New table `inventory_lots` with tenant scoping, RLS, and indexes on expiry dates
- New table `ingredient_shelf_life_defaults` for per-ingredient default shelf life settings

**Server actions:** `lib/inventory/fifo-actions.ts`

- `receiveLot()` - log a new received lot (auto-applies default shelf life if no expiry given)
- `updateLot()` - edit lot details
- `consumeLot()` - FIFO consumption (always oldest first)
- `discardLot()` - mark as discarded
- `getActiveLots()` - available lots sorted by expiry (FIFO order)
- `getExpiringItems(days)` - items expiring within N days
- `getExpiredItems()` - past-expiry items still marked available
- `getFIFORecommendation(ingredient)` - human-readable FIFO guidance
- `getShelfLifeReport()` - overview stats
- `getWasteFromExpiry(days)` - value of discarded items
- `setDefaultShelfLife()` - save default shelf life per ingredient

**UI:** `components/inventory/fifo-tracker.tsx`

- Alert banners for expiring and expired items
- Summary cards (active lots, expiring this week, expired, waste value)
- Receive lot form with all fields
- Lot list grouped by ingredient, sorted FIFO with "FIFO" badge on oldest
- Color-coded expiry badges (green > yellow > orange > red)
- Use/Discard buttons per lot
- Filters by storage location, ingredient name, expiry status

**Page:** `app/(chef)/inventory/fifo/page.tsx`

### How it works

- Lots are sorted by expiry date ascending (FIFO order). The oldest lot gets a "FIFO" badge.
- If no explicit expiry date is set but a `shelf_life_days` value exists, the effective expiry is computed as `received_date + shelf_life_days`.
- If neither is set, the system checks `ingredient_shelf_life_defaults` for a per-ingredient default.
- Consuming from a lot reduces quantity. When quantity hits 0, status becomes "consumed".
- All computations are deterministic (Formula > AI).

## U21: Multi-Location Awareness

Adds a location dimension to key entities and provides a location switcher.

### What changed

**Migration:** Same file (`20260331000027`)

- New table `business_locations` with type, primary flag, active flag, timezone
- Added nullable `location_id` column to: `staff_members`, `scheduled_shifts`, `inventory_counts`, `sales`, `daily_checklist_completions`, `inventory_lots`
- All ALTER TABLE uses `IF NOT EXISTS` for safety

**Server actions:** `lib/locations/location-actions.ts`

- CRUD for `business_locations` (create, update, soft-delete via deactivate)
- `getLocations()`, `getPrimaryLocation()`
- `setActiveLocation()` / `getActiveLocation()` (currently maps to primary; ready for per-session switching)
- `getLocationStats(id)` - staff count, inventory value, recent sales count
- `getLocationComparison()` - side-by-side stats across all active locations

**UI components:**

- `components/locations/location-switcher.tsx` - dropdown for switching between locations (shows current location, type badge, primary indicator)
- `components/locations/location-manager.tsx` - full CRUD management with stats per location
- `components/locations/location-comparison.tsx` - comparison table with distribution bars

**Pages:**

- `app/(chef)/settings/locations/page.tsx` - location management
- `app/(chef)/analytics/locations/page.tsx` - location comparison analytics

### Location types

kitchen, storefront, truck, commissary, warehouse, office

### Design decisions

- Soft delete (deactivate) instead of hard delete, since other tables may reference location_id
- Only one location can be primary at a time (setting a new primary clears the old one)
- The location switcher is ready for nav integration but not wired into the sidebar yet (needs explicit integration by the developer)
- `setActiveLocation` is a stub for future per-session or per-user preference storage
- All `location_id` columns are nullable so existing data is unaffected

## Tier assignment

Both features are Layer 5+ and should be Pro tier. The gating can be added when the module registry is updated.
