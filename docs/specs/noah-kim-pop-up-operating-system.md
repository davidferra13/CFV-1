# Noah Kim Pop-Up Operating System Build Spec

Status: ready for Codex execution  
Date: 2026-04-25  
Product surface: Chef portal event detail, Dinner Circles, ticketing/orders, dish index, production planning, closeout analytics  
Primary profile: Noah Kim, pastry chef and pop-up operator with rotating locations and limited drops

## Senior Engineering Recommendation

Build a focused "Pop-Up OS" vertical slice on top of the existing event system. Do not build a separate app, generic CRM, or broad Dinner Circles social feature. In this codebase, a pop-up/drop should be an `events` row with an operating layer that connects these already-present primitives:

- `event_share_settings.circle_config` for drop-specific operating configuration.
- `event_ticket_types` for sellable limited menu items and inventory caps.
- `event_tickets` for centralized orders from online checkout, manual DMs, comps, and walk-ups.
- `dish_index`, `dish_index_summary`, `recipes`, and recipe cost views for the product library.
- existing prep timeline, production report, gear/location, waste, and post-event learning flows for execution and analytics.

The MVP must let a pastry pop-up operator run this loop without rebuilding from scratch:

```text
Plan drop -> build menu from products -> forecast quantities -> open orders -> track sold/remaining -> execute day-of -> close out item performance -> reuse learning
```

## What To Build

Create a new chef-facing pop-up operating layer for event detail pages. The implementation should feel like a dense operations dashboard, not a marketing page.

### Primary Entry Points

Add or wire these chef routes:

- `/events/[id]?tab=popup` or a visible `Pop-Up OS` section on `app/(chef)/events/[id]/page.tsx`.
- `/events/[id]/ops` may link into it, but the pop-up surface must be visible from the main event detail.
- Keep existing tickets, prep, money, wrap, gear, and outcome tabs working.

### Core User Story

As Noah, I can open one upcoming pop-up and see:

- Lifecycle stage and next actions.
- Menu items with planned units, sold units, remaining units, price, unit cost, margin, and prep status.
- Suggested quantity per item based on past performance and current order velocity.
- Production batch plan by item and component.
- Location constraints that affect production.
- Centralized orders from online tickets, DMs/manual entry, comps, and walk-ups.
- Day-of readiness and execution status.
- Post-event sell-through, waste, revenue, margin, and item notes that improve future drops.

## Existing Code Anchors

Use these files before inventing new structures:

- Dinner Circle config and snapshot:
  - `lib/dinner-circles/types.ts`
  - `lib/dinner-circles/event-circle.ts`
  - `lib/dinner-circles/actions.ts`
  - `components/events/dinner-circle-command-center.tsx`
  - `database/migrations/20260425000008_event_dinner_circle_layer.sql`
- Event detail shell and tabs:
  - `app/(chef)/events/[id]/page.tsx`
  - `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx`
  - `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`
  - `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx`
  - `app/(chef)/events/[id]/_components/event-detail-wrap-tab.tsx`
- Ticketing/order ledger:
  - `lib/tickets/actions.ts`
  - `lib/tickets/purchase-actions.ts`
  - `lib/tickets/types.ts`
  - `database/migrations/20260416000004_event_ticketing.sql`
  - `database/migrations/20260425000002_ticketed_events_share_settings.sql`
- Product library and menu intelligence:
  - `lib/menus/dish-index-actions.ts`
  - `lib/menus/menu-intelligence-actions.ts`
  - `lib/menus/menu-engineering-actions.ts`
  - `database/migrations/20260327000004_dish_index.sql`
  - `database/migrations/20260422000100_post_event_learning_loop.sql`
- Production, readiness, and execution:
  - `lib/events/production-report-actions.ts`
  - `lib/events/prep-timeline.ts`
  - `lib/events/event-readiness-assistant.ts`
  - `lib/events/ops-hub-actions.ts`
  - `components/events/live-service-tracker.tsx`
  - `components/events/gear-check-client.tsx`
- Waste and post-event learning:
  - `lib/events/waste-tracking-actions.ts`
  - `components/events/post-event-learning-panel.tsx`
  - `lib/post-event/learning-actions.ts`

## Data Model

Prefer additive JSON config plus existing tables for MVP. Add a SQL migration only if a referenced column truly does not exist.

### Extend DinnerCircleConfig

