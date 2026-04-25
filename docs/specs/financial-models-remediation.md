# Financial Models Remediation - Build Plan

> Single source of truth. Execute in order. No reinterpretation.

## System Overview

Domain 3 audit found 5 critical defects and 3 moderate defects in ChefFlow's financial layer. The ledger architecture is sound (append-only, integer cents, immutable triggers). The problems are:

1. A DB view regression reintroduced a cartesian product bug (inflated numbers)
2. Food cost % formula diverges across 3 surfaces
3. Two UI pages display misleading or wrong financial figures
4. Two pages silently show $0.00 on data failure (zero-hallucination violation)
5. Tax summary mixes all-time revenue with YTD expenses

All fixes are additive or in-place edits. No new tables. No new routes. No new components.

---

## Architecture Context

- `event_financial_summary` is a PostgreSQL VIEW queried by 40+ consumers via `lib/ledger/compute.ts`
- All money is integer cents. All financial state derived from `ledger_entries` (append-only) and `expenses`
- View has been through 6 migrations; latest is `20260418000006` which regressed two prior fixes
- `lib/ledger/compute.ts:getEventFinancialSummaryInternal()` is the single TS gateway to the view
- `formatCurrency()` from `lib/utils/currency.ts` handles all cents-to-dollars display

---

## Build Sequence

### Step 1: Fix `event_financial_summary` View (CRITICAL)

**File:** `database/migrations/20260423000002_fix_financial_view_final.sql`

**Problem:** Migration `20260418000006` reverts to double LEFT JOIN (`ledger_entries` x `expenses`), reintroducing the cartesian product bug from before `20260415000015`. Also loses refund-aware outstanding balance (from `20260417000005`). An event with 3 ledger entries and 2 expenses shows all sums inflated 2x.

**Action:** Create new migration that combines all three prior fixes into one correct view:

- Scalar correlated subqueries (from `20260415000015`) - prevents cartesian product
- Refund-aware outstanding balance: `quoted - paid + refunded` (from `20260417000005`)
- Tips derived from ledger entries, not `events.tip_amount_cents` column (from `20260418000006`)

**Exact SQL:**

```sql
-- FINAL FIX: event_financial_summary view
--
-- Combines three prior fixes into one correct view:
--   1. Scalar correlated subqueries (20260415000015) - no cartesian product
--   2. Refund-aware outstanding balance (20260417000005) - quoted - paid + refunded
--   3. Tips from ledger (20260418000006) - not events.tip_amount_cents
--
-- Migration 20260418000006 regressed #1 and #2 when fixing #3.
-- This migration restores all three.

DROP VIEW IF EXISTS event_financial_summary CASCADE;

CREATE VIEW event_financial_summary AS
SELECT
  event_id,
  tenant_id,
  quoted_price_cents,
  payment_status,
  total_paid_cents,
  total_refunded_cents,
  net_revenue_cents,
  total_expenses_cents,
  tip_amount_cents,
  (net_revenue_cents - total_expenses_cents) AS profit_cents,
  CASE
    WHEN net_revenue_cents > 0
      THEN (net_revenue_cents - total_expenses_cents)::numeric / net_revenue_cents::numeric
    ELSE 0::numeric
  END AS profit_margin,
  CASE
    WHEN net_revenue_cents > 0
      THEN total_expenses_cents::numeric / net_revenue_cents::numeric
    ELSE 0::numeric
  END AS food_cost_percentage,
  (quoted_price_cents - total_paid_cents + total_refunded_cents) AS outstanding_balance_cents
FROM (
  SELECT
    e.id AS event_id,
    e.tenant_id,
    e.quoted_price_cents,
    e.payment_status,
    -- Tips from ledger (not events.tip_amount_cents)
    COALESCE((
      SELECT SUM(le.amount_cents)
      FROM ledger_entries le
      WHERE le.event_id = e.id AND le.entry_type = 'tip'
    ), 0)::bigint AS tip_amount_cents,
    -- Payments excluding tips and refunds
    COALESCE((
      SELECT SUM(le.amount_cents)
      FROM ledger_entries le
      WHERE le.event_id = e.id AND le.is_refund = false AND le.entry_type != 'tip'
    ), 0)::bigint AS total_paid_cents,
    -- Refunds (absolute value)
    COALESCE((
      SELECT SUM(ABS(le.amount_cents))
      FROM ledger_entries le
      WHERE le.event_id = e.id AND le.is_refund = true
    ), 0)::bigint AS total_refunded_cents,
    -- Net revenue (all ledger entries summed: payments + tips - refunds)
    COALESCE((
      SELECT SUM(le.amount_cents)
      FROM ledger_entries le
      WHERE le.event_id = e.id
    ), 0)::bigint AS net_revenue_cents,
    -- Expenses (separate table, separate subquery = no cartesian)
    COALESCE((
      SELECT SUM(ex.amount_cents)
      FROM expenses ex
      WHERE ex.event_id = e.id
    ), 0)::bigint AS total_expenses_cents
  FROM events e
  WHERE e.deleted_at IS NULL
) base;
```

