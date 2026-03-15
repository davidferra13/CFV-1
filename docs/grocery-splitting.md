# Multi-Client Grocery Splitting (Feature 1.6)

## What It Does

When a chef shops for multiple clients in one grocery trip, this feature lets them split the receipt across clients' invoices proportionally. Tracks individual items, supports multiple split methods, and shows per-client cost breakdowns.

## Database Tables

### `grocery_trips`
One row per shopping trip. Tied to the chef via `chef_id`.
- `store_name`, `trip_date`, `total_cents` (auto-computed from items), `notes`

### `grocery_trip_items`
Individual line items on a receipt.
- `item_name`, `quantity`, `unit`, `price_cents`, `category`
- Categories: produce, protein, dairy, pantry, frozen, bakery, beverage, other

### `grocery_trip_splits`
How costs are divided across clients.
- Can reference a specific `item_id` (per-item assignment) or just `trip_id` (bulk split)
- Optional `event_id` to tie the cost to a specific event
- `split_method`: equal, proportional, manual, full

## Split Methods

### Equal Split
Divides `total_cents` by number of clients. Remainder cents go to the first client. Deterministic, no rounding errors.

### Proportional Split (by weight)
Each client gets a weight (e.g., guest count). Share = floor(weight/totalWeight * total). Remainder cents assigned to first client.

### Per-Item Assignment
Each item is assigned to a specific client. Their share equals the item's price. Unassigned items show as "unallocated" in the preview.

### Auto-Split by Event
Uses event `guest_count` as weight for proportional splitting. Events without a guest count default to weight of 1.

## Components

### `GroceryTripForm`
Create a trip with store name, date, and line items. Shows running total with category color badges. Items are persisted to the server as they are added.

### `GrocerySplitManager`
Select clients, choose a split method, preview the per-client breakdown (with percentage bars), and apply. Supports all three split modes with live preview before saving.

### `GroceryTripHistory`
Lists past trips with date, store, total, and client count. Date range filter. Click to view/edit. Delete with optimistic UI + rollback.

## Server Actions

All in `lib/grocery/grocery-splitting-actions.ts`. Every action uses `requireChef()` for auth and scopes queries to `user.tenantId!`. All money in cents. All split math is deterministic (Formula > AI).

| Action | Purpose |
|--------|---------|
| `createGroceryTrip` | Create a new trip |
| `getGroceryTrips` | List trips (optional date range) |
| `getGroceryTrip` | Single trip with items and splits |
| `deleteGroceryTrip` | Delete a trip (cascades items + splits) |
| `addTripItem` | Add line item, recalc total |
| `updateTripItem` | Edit line item, recalc total |
| `removeTripItem` | Remove line item, recalc total |
| `splitEquallyAcrossClients` | Divide total equally |
| `splitProportionally` | Divide by weight |
| `assignItemToClient` | Assign one item to one client |
| `autoSplitByEvent` | Split by event guest count |
| `getTripSplitSummary` | Per-client aggregated totals |

## RLS / Security

All three tables have RLS enabled. Policies scope access to the chef's own data via `auth.uid()`. Items and splits use EXISTS subqueries against `grocery_trips.chef_id`.

## Design Decisions

- **Formula > AI:** All split calculations are pure math. No LLM involved.
- **Cents only:** All monetary values stored and computed as integers (cents). No floating point.
- **Remainder handling:** When dividing doesn't split evenly, leftover cents go to the first client in the list. This keeps the total exact.
- **Optimistic UI with rollback:** All client-side mutations use `startTransition` with try/catch and restore previous state on failure.
- **Trip total auto-computed:** `total_cents` on the trip is recalculated every time items are added, updated, or removed.
