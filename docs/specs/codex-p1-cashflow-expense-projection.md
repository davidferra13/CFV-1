# Codex Build Spec: P1 Cash Flow Expense Projection

> Priority: P1. The cash flow forecast currently pretends future expenses are $0.
> Risk: LOW. Single file change. No new tables, no migrations.

---

## The Problem

**File:** `lib/finance/cash-flow-actions.ts`
**Line:** 141
**Current:**

```ts
const projectedOut = 0
```

The short-term cash flow forecast (30/60/90 day) correctly projects future income from proposed/accepted events, but hardcodes projected expenses to $0. This makes every forecast look rosier than reality. A chef sees income flowing in but no expenses flowing out.

## The Fix

Use the chef's recent expense history to project future expenses. The simplest honest approach: average daily expense rate from the last 90 days, applied to each forecast period.

### Step 1: Add a query for recent expenses (before the period loop)

After line 99 (after the `Promise.all` that fetches expenses and installments), add:

```ts
// Calculate average daily expense rate from last 90 days for projection
const ninetyDaysAgo = addDays(today, -90)
const { data: recentExpenses } = await db
  .from('expenses')
  .select('amount_cents')
  .eq('tenant_id', user.tenantId!)
  .gte('expense_date', ninetyDaysAgo)
  .lte('expense_date', today)

const totalRecentExpenseCents = (recentExpenses || []).reduce(
  (sum: number, e: any) => sum + ((e as any).amount_cents || 0),
  0
)
const avgDailyExpenseCents = totalRecentExpenseCents / 90
```

### Step 2: Replace the hardcoded 0

Change line 141 from:

```ts
const projectedOut = 0
```

to:

```ts
// Project expenses based on average daily rate from last 90 days
const daysInPeriod = Math.max(
  1,
  Math.round((new Date(periodEnd).getTime() - new Date(cursor).getTime()) / (1000 * 60 * 60 * 24)) +
    1
)
const projectedOut = Math.round(avgDailyExpenseCents * daysInPeriod)
```

## What NOT to change

- DO NOT change the type `CashFlowPeriod` (it already has `projectedExpenseCents: number`)
- DO NOT change the `getWhatIfScenario` function
- DO NOT change any other file
- DO NOT add new imports (the `addDays` helper already exists in this file)

## Verification

- Run `npx tsc --noEmit --skipLibCheck`
- The `projectedExpenseCents` field should now contain non-zero values when the chef has expense history
- If a chef has zero expenses in the last 90 days, `projectedOut` will correctly be 0