**Validation:**

- Query an event with multiple ledger entries AND multiple expenses
- Verify `total_paid_cents` matches `SELECT SUM(amount_cents) FROM ledger_entries WHERE event_id = X AND is_refund = false AND entry_type != 'tip'`
- Verify `outstanding_balance_cents` increases after a refund
- Verify `tip_amount_cents` comes from ledger, not events column

---

### Step 2: Unify Food Cost % Formula

**Problem:** Three surfaces compute food cost % differently:

| Surface                        | Numerator                             | Denominator                  | File:Line                                         |
| ------------------------------ | ------------------------------------- | ---------------------------- | ------------------------------------------------- |
| `getEventProfitSummary`        | food ingredient expenses              | actual revenue (paid + tips) | `lib/expenses/actions.ts:577`                     |
| `getEventFinancialSummaryFull` | net food cost (groceries - leftovers) | quoted price                 | `lib/events/financial-summary-actions.ts:175-176` |
| `calculateFoodCostPercentage`  | food cost param                       | revenue param                | `lib/finance/food-cost-calculator.ts:79`          |

**Decision:** Standardize on the textbook formula: `food cost / revenue * 100` where revenue = actual collected revenue (not quoted price). Quoted price is invoice value; revenue is cash received. Using quoted price inflates food cost % for events where client paid more (tips, add-ons) and deflates it for underpayments.

**Action A:** Edit `lib/events/financial-summary-actions.ts:172-176`

Current (line 172-176):

```typescript
const grossProfitCents = quotedPriceCents - totalCostCents
const grossMarginPercent =
  quotedPriceCents > 0 ? parseFloat(((grossProfitCents / quotedPriceCents) * 100).toFixed(1)) : 0
const foodCostPercent =
  quotedPriceCents > 0 ? parseFloat(((netFoodCostCents / quotedPriceCents) * 100).toFixed(1)) : 0
```

Replace with:

```typescript
const actualRevenueCents = basePaymentReceivedCents + tipCents
const grossProfitCents = actualRevenueCents - totalCostCents
const grossMarginPercent =
  actualRevenueCents > 0
    ? parseFloat(((grossProfitCents / actualRevenueCents) * 100).toFixed(1))
    : 0
const foodCostPercent =
  actualRevenueCents > 0
    ? parseFloat(((netFoodCostCents / actualRevenueCents) * 100).toFixed(1))
    : 0
```

Note: `basePaymentReceivedCents` and `tipCents` are already computed earlier in this function (around lines 120-135). Verify exact variable names before editing.

**Action B:** The DB view's `food_cost_percentage` column returns a 0-1 ratio. The TS gateway in `compute.ts:52` passes it through as-is. Do NOT change the view column or the TS gateway - the ratio is consumed correctly by downstream code that formats it. Document the ratio vs percentage distinction in a code comment at `compute.ts:52`:

```typescript
// NOTE: food_cost_percentage from the view is a 0-1 ratio (e.g. 0.30 = 30%).
// The view uses total_expenses (all categories), not just food costs.
// For food-only percentage, use getEventProfitSummary() or calculateFoodCostPercentage().
foodCostPercentage: data.food_cost_percentage ?? 0,
```

**Validation:**

- Load event money tab and financial summary for the same event
- Both food cost % values must match (or be clearly labeled as different metrics: "food ingredients only" vs "all expenses")

---

### Step 3: Fix Reporting Hub Silent $0.00

**File:** `app/(chef)/finance/reporting/page.tsx:73-82`

