# Wine & Beverage Program

## Overview

Adds beverage management to ChefFlow, allowing private chefs to track wine/cocktail inventory, pair beverages with menu courses, and calculate beverage costs separately from food costs.

## Database

**Migration:** `supabase/migrations/20260308000001_beverages.sql`

Two new tables (additive, no existing tables modified):

### `beverages`
- Chef's beverage library (wines, cocktails, mocktails, beer, spirits, non-alcoholic)
- Tracks cost, markup %, sell price, serving size, servings per unit
- Wine-specific: region, vintage, subtype (red/white/rose/sparkling/dessert)
- Cocktail-specific: recipe/method text, subtype (classic/tiki/modern)
- Tags for flavor profiles (bold, light, fruity, dry, sweet, etc.)
- RLS: chef_id scoping via user_roles lookup

### `menu_beverage_pairings`
- Links beverages to specific dishes/courses on a menu
- Stores pairing notes per dish-beverage combination
- RLS: chef_id scoping via user_roles lookup

## Server Actions

**File:** `lib/beverages/actions.ts`

| Action | What it does |
|--------|-------------|
| `createBeverage(data)` | Add a beverage to the library |
| `updateBeverage(id, data)` | Edit an existing beverage |
| `deleteBeverage(id)` | Remove a beverage |
| `getBeverages(filters?)` | List beverages with optional type/search/active filters |
| `getBeverage(id)` | Get a single beverage |
| `addPairingToMenu(menuId, dishName, beverageId, note?, courseNumber?)` | Pair a beverage with a dish |
| `removePairing(pairingId)` | Remove a pairing |
| `getMenuPairings(menuId)` | Get all pairings for a menu (with beverage data) |
| `calculateBeverageCostForEvent(eventId)` | Total beverage cost/sell for an event's menus |

All actions use `requireChef()` and scope queries by `chef_id` from the session.

## UI Components

### Beverage Library Page
- **Route:** `/culinary/beverages`
- **File:** `app/(chef)/culinary/beverages/page.tsx` + `beverage-library-client.tsx`
- Tabs: All, Wine, Cocktails, Mocktails, Beer, Spirits, Non-Alcoholic
- Card grid showing name, type badge, cost, sell price, margin
- Search bar for filtering by name
- Add/edit forms inline (no separate page)
- Delete with confirmation

### Beverage Form
- **File:** `components/beverages/beverage-form.tsx`
- Conditional fields based on type (wine shows region/vintage, cocktail shows recipe)
- Auto-calculates sell price from cost + markup %
- Tag selection (toggle buttons for common flavor profiles)

### Menu Pairing Editor
- **File:** `components/beverages/menu-pairing-editor.tsx`
- Integrated into menu detail page (`/culinary/menus/[id]`)
- Shows each course/dish with paired beverages
- Inline add form: select beverage from library, add pairing note
- Displays total beverage cost and sell price for the menu

## Navigation

Added "Beverages" to the Menus & Recipes nav group (advanced visibility) using the `GlassWater` icon from lucide-react.

## Pricing Model

- All prices stored in cents (integers)
- Default markup: 200% (2x cost, typical for beverage programs)
- Sell price can be auto-calculated from cost + markup or manually overridden
- Margin displayed as percentage on cards: `(sell - cost) / sell * 100`

## Integration Points

- Menu detail page now shows beverage pairings below the dish editor
- `calculateBeverageCostForEvent()` available for event financial summary integration
- Beverage costs kept separate from food costs for clearer P&L
