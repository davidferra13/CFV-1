# Bakery Features: Wholesale, Tasting, Seasonal Calendar

Three bakery-specific features added to ChefFlow for bakeries that sell wholesale, book tastings, and manage seasonal item lifecycles.

## Feature 1: Wholesale/B2B Ordering

**Route:** `/bakery/wholesale`

**What it does:** Manages recurring wholesale accounts (cafes, restaurants, shops) with B2B ordering, discount tracking, invoicing, and outstanding balance summaries.

**Tables:**

- `wholesale_accounts` - B2B customer accounts with payment terms (cod, net 7/15/30) and discount percentages
- `wholesale_orders` - Individual orders with line items (JSONB), auto-calculated discounts, and 7-status workflow (pending > confirmed > producing > ready > delivered > invoiced > paid)

**Server actions:** `lib/bakery/wholesale-actions.ts`

- Full CRUD for accounts and orders
- `getOrdersByDeliveryDate(date)` for production planning
- `getAccountOrderHistory(accountId)` for per-account history
- `createStandingOrder(accountId, items, frequency)` to auto-generate daily/weekly repeating orders
- `getWeeklyWholesaleVolume()` for aggregated production needs
- `getAccountBalances()` for outstanding invoice tracking
- `generateInvoice(orderId)` to assign invoice numbers and mark as invoiced

**UI:** `components/bakery/wholesale-manager.tsx`

- Two tabs: Accounts and Orders
- Account list with payment terms, discount badges, outstanding balances
- Order list by delivery date with status progression buttons
- New order form with dynamic line items, auto-calculated subtotal/discount/total
- All mutations use startTransition with try/catch and rollback

**Key patterns:**

- All amounts in cents (integer math)
- Discount calculated server-side from account's discount_percent
- Invoice numbers: INV-YYYYMMDD-XXXX format
- Tenant isolation via requireChef() + RLS

## Feature 2: Tasting Appointment Scheduler

**Route:** `/bakery/tastings`

**What it does:** Books cake/pastry tasting appointments for custom order clients. Tracks scheduling, outcomes, and conversion rates.

**Table:** `bakery_tastings` - Appointments with client info, date/time, type (cake/pastry/bread/wedding/general), items to sample, 5-status workflow (scheduled > confirmed > completed / cancelled / no_show), outcome tracking with order_placed boolean.

**Server actions:** `lib/bakery/tasting-actions.ts`

- CRUD for tastings
- `getTastingsForDate(date)` for daily schedule
- `getUpcomingTastings(days)` for upcoming appointments
- `recordTastingOutcome(id, outcome)` to log notes and whether an order was placed
- `getTastingConversionStats(days)` for conversion analytics (deterministic, no AI)

**UI:** `components/bakery/tasting-scheduler.tsx`

- Conversion stats at top (total, conversion rate, converted/completed, no-shows)
- Week navigation with calendar grid showing tastings per day
- Book tasting form with client info, date/time, type, items to sample
- Upcoming tastings list with confirm/cancel/no-show/log outcome buttons
- Inline outcome recording form with notes and order-placed checkbox
- All mutations use startTransition with try/catch and rollback

## Feature 3: Seasonal Item Calendar

**Route:** `/bakery/seasonal`

**What it does:** Plans seasonal bakery items (holiday cookies, Valentine's specials, summer pies) with start/end date ranges and an enable/disable lifecycle.

**Table:** `bakery_seasonal_items` - Items with name, category (cookie/pie/cake/bread/pastry/seasonal_special), price, date range, active flag.

**Server actions:** `lib/bakery/seasonal-actions.ts`

- CRUD for seasonal items
- `getActiveSeasonalItems()` - items currently in season
- `getSeasonalCalendar(year)` - full year view
- `getUpcomingSeasonalItems(days)` - items starting within N days (prep reminder)

**UI:** `components/bakery/seasonal-calendar.tsx`

- "Currently In Season" highlight bar with color-coded category tags
- "Coming Up" list with countdown ("X days until start")
- 12-month year grid with color-coded mini bars showing item coverage
- Click month to zoom into detail view with item list
- Year navigation (previous/next)
- Add form with name, category, dates, price, description
- Enable/disable toggle per item
- All mutations use startTransition with try/catch and rollback

## Migration

**File:** `supabase/migrations/20260331000019_bakery_wholesale_tasting_seasonal.sql`

All four tables (wholesale_accounts, wholesale_orders, bakery_tastings, bakery_seasonal_items) created in a single additive migration. All have RLS enabled with tenant isolation policies. Indexes on delivery_date, tasting_date, and seasonal date ranges.

## Architecture Notes

- All financial amounts stored and computed in cents (integers)
- All analytics are deterministic (Formula > AI)
- Tenant ID derived from session via requireChef(), never from request body
- All UI mutations wrapped in startTransition with try/catch, rollback, and toast feedback
- No em dashes used anywhere