**Problem:** When `getTenantFinancialSummary()` fails, `.catch(() => null)` causes `ytdRevenue` to default to 0 (line 80). Chef sees "$0.00 YTD revenue" with no error indication. Zero-hallucination violation.

**Action:** Replace the null-coalescing default with an error-aware pattern.

Current (lines 73-82):

```typescript
const [summary, eventCounts, expenses, conversionData] = await Promise.all([
  getTenantFinancialSummary().catch(() => null),
  getDashboardEventCounts().catch(() => null),
  getCurrentMonthExpenseSummary().catch(() => null),
  getStageConversionData().catch(() => null),
])

const ytdRevenue = summary?.netRevenueCents ?? 0
const ytdEvents = eventCounts?.ytd ?? 0
const monthExpenses = expenses?.businessCents ?? 0
```

Replace with:

```typescript
const [summary, eventCounts, expenses, conversionData] = await Promise.all([
  getTenantFinancialSummary().catch(() => null),
  getDashboardEventCounts().catch(() => null),
  getCurrentMonthExpenseSummary().catch(() => null),
  getStageConversionData().catch(() => null),
])

const summaryFailed = summary === null
const ytdRevenue = summary?.netRevenueCents ?? 0
const ytdEvents = eventCounts?.ytd ?? 0
const monthExpenses = expenses?.businessCents ?? 0
```

Then in the JSX, wrap the stat cards that depend on `summary` with an error indicator. Find the card that displays `ytdRevenue` and add a conditional:

```tsx
<Card className="p-4">
  {summaryFailed ? (
    <>
      <p className="text-2xl font-bold text-red-600">--</p>
      <p className="text-sm text-red-500 mt-1">Could not load revenue data</p>
    </>
  ) : (
    <>
      <p className="text-2xl font-bold text-green-700">{formatCurrency(ytdRevenue)}</p>
      <p className="text-sm text-stone-500 mt-1">YTD net revenue</p>
    </>
  )}
</Card>
```

Apply same pattern to any other card on this page that uses `summary` data.

**Validation:**

- Temporarily throw in `getTenantFinancialSummary()` and verify error state renders (not $0.00)
- Remove temporary throw, verify normal rendering

---

### Step 4: Fix Outstanding Payments Amount Column

**File:** `app/(chef)/finance/overview/outstanding-payments/page.tsx`

**Problem:** "Amount" column shows `event.quoted_price_cents` (full invoice value). Page title says "Outstanding Payments" but amounts show total quoted, not balance owed. Chef chasing $500 sees $5,000.

**Action:** Use the `event_financial_summary` view to get actual outstanding balance.

Replace the data loading (lines 19-36) with:

```typescript
export default async function OutstandingPaymentsPage() {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()

  // Query events with their computed outstanding balance from the financial view
  const { data: events, error } = await db
    .from('event_financial_summary')
    .select('event_id, quoted_price_cents, outstanding_balance_cents, payment_status, tenant_id')
    .eq('tenant_id', user.tenantId!)
    .gt('outstanding_balance_cents', 0)

  if (error) {
    // Show error state, not empty
    return (
      <div className="space-y-6">
        <div>
          <Link href="/finance/overview" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Overview
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Outstanding Payments</h1>
        </div>
        <Card className="p-6 text-center">
          <p className="text-red-500">Could not load outstanding payment data</p>
        </Card>
      </div>
    )
  }
```

Then join with events table to get event details (date, occasion, client). The key change in the table cell (line 118-121):

```tsx
<TableCell className="text-stone-100 font-semibold text-sm">
  {formatCurrency(event.outstanding_balance_cents)}
</TableCell>
```

Also update the total (line 33-36):

```typescript
const totalOutstanding = (events || []).reduce(
  (sum: number, e: any) => sum + (e.outstanding_balance_cents ?? 0),
  0
)
```

Add required imports: `createServerClient` from `@/lib/db/server`.

**Validation:**

- Create event with quote, record partial payment, verify page shows remaining balance (not full quote)
- Record full payment, verify event disappears from list
- Record refund after full payment, verify event reappears with refunded amount as outstanding

---

### Step 5: Fix Tax Summary Time Scope Mismatch

**File:** `app/(chef)/finance/reporting/tax-summary/page.tsx`