In `lib/dinner-circles/types.ts`, add a `popUp` section to `DinnerCircleConfig`:

```ts
export type PopUpLifecycleStage =
  | 'concept'
  | 'menu_build'
  | 'orders_open'
  | 'production_lock'
  | 'day_of'
  | 'closed'
  | 'analyzed'

export type PopUpOrderSource =
  | 'online'
  | 'dm'
  | 'comment'
  | 'word_of_mouth'
  | 'form'
  | 'walkup'
  | 'comp'

export type PopUpMenuItemPlan = {
  ticketTypeId?: string | null
  dishIndexId?: string | null
  recipeId?: string | null
  name: string
  plannedUnits: number
  suggestedUnits?: number | null
  bufferPercent?: number | null
  batchSize?: number | null
  unitCostCents?: number | null
  priceCents?: number | null
  targetMarginPercent?: number | null
  prepLeadHours?: number | null
  productionStatus?: 'not_started' | 'prep_started' | 'batched' | 'packed' | 'ready'
  equipmentNeeded?: string[]
  constraints?: string[]
  notes?: string
}

export type PopUpLocationProfile = {
  locationKind: 'cafe_collab' | 'standalone_drop' | 'private_event' | 'market' | 'other'
  accessWindow?: string
  kitchenAccess?: string
  equipmentAvailable: string[]
  coldStorage?: string
  holdingConstraints?: string[]
  loadInNotes?: string
}

export type PopUpCloseoutItem = {
  name: string
  plannedUnits: number
  producedUnits: number
  soldUnits: number
  wastedUnits: number
  soldOutAt?: string | null
  revenueCents: number
  estimatedCostCents: number
  notes?: string
}

export type PopUpConfig = {
  stage: PopUpLifecycleStage
  dropType: 'cafe_collab' | 'weekend_drop' | 'private_dessert_event' | 'other'
  preorderOpensAt?: string | null
  preorderClosesAt?: string | null
  productionLocksAt?: string | null
  pickupWindows?: string[]
  orderSources?: PopUpOrderSource[]
  locationProfile?: PopUpLocationProfile
  menuItems: PopUpMenuItemPlan[]
  closeout?: {
    itemResults: PopUpCloseoutItem[]
    overallNotes?: string
    nextDropIdeas?: string
  }
}
```

Then include:

```ts
export type DinnerCircleConfig = {
  ...
  popUp?: PopUpConfig
}
```

Update `normalizeDinnerCircleConfig()` in `lib/dinner-circles/event-circle.ts` to provide stable defaults.

### Use Ticket Types As Limited Inventory

Each sellable pop-up menu item should map to one `event_ticket_types` row:

- `name` = product name.
- `price_cents` = selling price.
- `capacity` = planned sellable units.
- `sold_count` = sold/reserved units.
- `is_active` = available for sale.

Do not add a duplicate order table. Manual DM/form/word-of-mouth orders must create `event_tickets` using or extending existing actions:

- Use `createCompTicket()` for $0 holds.
- Use `createWalkInTicket()` for manual paid/offline orders.
- If necessary, add a narrow `createManualPopUpOrder()` wrapper in `lib/popups/actions.ts` that writes to `event_tickets` with `source` mapped to available values or encoded in `notes`.

### Use Dish Index As Product Library

Do not create a new product catalog table for MVP. Use:

- `dish_index` as the reusable product library.
- `dish_index.dna` for pastry/pop-up metadata not already covered by columns.
- `dish_index_summary` for recipe cost and rating data.
- `dish_feedback`, `event_outcome_dishes`, and ticket history for performance.

If adding typed helpers, create `lib/popups/product-library.ts` that reads from `dish_index_summary` and normalizes:

- name
- linked recipe
- season tags
- special equipment
- prep complexity
- times served
- avg rating
- recipe cost per portion
- historical sell-through

## Server Logic To Build

Create a new folder:

- `lib/popups/types.ts`
- `lib/popups/actions.ts`
- `lib/popups/forecast.ts`
- `lib/popups/snapshot.ts`

### Required Functions

Implement these tenant-scoped server functions:

