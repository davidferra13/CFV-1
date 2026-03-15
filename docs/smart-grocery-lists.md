# Feature 1.7: Smart Grocery Lists

## Overview

Editable, reorderable grocery lists grouped by aisle/section with smart auto-assignment. Chefs can create shopping lists, add items that get automatically categorized into grocery store sections, check off items while shopping, and save aisle preferences per store.

## Architecture

### Database Tables

- **`smart_grocery_lists`** - Top-level list with name, optional event link, and status (active/completed/archived)
- **`smart_grocery_items`** - Line items with name, quantity, unit, aisle section, checked state, sort order, and optional price estimate
- **`aisle_preferences`** - Chef's learned aisle mappings per store (keyword to aisle section), used to override default detection

All tables are RLS-protected and scoped to `chef_id` via `user_roles`.

### Aisle Sections (17 categories)

produce, meat_seafood, dairy_eggs, bakery, frozen, pantry_dry, canned, condiments_sauces, spices, beverages, deli, bulk, international, baking, snacks, household, other

### Smart Aisle Detection (Formula > AI)

Aisle assignment is entirely deterministic (no AI). The system uses a keyword map with 300+ food terms to match item names to aisle sections. The matching logic:

1. Multi-word keywords checked first (substring match)
2. Single-word keywords checked next (exact word match, including simple plurals)
3. Chef's saved aisle preferences override the defaults
4. Falls back to "other" if no match found

This approach is instant, free, works offline, and returns the same result every time.

### Server Actions

All in `lib/grocery/smart-list-actions.ts`:

| Action | Purpose |
|---|---|
| `createSmartList` | Create a new list |
| `getSmartLists` | List all, optionally filtered by status |
| `getSmartList` | Get a single list with all items |
| `addItem` | Add item with auto-aisle detection |
| `updateItem` | Update item fields |
| `removeItem` | Delete item |
| `toggleItemChecked` | Check/uncheck item |
| `reorderItems` | Reorder items by updating sort_order |
| `completeList` | Mark list as completed |
| `archiveList` | Archive list |
| `duplicateList` | Copy a list (items unchecked) |
| `autoAssignAisles` | Re-run aisle detection on all items |
| `saveAislePreference` | Save a store-specific aisle override |

### Components

- **`SmartListManager`** (`components/grocery/smart-list-manager.tsx`) - Grid view of all lists with create, duplicate, archive, and status filtering
- **`SmartListView`** (`components/grocery/smart-list-view.tsx`) - Single list view with items grouped by aisle, inline editing, reordering, progress bar, auto-assign button, and print mode

### UI Features

- Items grouped by aisle with colored section headers
- Checkbox to mark items (struck through when checked)
- Inline edit for quantity and notes
- Up/down reorder buttons within each section
- Add item form with name, quantity, unit fields
- Progress bar showing checked vs total items
- Print mode (simplified layout, large font)
- Status filter tabs (All, Active, Completed, Archived)
- List cards show item count and completion percentage

### Patterns Used

- `requireChef()` + `user.tenantId!` for auth and tenant scoping
- `startTransition` with `try/catch` + rollback on all mutations
- Optimistic updates with previous state restore on failure
- `revalidatePath('/grocery')` for cache invalidation
- `randomUUID()` for all IDs
- Money in cents (`price_estimate_cents`)

## Files

| File | Type |
|---|---|
| `supabase/migrations/20260401000034_smart_grocery_lists.sql` | Migration |
| `lib/grocery/smart-list-actions.ts` | Server actions |
| `components/grocery/smart-list-view.tsx` | List detail view |
| `components/grocery/smart-list-manager.tsx` | List grid manager |
| `docs/smart-grocery-lists.md` | This doc |