**Problem:** Line 44: `estimatedProfit = summary.netRevenueCents - totalBusinessExpenses` where `summary` is ALL-TIME (from `getTenantFinancialSummary()`) but expenses are filtered to current year (line 29: `start_date: yearStart`). Subtracting YTD expenses from all-time revenue produces a meaningless number.

**Action:** Replace `getTenantFinancialSummary()` with `computeProfitAndLoss(currentYear)` which already exists in `lib/ledger/compute.ts:154` and filters both revenue AND expenses to the same year.

Current (lines 27-44):

```typescript
const [summary, allExpenses] = await Promise.all([
  getTenantFinancialSummary(),
  getExpenses({ start_date: yearStart, is_business: true }),
])
// ... category grouping ...
const totalBusinessExpenses = allExpenses.reduce((s: any, e: any) => s + e.amount_cents, 0)
const estimatedProfit = summary.netRevenueCents - totalBusinessExpenses
```

Replace with:

```typescript
const [pnl, allExpenses] = await Promise.all([
  computeProfitAndLoss(currentYear),
  getExpenses({ start_date: yearStart, is_business: true }),
])
// ... category grouping stays same ...
const totalBusinessExpenses = allExpenses.reduce((s: any, e: any) => s + e.amount_cents, 0)
const estimatedProfit = pnl.netRevenueCents - totalBusinessExpenses
```

Update the revenue card (line 69-72):

```tsx
<p className="text-2xl font-bold text-green-700">
  {formatCurrency(pnl.totalRevenueCents)}
</p>
<p className="text-sm text-stone-500 mt-1">Gross income ({currentYear})</p>
```

Note: label changes from "Gross income (all-time)" to "Gross income ({currentYear})".

Update import: add `computeProfitAndLoss` from `@/lib/ledger/compute`, remove `getTenantFinancialSummary` if no longer used.

**Validation:**

- Revenue and expenses now both scoped to current year
- "Estimated net income" = YTD revenue - YTD expenses (same time scope)

---

### Step 6: Fix Monthly P&L Suspense Fallback

**File:** `app/(chef)/finance/page.tsx:262-266`

**Problem:** `<Suspense fallback={null}>` means the P&L snapshot vanishes silently on loading or error. The `WidgetErrorBoundary` catches errors, but `fallback={null}` during loading shows nothing.

**Action:** Replace `fallback={null}` with a loading skeleton.

Current (lines 262-266):

```tsx
<WidgetErrorBoundary name="Monthly P&L" compact>
  <Suspense fallback={null}>
    <MonthlyPLSnapshot />
  </Suspense>
</WidgetErrorBoundary>
```

Replace with:

```tsx
<WidgetErrorBoundary name="Monthly P&L" compact>
  <Suspense
    fallback={
      <Card className="p-4 animate-pulse">
        <div className="h-6 bg-stone-800 rounded w-1/3 mb-3" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-16 bg-stone-800 rounded" />
          <div className="h-16 bg-stone-800 rounded" />
          <div className="h-16 bg-stone-800 rounded" />
          <div className="h-16 bg-stone-800 rounded" />
        </div>
      </Card>
    }
  >
    <MonthlyPLSnapshot />
  </Suspense>
</WidgetErrorBoundary>
```

**Validation:**

- Verify loading skeleton appears briefly before P&L loads
- Verify `WidgetErrorBoundary` still catches errors with its `compact` error stripe

---

### Step 7: Fix Revenue Summary '$0' String

**File:** `app/(chef)/finance/overview/revenue-summary/page.tsx:93`

**Problem:** Uses raw string `'$0'` instead of `formatCurrency(0)` which produces `'$0.00'`. Minor inconsistency.

**Action:** Replace `'$0'` with `formatCurrency(0)`.

Current (line 91-93):

```tsx
{
  revenueEvents.length > 0 ? formatCurrency(Math.round(totalRevenue / revenueEvents.length)) : '$0'
}
```

Replace with:

```tsx
{
  revenueEvents.length > 0
    ? formatCurrency(Math.round(totalRevenue / revenueEvents.length))
    : formatCurrency(0)
}
```

**Validation:** Visual check that empty state shows "$0.00" not "$0".

---

### Step 8: Fix Profit by Event Terminology

**File:** `app/(chef)/finance/reporting/profit-by-event/page.tsx`

