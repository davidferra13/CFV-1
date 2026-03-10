# Menu Engineering Matrix (Feature U12)

## What It Does

Auto-plots every menu item on a classic popularity vs profitability grid. Uses the four standard menu engineering quadrants:

- **Stars** (high popularity, high profit): Promote these. Keep them front and center.
- **Plow Horses** (high popularity, low profit): Reprice or reduce ingredient costs.
- **Puzzles** (low popularity, high profit): Market better, reposition on menus.
- **Dogs** (low popularity, low profit): Consider removing or replacing.

## How It Works

All calculations are deterministic (Formula > AI). No LLM calls.

### Data Sources

- **Popularity**: Count of times each dish (by `course_name`) appears across completed events in the period.
- **Revenue**: Event's `quoted_price_cents` divided evenly among its dishes.
- **Food Cost**: Sum of `recipe_cost_summary.total_ingredient_cost_cents` for all components in each dish (via `components` -> `recipe_cost_summary` view).
- **Profit**: Revenue minus food cost per dish.
- **Margin**: Profit / Revenue as a percentage.

### Quadrant Assignment

Each item is compared against the averages:

- Popularity % > average AND margin % > average = Star
- Popularity % > average AND margin % <= average = Plow Horse
- Popularity % <= average AND margin % > average = Puzzle
- Popularity % <= average AND margin % <= average = Dog

### Period Selection

Default is 30 days. User can choose 7, 14, 30, 60, or 90 days.

## Server Actions

File: `lib/analytics/menu-engineering-actions.ts`

| Action                                        | Purpose                                                    |
| --------------------------------------------- | ---------------------------------------------------------- |
| `getMenuEngineering(days?)`                   | Core matrix data: items with metrics + quadrant + averages |
| `getMenuMix(days?)`                           | Category breakdown (% of sales per course name)            |
| `getItemTrend(itemName, days?)`               | Weekly sales trend for a specific item                     |
| `getMenuEngineeringRecommendations(days?)`    | Deterministic suggestions per item based on quadrant       |
| `getMenuPriceImpact(itemName, newPriceCents)` | Simulate: how does a price change affect the quadrant?     |

All actions use `requireChef()` and scope by `user.tenantId!`.

## UI Component

File: `components/analytics/menu-engineering-matrix.tsx`

- Period selector (7/14/30/60/90 days)
- CSS-based scatter plot grid (no chart library)
  - X-axis: Popularity (% of total units)
  - Y-axis: Profit Margin %
  - Quadrant backgrounds: green (Stars), blue (Puzzles), amber (Plow Horses), red (Dogs)
  - Circles sized by revenue, colored by quadrant
  - Click to select and see detail panel
- Sortable items table with quadrant filter buttons
- Recommendations panel with actionable suggestions
- Price impact simulator (pick item, enter new price, see quadrant change)
- All data fetching uses `startTransition` with `try/catch` and error states

## Page

Route: `/analytics/menu-engineering`
File: `app/(chef)/analytics/menu-engineering/page.tsx`

## Tier

This is an analytics feature. Currently ungated (available to all users). Can be assigned to a Pro module if needed.

## Tables Used

- `events` (status, event_date, quoted_price_cents, guest_count)
- `menus` (event_id)
- `dishes` (menu_id, course_name)
- `components` (dish_id, recipe_id)
- `recipe_cost_summary` view (recipe_id, total_ingredient_cost_cents)