```ts
getPopUpOperatingSnapshot(eventId: string): Promise<PopUpOperatingSnapshot>
updatePopUpConfig(input: { eventId: string; patch: Partial<PopUpConfig> })
addProductToPopUp(input: { eventId: string; dishIndexId: string; plannedUnits?: number })
syncPopUpMenuItemToTicketType(input: { eventId: string; item: PopUpMenuItemPlan })
createManualPopUpOrder(input: {
  eventId: string
  ticketTypeId: string
  buyerName: string
  buyerEmail?: string
  quantity: number
  paidCents: number
  source: PopUpOrderSource
  notes?: string
})
capturePopUpCloseout(input: { eventId: string; items: PopUpCloseoutItem[]; notes?: string })
```

### Snapshot Shape

`PopUpOperatingSnapshot` must include:

```ts
type PopUpOperatingSnapshot = {
  event: {
    id: string
    title: string
    date: string | null
    status: string
    location: string | null
  }
  stage: PopUpLifecycleStage
  nextActions: Array<{
    id: string
    label: string
    href?: string
    severity: 'info' | 'warning' | 'critical'
  }>
  menuItems: Array<{
    name: string
    ticketTypeId: string | null
    dishIndexId: string | null
    plannedUnits: number
    producedUnits: number
    soldUnits: number
    remainingUnits: number
    suggestedUnits: number
    priceCents: number
    unitCostCents: number | null
    marginPercent: number | null
    sellThroughPercent: number
    productionStatus: string
    forecastReason: string
  }>
  orders: {
    totalOrders: number
    totalUnits: number
    revenueCents: number
    bySource: Record<string, number>
    pickupWindows: Array<{ label: string; orderCount: number; unitCount: number }>
  }
  production: {
    totalPlannedUnits: number
    totalSoldUnits: number
    totalRemainingUnits: number
    estimatedIngredientCostCents: number
    estimatedMarginCents: number
    batchWarnings: string[]
    locationWarnings: string[]
  }
  closeout?: {
    sellThroughPercent: number
    wasteUnits: number
    wasteCostCents: number
    topItem: string | null
    underperformers: string[]
  }
}
```

### Forecasting Formula

Keep forecasting deterministic and explainable. No AI required.

For each item:

1. Start with historical demand:
   - If this `dishIndexId` has past ticketed pop-up outcomes, use median sold units.
   - Else if `dish_index.times_served > 0`, use a conservative default of event guest count or 24 units.
   - Else use planned units or 24.
2. Adjust for current preorder velocity:
   - `currentSold + max(0, daysUntilClose * averageUnitsPerDay)`
3. Add buffer:
   - default 10% for cafe collab
   - default 15% for weekend drop
   - default 5% for private dessert event
4. Cap by location constraints:
   - if equipment needed is missing, warning only for MVP
   - if cold storage is marked limited, warn when total planned cold-hold units exceed configured threshold

Every suggested quantity must include a plain-English reason.

## UI To Build

Create:

- `components/events/pop-up-operating-panel.tsx`
- `components/events/pop-up-menu-planner.tsx`
- `components/events/pop-up-order-board.tsx`
- `components/events/pop-up-production-board.tsx`
- `components/events/pop-up-location-constraints.tsx`
- `components/events/pop-up-closeout-panel.tsx`

Use existing UI primitives from `components/ui/*`. Use lucide icons. Keep layout dense, operational, and scannable.

### Pop-Up Operating Panel

Render at the event detail level with these sections:

1. Header
   - Drop type
   - lifecycle stage segmented control
   - date/time
   - preorder window
   - primary status badges

2. Command Strip
   - Orders sold / planned
   - Remaining units
   - projected revenue
   - estimated margin
   - production lock status

3. Menu Planner
   - item rows from `PopUpOperatingSnapshot.menuItems`
   - add from product library
   - edit planned units
   - sync capacity to ticket type
   - show cost, price, margin, suggested quantity

4. Order Board
   - grouped by item and source
   - manual order form for DM/comment/word-of-mouth/form
   - sold/remaining updates from `event_tickets`
   - cannot oversell if ticket type capacity is reached

5. Production Board
   - planned vs sold vs produced
   - batch size and batch count
   - prep status per item
   - warnings for missing cost, missing recipe, missing equipment, and location constraints

6. Location Constraints
   - equipment available
   - access window
   - cold storage
   - load-in notes
   - warning list tied to item equipment needs

7. Closeout
   - available when event status is completed or stage is `closed`
   - capture produced, sold, wasted, sold-out time, notes per item
   - show sell-through and waste
   - write closeout into `circle_config.popUp.closeout`
   - if feasible, also write matching `event_outcome_dishes` rows or update existing outcome records

### Design Constraints