**Problem:** Line 40: `revenue: e.quoted_price_cents ?? 0` labels quoted price as "revenue". Line 64-65: summary card says "Total revenue" for sum of all quoted prices. Quoted price is invoice value, not revenue. An instructor would say "you can't call an unpaid invoice revenue."

**Action:** Rename labels only (not the data source, since this page intentionally shows invoice-based profitability).

Line 58: description already says "Invoice revenue minus directly linked expense entries per event" - this is acceptable.

Line 64-65: Change label from "Total revenue" to "Total invoiced":

```tsx
<p className="text-sm text-stone-500 mt-1">Total invoiced</p>
```

In the table header that says "Revenue" for the per-event column, change to "Invoiced":
Find the `<TableHead>` that says "Revenue" and replace with "Invoiced".

**Validation:** Visual check that labels now say "invoiced" not "revenue".

---

## Files Modified (Complete List)

| #   | File                                                              | Action                                |
| --- | ----------------------------------------------------------------- | ------------------------------------- |
| 1   | `database/migrations/20260423000002_fix_financial_view_final.sql` | **CREATE** - new migration            |
| 2   | `lib/events/financial-summary-actions.ts`                         | **EDIT** lines 172-176                |
| 3   | `lib/ledger/compute.ts`                                           | **EDIT** line 52 (add comment)        |
| 4   | `app/(chef)/finance/reporting/page.tsx`                           | **EDIT** lines 73-82 + stat card JSX  |
| 5   | `app/(chef)/finance/overview/outstanding-payments/page.tsx`       | **EDIT** data loading + amount column |
| 6   | `app/(chef)/finance/reporting/tax-summary/page.tsx`               | **EDIT** data source + labels         |
| 7   | `app/(chef)/finance/page.tsx`                                     | **EDIT** lines 262-266                |
| 8   | `app/(chef)/finance/overview/revenue-summary/page.tsx`            | **EDIT** line 93                      |
| 9   | `app/(chef)/finance/reporting/profit-by-event/page.tsx`           | **EDIT** line 65 + table header       |

---

## Validation Criteria (Definition of Done)

1. **View correctness:** For any event with N ledger entries and M expenses (where N > 1 AND M > 1), `total_paid_cents` equals `SELECT SUM(amount_cents) FROM ledger_entries WHERE event_id = X AND is_refund = false AND entry_type != 'tip'` exactly (no inflation)
2. **Outstanding balance:** After recording a $200 refund on a fully-paid $1000 event, `outstanding_balance_cents` = 200 (not 0)
3. **Tips from ledger:** `tip_amount_cents` in the view matches `SELECT SUM(amount_cents) FROM ledger_entries WHERE event_id = X AND entry_type = 'tip'`
4. **Food cost % consistency:** Event money tab and financial summary show same food cost % (within rounding tolerance of 0.1%)
5. **No silent $0.00:** Reporting hub shows error indicator (not $0.00) when financial summary fails to load
6. **Outstanding payments accuracy:** Page shows computed balance, not quoted price
7. **Tax summary time scope:** Revenue and expenses both scoped to current year
8. **P&L loading state:** Skeleton visible during load, error stripe on failure
9. **tsc clean:** `npx tsc --noEmit --skipLibCheck` exits 0
10. **Build clean:** `npx next build --no-lint` exits 0

---

## What This Does NOT Fix (Documented, Not In Scope)

- **`food_cost_percentage` column name in view:** Still called `food_cost_percentage` but includes all expenses. Renaming would break 40+ consumers. Documented in code comment.
- **`food_cost_percentage` returns ratio not percentage:** Consumers handle this. Documented in code comment.
- **Two P&L computation paths:** `computeProfitAndLoss()` (simple) vs `getProfitAndLossReport()` (full). Both are correct for their contexts. Not a bug.
- **Contribution margin definition inconsistency:** Knowledge layer says `Price - Food Cost`; break-even uses `Revenue - All Expenses`. Both are valid definitions for different contexts.
- **Stripe webhook dual-write on payment_status:** Workaround for race condition. Functionally correct. Architectural smell, not a bug.
- **Margin threshold inconsistency** (35%/20% vs 60%/40%): Subjective benchmarks on different surfaces. Not a correctness issue.
- **IRS mileage rate (70 cents/mile):** 2025 rate. 2026 rate is 70 cents (confirmed same). No change needed.
- **Prime cost metric:** Not built. Enhancement, not a fix.
