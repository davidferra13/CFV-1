# Menu System Upgrade: Phase 1 Implementation

> Phase 1 (Core Automation) of the menu system upgrade designed in `docs/menu-system-upgrade-design.md`.
> Research foundations: `docs/research-menu-upgrade-foundations.md`.

## What Was Built

### Server Actions (`lib/menus/menu-intelligence-actions.ts`)

Six new server actions, all deterministic (Formula > AI), zero LLM calls:

| Action                                    | Purpose                                                                                                   | Returns                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `checkMenuMargins(menuId)`                | Reads `menu_cost_summary` view, computes margin alerts                                                    | Alerts array + cost breakdown                   |
| `getMenuBreakdown(menuId)`                | Full hierarchy: Menu > Course > Dish > Component > Recipe > Ingredient with costs at every level          | `MenuCostBreakdown` tree                        |
| `scaleMenuToGuestCount(menuId, newCount)` | Auto-recalculates all component `scale_factor` values when guest count changes                            | `ScalingSummary` with per-component adjustments |
| `getIngredientPriceAlerts()`              | Finds ingredients where `last_price_cents > average_price_cents * 1.3` (30% spike)                        | `PriceAlert[]` with affected menus              |
| `initializeMenuForEvent(eventId)`         | Auto-creates a draft menu pre-populated with event context (occasion, season, guest tier, client dietary) | Menu ID + context tags                          |
| `getMenuContextData(menuId)`              | Loads client dietary, past menus for same client, matching templates                                      | Structured context for sidebar                  |

### Margin Alert Thresholds

| Food Cost %           | Level    | Message                               |
| --------------------- | -------- | ------------------------------------- |
| > 45%                 | Critical | "You may be losing money"             |
| > 35%                 | Warning  | "Food cost above target (25-30%)"     |
| Missing prices        | Warning  | "N ingredients missing prices"        |
| Ingredient 30%+ spike | Warning  | Price spike alert with affected menus |

### Guest Count Scaling Logic

- If recipe has `yield_quantity`: `new_scale = newGuestCount / yieldQuantity`
- If no yield data: `new_scale = previousScale * (newCount / oldCount)`
- Flags when `scale > 3x` (consider batch splitting)
- Flags when `scale < 0.5x` (small batch, adjust seasoning)
- Also updates linked event's `guest_count`

### UI Components

| Component            | File                                           | What It Shows                                                                                                                                       |
| -------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MenuCostSidebar`    | `components/culinary/menu-cost-sidebar.tsx`    | Hero food cost %, total cost, cost/guest, margin alerts. Sticky right column on desktop.                                                            |
| `MenuBreakdownView`  | `components/culinary/menu-breakdown-view.tsx`  | Collapsible tree: Course > Dish > Component > Ingredient. Each node shows scaled quantity and cost. Missing prices highlighted.                     |
| `MenuScaleDialog`    | `components/culinary/menu-scale-dialog.tsx`    | Compact toggle button showing current guest count. Expands to show new count input, scale ratio preview, and post-scale adjustments.                |
| `MenuContextSidebar` | `components/culinary/menu-context-sidebar.tsx` | Season/guest tier badges, client allergy warnings (red), dietary restrictions (amber), previous menus for same client (linked), matching templates. |
| `InitMenuButton`     | `components/culinary/init-menu-button.tsx`     | "Create Menu" button for events without a menu. Calls `initializeMenuForEvent`, navigates to new menu.                                              |
| `PriceAlertsWidget`  | `components/culinary/price-alerts-widget.tsx`  | Dashboard widget showing ingredient price spikes. "All clear" when none detected.                                                                   |

### Page Integrations

**Menu Detail Page** (`app/(chef)/culinary/menus/[id]/page.tsx`)

- Layout changed from single column (max-w-3xl) to main + sidebar (max-w-7xl)
- Main column: hero image + menu editor + cost breakdown view
- Sidebar (lg+): cost sidebar + context sidebar
- Scale dialog in top bar

**Culinary Hub** (`app/(chef)/culinary/page.tsx`)

- Added `PriceAlertsWidget` between stats and nav tiles

### Type Addition

Added `menu_initialized_for_event` to `ChefActivityAction` in `lib/activity/chef-types.ts`.

## What Was NOT Built (Phase 2-4)

Per the design doc, these are deferred to subsequent phases:

- **Phase 2 (Assembly):** Drag-drop menu assembly from templates/past menus/recipe bible
- **Phase 3 (Tracking):** Menu lifecycle dashboard, revision history, food cost trend
- **Phase 4 (Documents):** Auto-generated document packs (prep sheets, grocery lists, equipment checklists)

Also deferred:

- Unit conversion normalization layer (research complete, needs ingredient table migration)
- Equipment inference from menu content (research complete, needs new table)
- Non-linear scaling for salt/spice/leavening (constants defined but not wired into scaling yet, requires ingredient category awareness in recipe_ingredients)

## Validation

- TypeScript: zero new errors (`npx tsc --noEmit --skipLibCheck`)
- All new files compile cleanly
- Design patterns followed: tenant scoping, `requireChef()`, `revalidatePath`, non-blocking activity logging, error handling with `UnknownAppError`
- Zero Hallucination compliance: all catch blocks show error states (never zeros), no optimistic updates without rollback, missing prices shown as "N/A" not "$0.00"
- No schema changes required (all new actions use existing views and tables)

## Files Created/Modified

### Created

- `lib/menus/menu-intelligence-actions.ts` (6 server actions, ~600 lines)
- `components/culinary/menu-cost-sidebar.tsx`
- `components/culinary/menu-breakdown-view.tsx`
- `components/culinary/menu-scale-dialog.tsx`
- `components/culinary/menu-context-sidebar.tsx`
- `components/culinary/init-menu-button.tsx`
- `components/culinary/price-alerts-widget.tsx`
- `docs/menu-system-upgrade-phase1-implementation.md` (this file)

### Modified

- `app/(chef)/culinary/menus/[id]/page.tsx` (layout upgrade, sidebar integration)
- `app/(chef)/culinary/page.tsx` (price alerts widget)
- `lib/activity/chef-types.ts` (new action type)
