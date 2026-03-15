# Feature 1.8: Shopping List by Store

## Overview

Organizes grocery items by which store has what. Chefs can set up their preferred stores (Costco for bulk, farmers market for produce, specialty store for imported items, etc.) and assign specific ingredients to specific stores. When generating a shopping list, items are automatically split by store based on saved assignments.

## How It Works

1. **Add preferred stores** - Chef sets up their go-to stores with type, address, and notes. One store can be marked as default (unassigned items go there).

2. **Assign items to stores** - When the chef moves an item to a different store in the split view, they can check "Remember this assignment" to save the mapping for future lists.

3. **Split a grocery list** - The `splitListByStore()` action takes a flat list of items and splits them by store using keyword-based lookup. No AI involved (Formula > AI).

4. **Matching logic** - Exact keyword match first, then substring match. For example, if "salmon" is assigned to the fishmonger, then "wild salmon fillets" will also route there.

## Database Tables

### `chef_preferred_stores`
Stores a chef's preferred shopping locations.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| chef_id | uuid | FK to chefs |
| store_name | text | Unique per chef |
| store_type | text | supermarket, costco_wholesale, farmers_market, specialty, butcher, fishmonger, bakery, international, online, other |
| address | text | Optional |
| notes | text | Optional |
| is_default | boolean | Unassigned items go here |
| sort_order | int | Display order |

### `store_item_assignments`
Maps ingredient keywords to stores for a chef.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| chef_id | uuid | FK to chefs |
| ingredient_keyword | text | Normalized lowercase, unique per chef |
| store_id | uuid | FK to chef_preferred_stores |
| reason | text | best_price, best_quality, only_source, convenience |

## Server Actions

All in `lib/grocery/store-shopping-actions.ts`:

- `getPreferredStores()` - List chef's stores ordered by sort_order
- `addPreferredStore(data)` - Add a store (auto-unsets other defaults if is_default)
- `updatePreferredStore(id, data)` - Update store details
- `deletePreferredStore(id)` - Remove store (cascades item assignments)
- `assignItemToStore(keyword, storeId, reason?)` - Upsert ingredient-to-store mapping
- `getStoreAssignments()` - All mappings with store details
- `deleteStoreAssignment(id)` - Remove a mapping
- `getStoreShoppingList(storeId)` - Items assigned to one store
- `bulkAssignItems(assignments[])` - Batch upsert
- `splitListByStore(items[])` - Split a flat list by store

## UI Components

### StoreManager (`components/grocery/store-manager.tsx`)
Manage preferred stores: add, edit, delete, reorder, set default.

### StoreSplitView (`components/grocery/store-split-view.tsx`)
Displays a grocery list split by store. Each store section is collapsible. Items can be moved between stores with a click. Supports print mode.

### ItemStoreAssignment (`components/grocery/item-store-assignment.tsx`)
View and manage all saved item-to-store assignments. Supports search, filter by store, edit, delete, and bulk reassignment.

## Integration Points

- Connects with existing grocery/shopping list features
- Works with the ingredient system (keyword-based, not ID-based, for flexibility)
- All data is tenant-scoped via RLS and server-side chef_id checks
