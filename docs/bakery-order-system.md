# Bakery Order System

Custom cake, pastry, and bakery order management for ChefFlow.

## Overview

Two features for bakery operations:

1. **Custom Cake/Pastry Order Form** - intake form for all bakery order types
2. **Production Board** - kanban-style view of all active orders by status

## Architecture

### Database

Table: `bakery_orders` (migration `20260331000018_bakery_orders.sql`)

- Tenant-scoped via `tenant_id` referencing `chefs(id)`
- Optional link to existing clients via `client_id`
- Supports 6 order types: cake, cupcakes, pastry, bread, cookies, custom
- Layer-by-layer flavor configuration stored as JSONB
- 9-status workflow: inquiry > quoted > deposit_paid > in_production > decorating > ready > picked_up/delivered > cancelled
- RLS enforced on `tenant_id`
- Indexed on `(tenant_id, pickup_date)` and `(tenant_id, status)`

### Server Actions

File: `lib/bakery/order-actions.ts`

| Action               | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `createBakeryOrder`  | Create new order with full specs                                          |
| `updateBakeryOrder`  | Partial update of any fields                                              |
| `deleteBakeryOrder`  | Remove an order                                                           |
| `getBakeryOrder`     | Get single order by ID                                                    |
| `getAllBakeryOrders` | All orders for tenant, sorted by pickup date                              |
| `getOrdersByStatus`  | Filter by workflow status                                                 |
| `getOrdersByDate`    | Orders for a specific pickup date                                         |
| `getUpcomingOrders`  | Next N days of active orders (default 7)                                  |
| `advanceOrderStatus` | Move to next status in workflow                                           |
| `cancelBakeryOrder`  | Set status to cancelled                                                   |
| `getOrderStats`      | Deterministic stats: total orders, avg value, popular type, status counts |

All actions use `requireChef()` and scope queries to `user.tenantId!`. Monetary values in cents.

### Components

| File                                     | Type   | Description                                                    |
| ---------------------------------------- | ------ | -------------------------------------------------------------- |
| `components/bakery/cake-order-form.tsx`  | Client | Multi-section form with conditional fields based on order type |
| `components/bakery/production-board.tsx` | Client | Kanban board with urgency color coding and detail modal        |

### Pages

| Route                | Description                                   |
| -------------------- | --------------------------------------------- |
| `/bakery/orders`     | Production board showing all orders by status |
| `/bakery/orders/new` | New order form with client picker             |

## Order Form Sections

1. **Customer Info** - name (required), phone, email, optional link to existing client
2. **Order Type** - visual selector for cake/cupcakes/pastry/bread/cookies/custom
3. **Size and Servings** - cake sizes + layers (conditional on type), quantity for cookies
4. **Flavor Builder** - per-layer cake flavor + filling selection
5. **Frosting** - buttercream, fondant, ganache, cream cheese, whipped, naked
6. **Design** - text notes, color tags, inscription text
7. **Dietary** - gluten free, vegan, nut free, dairy free, sugar free, keto
8. **Pickup/Delivery** - date (required), time, delivery toggle with address
9. **Pricing** - quote amount and deposit amount (input in dollars, stored in cents)
10. **Notes** - freeform text

## Production Board

- 6 visible columns: Inquiry, Quoted, Deposit Paid, In Production, Decorating, Ready
- Cards show customer name, order type, size, pickup date/time, price
- Color coding: red (due today), yellow (due tomorrow), default (later)
- Click card for full detail modal
- "Advance" button on each card to move to next status
- Cancel option in detail modal
- Summary bar: orders due today, orders this week, week revenue
- Filter by order type

## Status Workflow

```
inquiry > quoted > deposit_paid > in_production > decorating > ready > picked_up (or delivered)
```

- Any status can also transition to `cancelled`
- `advanceOrderStatus` automatically routes to `picked_up` or `delivered` based on `delivery_requested` flag
- Moving to `deposit_paid` auto-sets `deposit_paid = true`

## Error Handling

- Form uses `startTransition` with `try/catch` and user-visible error messages
- Production board has optimistic updates with rollback on failure
- Orders page shows explicit error state if fetch fails (not empty state)
- Cancel requires confirmation dialog

## Formula > AI

All stats (order counts, revenue totals, popular types) are computed deterministically. No AI involvement.
