# Commerce Engine — Wave 2: Checkout, POS, & UI

## What Changed

Wave 2 builds the operational layer on top of Wave 1's data model: register sessions, atomic counter checkout, order queue management, inventory bridge, and the full Commerce UI.

## Migration

**`20260328000002_commerce_register_sessions.sql`**

### New Enums

- `register_session_status` — open, suspended, closed
- `order_queue_status` — received, preparing, ready, picked_up, cancelled

### New Tables

| Table               | Purpose                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `register_sessions` | POS shift management — tracks who opened, cash in drawer, sales count, variance at close |
| `order_queue`       | Order-ahead status tracking — received → preparing → ready → picked_up                   |

### Schema Changes

- `sales.register_session_id` — FK linking sales to register sessions
- `inventory_transactions.sale_id` — FK linking inventory deductions to sales
- `inventory_transaction_type` enum — added `sale_deduction` and `return_from_sale` values

### Triggers

- `generate_order_number` — auto-generates short order numbers (e.g., "A-042") that reset daily

### Indexes

- `idx_register_sessions_tenant_status` — fast lookup of open sessions
- `idx_order_queue_tenant_status` — active order filtering
- `idx_sales_register_session` — sales by register session
- `idx_inventory_transactions_sale` — deduction lookup by sale

## Server Actions

| File                                  | Functions                                                                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/commerce/register-actions.ts`    | `openRegister`, `suspendRegister`, `resumeRegister`, `closeRegister`, `getCurrentRegisterSession`, `getRegisterSessionHistory`, `getRegisterSession` |
| `lib/commerce/checkout-actions.ts`    | `counterCheckout`, `quickSale`                                                                                                                       |
| `lib/commerce/order-queue-actions.ts` | `createOrderQueueEntry`, `updateOrderStatus`, `cancelOrder`, `getActiveOrders`, `getOrderQueueHistory`, `getOrder`                                   |
| `lib/commerce/inventory-bridge.ts`    | `previewSaleDeduction`, `executeSaleDeduction`, `reverseSaleDeduction`, `deductProductStock`                                                         |

### Key Design: Atomic Counter Checkout

`counterCheckout()` creates a complete sale in one server action call:

1. Creates sale (draft)
2. Inserts all items with computed line totals
3. Computes and updates sale totals (subtotal, tax, total)
4. Records payment as `captured`
5. Updates sale status to `captured`
6. Increments register session counters
7. Returns sale number, total, and change due

This is optimized for POS speed — one server round-trip for a complete transaction.

### Key Design: Inventory Bridge

Two deduction paths based on product type:

1. **Recipe-based products** (`product_projections.recipe_id` is set):
   - `walkSaleRecipeChain()` traces: sale_items → product_projections → recipes → recipe_ingredients → ingredients
   - Handles sub-recipes recursively with cycle prevention
   - Creates `sale_deduction` inventory transactions (negative quantities)

2. **Simple products** (no recipe, `track_inventory` is true):
   - `deductProductStock()` decrements `product_projections.available_qty` directly

Both paths are reversible via `reverseSaleDeduction()` (for voided/refunded sales).

### Key Design: Order Queue

- FSM transitions: received → preparing → ready → picked_up (terminal)
- Cancel allowed from received or preparing
- Auto-computes `actual_wait_minutes` at pickup
- Auto-generates short order numbers that cycle daily (A-001, A-002... B-001 next day)

## UI Pages

| Route                  | Component       | What it does                                            |
| ---------------------- | --------------- | ------------------------------------------------------- |
| `/commerce`            | Commerce Hub    | Dashboard with today's stats, quick links, recent sales |
| `/commerce/register`   | POS Register    | Product grid + cart + payment buttons                   |
| `/commerce/products`   | Product Catalog | Searchable table with margin calculations               |
| `/commerce/orders`     | Order Queue     | 3-column Kanban board (Received → Preparing → Ready)    |
| `/commerce/sales`      | Sales History   | Filterable table of all sales                           |
| `/commerce/sales/[id]` | Sale Detail     | Items, totals, payments, refunds                        |

## UI Components

| Component               | Description                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `pos-register.tsx`      | Full POS with product grid, category tabs, search, cart, cash/card payment, register open/close |
| `product-catalog.tsx`   | Searchable product table with margin color coding                                               |
| `order-queue-board.tsx` | 3-column Kanban with one-click status advancement                                               |
| `sales-table.tsx`       | Filterable sales list with status badges and channel labels                                     |

## Nav & Archetype Updates

### Navigation

- Added "Commerce" nav group (`id: 'commerce'`, `module: 'commerce'`) with 5 items: Hub, POS Register, Products, Order Queue, Sales History
- Added `/commerce` and `/commerce/register` to standaloneTop shortcut pool

### Archetype Presets

- **Restaurant**: added `commerce` to enabledModules, POS Register to primary nav
- **Food Truck**: added `commerce` to enabledModules, POS Register to primary nav
- **Bakery**: added `commerce` to enabledModules, POS Register to primary nav
- Private Chef, Caterer, Meal Prep: unchanged (can opt in via Settings > Modules)

## Constants Updates

- Added `RegisterSessionStatus` type + labels + colors
- Added `OrderQueueStatus` type + labels + colors

## What's NOT in Wave 2

- Tax computation (Wave 3)
- Daily reconciliation reports (Wave 3)
- Settlement tracking (Wave 3)
- Inngest background jobs (Wave 3)
- PDF receipts (Wave 4)
- CSV export (Wave 4)
- Event ↔ Sale bridge (Wave 4)
- Stripe webhook integration for commerce (Wave 3)