- No hero sections.
- No marketing copy.
- No nested cards inside cards.
- Dense grid/table layout is preferred.
- Text must not overflow on mobile.
- Mobile should collapse into stacked operational sections.
- Use stable dimensions for small stat boxes and icon buttons.

## Acceptance Criteria

The build passes only if all of this works:

1. A chef can open an event and see a Pop-Up OS dashboard without breaking the existing event detail page.
2. A chef can mark the event as cafe collab, weekend drop, private dessert event, or other.
3. A chef can add product-library items from `dish_index` to the drop.
4. Added products can become sellable ticket types with capacity and price.
5. Ticket type capacity is treated as item inventory.
6. Paid online tickets, manual orders, comps, and walk-ups appear in one order board.
7. Sold/remaining values are computed from real `event_ticket_types` and `event_tickets`.
8. Suggested quantity appears for every item and explains the reason.
9. Unit cost and margin appear when recipe cost data exists; missing cost is flagged.
10. Location/equipment constraints produce visible warnings.
11. Day-of production status can be updated per item.
12. Closeout captures produced, sold, wasted, sold-out time, and notes.
13. Post-event sell-through and waste are visible.
14. Data persists after reload via `event_share_settings.circle_config`.
15. Existing tickets, public event page, Dinner Circle links, prep, money, and wrap tabs still work.

## Tests

Add focused unit tests:

- `tests/unit/pop-up-forecast.test.ts`
  - deterministic suggested quantities
  - buffer by drop type
  - preorder velocity adjustment
  - missing history fallback

- `tests/unit/pop-up-snapshot.test.ts`
  - computes sold/remaining from ticket types and tickets
  - computes revenue and margin
  - emits location warnings
  - emits missing recipe/cost warnings

- Extend or add a surface guard test:
  - event detail can import/render the pop-up panel without throwing
  - Dinner Circle config normalization preserves existing fields and adds `popUp`

Run:

```bash
npm run test:unit -- tests/unit/pop-up-forecast.test.ts tests/unit/pop-up-snapshot.test.ts
npm run typecheck
```

If full typecheck is blocked by unrelated existing repo errors, report the blocker and still run the focused unit tests.

## Agent Split

Use four agents if building in parallel. Keep write scopes disjoint.

### Agent 1: Data And Server Logic

Owns:

- `lib/dinner-circles/types.ts`
- `lib/dinner-circles/event-circle.ts`
- `lib/popups/*`
- unit tests for forecast/snapshot

Build:

- `PopUpConfig` types and normalization.
- deterministic forecast logic.
- operating snapshot builder.
- server actions for config update, adding product, syncing ticket type, manual order, closeout.

Do not edit React components except to satisfy type exports if unavoidable.

### Agent 2: Chef UI

Owns:

- `components/events/pop-up-*.tsx`
- integration point in `app/(chef)/events/[id]/page.tsx`
- optional event detail tab/mobile nav wiring

Build:

- Pop-Up OS dashboard.
- menu planner.
- order board.
- production board.
- location constraints.
- closeout panel.

Do not change ticketing server actions beyond imports/types.

### Agent 3: Product Library And Order Workflow

Owns:

- `lib/popups/product-library.ts`
- small additions to `lib/menus/dish-index-actions.ts` only if needed
- small additions to `lib/tickets/actions.ts` only if needed
- tests for product/order helpers

Build:

- product-library query adapter from `dish_index_summary`.
- add-from-library behavior.
- manual order behavior using existing ticket ledger.
- oversell guard checks.

Avoid changing event page UI.

### Agent 4: Analytics, Closeout, Verification

Owns:

- closeout integration in `lib/popups/actions.ts` if Agent 1 leaves TODO hooks
- `components/events/pop-up-closeout-panel.tsx` if not already complete
- tests around closeout/sell-through
- docs update in `docs/changes/`

Build:

- closeout persistence.
- sell-through and waste analytics.
- bridge to `event_outcome_dishes` where practical.
- final verification pass.

Do not rewrite the dashboard built by Agent 2.

## Definition Of Done

The feature is done when Noah can run the three upcoming pop-ups in one month as three reusable event/drop records:

- cafe collaboration, 2 days
- standalone weekend drop
- private dessert event

Each drop must preserve menu, prices, quantities, orders, production state, location constraints, and closeout analytics after the event. The next drop must be able to use prior item data rather than starting from memory.
