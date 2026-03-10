# Food Truck: Menu Board + Par Planning

Two features for food truck operations: a customer-facing menu display and a pre-service prep calculator.

## Feature 1: Quick-Service Menu Board

### What it does

A simplified menu display designed for a truck window TV or tablet. Shows menu items with prices, categories, dietary tags, allergen icons, and 86'd status. Auto-refreshes every 60 seconds.

### How it works

- Pulls from the existing `recipes` table (no new tables needed)
- Menu board metadata (price, availability, "daily special" flag, sort order) is stored in each recipe's `notes` field using a structured comment tag: `<!-- _menuBoard:{...} -->`
- Allergen data is derived from `recipe_ingredients` joined to `ingredients.allergen_flags`
- Recipe categories (`recipe_category` enum) are mapped to display-friendly names (e.g. `protein` -> "Mains", `beverage` -> "Drinks")

### Pages

| Route                            | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `/food-truck/menu-board`         | Admin view: manage items, set prices, 86 items       |
| `/food-truck/menu-board/display` | Full-screen display for truck window (no nav chrome) |

### Server actions (`lib/food-truck/menu-board-actions.ts`)

- `getMenuBoardItems()` - fetches active items grouped by category with prices, descriptions, allergens
- `toggleItemAvailability(itemId, available)` - 86 an item or bring it back
- `updateMenuBoardItemPrice(itemId, priceCents, isSpecial, sortOrder)` - set/update price and flags
- `getAllRecipesForBoard()` - list all recipes showing which are on the board

### Components

- `components/food-truck/menu-board-display.tsx` - the display component (grid or list layout, dark theme, large fonts, auto-refresh)
- `components/food-truck/menu-board-admin.tsx` - admin panel (toggle availability, set prices, add/remove items)

### Allergen/dietary icons

Displayed as small colored badges: GF (Gluten Free), DF (Dairy Free), NF (Nut Free), VG (Vegan), V (Vegetarian), K (Keto), P (Paleo).

### Display settings

Default settings are baked in (font: large, layout: list, accent: amber, refresh: 60s). A future iteration could persist these per-chef.

---

## Feature 2: Pre-Service Par Planning

### What it does

Deterministic calculation of how much to prep based on expected covers. No AI involved (Formula > AI).

### How it works

1. Chef enters a date, expected cover count, and optional buffer percentage (default 15%)
2. System loads all recipes on the menu board and their ingredients
3. Distributes expected covers evenly across menu items
4. Calculates quantity needed per ingredient: `(covers / recipe_servings) * ingredient_quantity * buffer_multiplier`
5. Compares against current inventory (if available)
6. Returns items sorted by priority (critical -> low -> good)

### Page

| Route                      | Purpose                           |
| -------------------------- | --------------------------------- |
| `/food-truck/par-planning` | Par calculator with results table |

### Server actions (`lib/food-truck/par-planning-actions.ts`)

- `calculateParLevels(date, expectedCovers, bufferPercent)` - deterministic par calculation
- `getHistoricalParAccuracy(days)` - stub for future historical accuracy tracking
- `saveParOverrides(date, overrides)` - manual quantity adjustments

### Component (`components/food-truck/par-planning.tsx`)

- Date selector + expected covers input + buffer % input
- "Calculate Par Levels" button
- Summary cards: items to prep, total ingredients, estimated prep time
- Results table: ingredient, par level, current stock, need to prep, priority, manual override
- Priority color coding: red (critical), amber (low), green (good)
- "Generate Prep List" button copies a formatted checklist to clipboard

### Priority logic

- `critical`: current stock < 25% of par level
- `low`: current stock 25-75% of par level
- `good`: current stock > 75% of par level

### Future considerations

- Historical accuracy tracking once actual usage data is collected
- Integration with `inventory_counts` table when available
- Weighted distribution across menu items (popular items get higher allocation)
- Per-item portion size overrides
