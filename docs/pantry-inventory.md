# Pantry Inventory - Feature 3.16

Multi-location pantry tracking with event-based drawdown.

## What Changed

### Database (`20260401000023_pantry_inventory.sql`)

- `pantry_locations` - tracks where a chef stores ingredients (home, client homes, storage units)
- `pantry_items` - individual items with quantity, unit, category, expiry, minimum stock thresholds
- RLS on both tables scoped to `tenant_id` via `user_roles`
- Indexes on (tenant_id, location_id) and (tenant_id, ingredient_id)

### Server Actions (`lib/inventory/pantry-actions.ts`)

- Full CRUD for locations and items
- `drawdownForEvent(eventId)` - deterministic subtraction of recipe ingredients from pantry, prioritizing default location. Follows Formula > AI principle.
- `getLowStockAlerts()` - items at or below their minimum_stock threshold
- `getExpiringItems(daysAhead)` - items expiring within N days
- `getPantrySummary()` - aggregate counts for dashboard widget

### Components

- `components/inventory/pantry-dashboard.tsx` - full dashboard with location tabs, item table, inline quantity editing, add item form, drawdown trigger, low stock/expiry alerts
- `components/inventory/pantry-location-manager.tsx` - location CRUD with type selection, default toggle, delete confirmation
- `components/dashboard/pantry-alerts-widget.tsx` - compact widget showing location count, item count, low stock alerts, expiring items with links to full pantry

## Architecture Notes

- All server actions use `requireChef()` + `user.tenantId!` for tenant scoping
- All optimistic updates have try/catch with rollback (zero hallucination compliance)
- Error states show real errors, never substitute zeros
- Drawdown is pure math (no AI), aggregates recipe ingredients across event menus then subtracts from pantry items
- useEffect cleanup via cancelled flag pattern
