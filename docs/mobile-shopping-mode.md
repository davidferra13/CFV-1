# Mobile Shopping Mode

## Overview

A mobile-optimized shopping experience for chefs who shop for groceries 2-3x per week. Chefs can create shopping lists (manually or from event menus), check off items in-store organized by category/aisle, track estimated vs actual prices, and convert completed lists into expense entries.

## Database

**Table:** `shopping_lists` (migration: `20260330000080_shopping_lists.sql`)

- `id` (uuid, PK)
- `chef_id` (uuid, FK to chefs) - scoped via RLS
- `name` (text) - e.g. "Saturday Dinner Shopping"
- `event_id` (uuid, optional FK to events)
- `items` (jsonb) - array of shopping items with name, quantity, unit, category, checked status, estimated/actual prices, vendor, notes
- `status` (text) - 'active' or 'completed'
- `total_estimated_cents` / `total_actual_cents` (int)
- `completed_at` (timestamptz)
- `created_at` / `updated_at` (timestamptz, auto-managed)

## Server Actions

**File:** `lib/shopping/actions.ts`

| Action | Description |
|--------|-------------|
| `createShoppingList` | Manual list creation with name and items |
| `createShoppingListFromEvent` | Generate from event's menu/recipes using existing grocery list logic |
| `getActiveShoppingLists` | Fetch all lists for current chef |
| `getShoppingList` | Fetch single list by ID |
| `toggleItem` | Check/uncheck an item (optimistic in UI) |
| `updateItemPrice` | Enter actual price while shopping |
| `updateShoppingList` | Update name or items |
| `completeShoppingList` | Mark list done, compute totals |
| `convertToExpense` | Create expense entry from completed list total |

## Pages

| Route | Description |
|-------|-------------|
| `/shopping` | List view: active lists with progress bars, completed lists below |
| `/shopping/new` | Manual creation form with item entry |
| `/shopping/[id]` | Shopping mode detail: the mobile-optimized shopping experience |

## Shopping Mode Detail (Key Page)

Mobile-optimized features:
- **Large tap targets**: 40px round checkboxes for easy phone use
- **Category grouping**: Items organized by Produce, Protein, Dairy, Bakery, Pantry, Frozen, Beverages, Spices/Seasonings, Other
- **Check-off flow**: Tap to check, item gets strikethrough and moves to bottom of its category
- **Price entry**: Tap the price badge on any item to enter actual cost while shopping
- **Running totals**: Progress bar + item count + estimated vs actual costs in sticky header
- **Wake lock**: Uses Screen Wake Lock API to keep phone screen on while shopping
- **Done button**: Fixed at bottom, completes the list and allows conversion to expense
- **Sticky category headers**: Stay visible while scrolling through long lists

## Integration Points

1. **Grocery List PDF** (Document Section): Added "Shop" button next to the grocery list document on event detail pages. Creates a shopping list from the event's menu/recipes and navigates to shopping mode.

2. **Expense System**: Completed shopping lists can be converted to expenses via `convertToExpense()`, which calls the existing `createExpense` action with category `food_cost`.

3. **Navigation**: Added to Operations Tools in the sidebar nav (`/shopping`).

## Category Order (matches typical grocery store layout)

1. Produce
2. Protein (maps from DB: protein)
3. Dairy (maps from DB: dairy)
4. Bakery
5. Pantry (maps from DB: pantry, baking, canned, condiment, oil)
6. Frozen (maps from DB: frozen)
7. Beverages (maps from DB: beverage, alcohol)
8. Spices/Seasonings (maps from DB: spice, dry_herb)
9. Other (maps from DB: specialty, other)
