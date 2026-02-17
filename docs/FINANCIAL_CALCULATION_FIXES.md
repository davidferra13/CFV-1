# Financial Calculation Fixes - 2026-02-17

## Overview

Six targeted bug fixes across the financial calculation and export system. Each fix addresses a specific data integrity or UX issue in how ChefFlow computes, displays, or exports financial data.

---

## Fix 1: CSV Export Refunds Displayed as Negative

**Files Changed:** `lib/exports/actions.ts`

**Problem:** In the all-events-master CSV export (`exportAllEventsCSV`), refund amounts from `event_financial_summary.total_refunded_cents` were displayed as positive dollar values. Since refunds represent money leaving the business, they should appear as negative in the CSV for clarity and accounting consistency.

**What Changed:**
- Per-event row (line ~319): `formatDollars(refundCents)` changed to `formatDollars(-refundCents)`
- Grand totals row (line ~368): `formatDollars(grandRefunds)` changed to `formatDollars(-grandRefunds)`

**Why:** The `formatDollars()` helper already handles negative formatting (prepending `-$`), so negating the input value produces the correct `-$XX.XX` output. The underlying `netCents` calculation (`paidCents + tipCents - refundCents`) remains unchanged since that arithmetic was already correct.

---

## Fix 2: Food Cost Percentage Uses Weighted Average

**File Changed:** `lib/expenses/actions.ts`

**Problem:** `getMonthlyFinancialSummary()` computed `averageFoodCostPercent` as a simple arithmetic mean of per-event food cost percentages. This is mathematically incorrect when events have different revenue sizes. A $500 event at 40% food cost and a $5,000 event at 25% food cost should not average to 32.5% -- the correct weighted answer is closer to 26.4%.

**What Changed:**
- Replaced `foodCostSum` / `foodCostCount` accumulators with `totalFoodCostCents` and `totalFoodCostRevenueCents`
- In the loop: derive food cost dollars from `revCents * food_cost_percentage / 100` and accumulate
- Final computation: `Math.round((totalFoodCostCents / totalFoodCostRevenueCents) * 100)`

**Why:** Weighted average by revenue correctly reflects the overall food cost burden across events of different sizes. The formula `total_food_cost / total_revenue * 100` gives the true blended food cost percentage.

---

## Fix 3: Running Balance Filter Warning

**File Changed:** `app/(chef)/financials/financials-client.tsx`

**Problem:** When filters (entry type, start date, end date) are applied to the ledger entries table, the running balance column recalculates based only on filtered entries. Users could misinterpret the filtered running balance as their actual total balance.

**What Changed:**
- Added `isFiltered` boolean check: `filterType !== 'all' || startDate !== '' || endDate !== ''`
- Added amber warning banner below the filters section: "Balance shown reflects filtered entries only"
- Added "Filtered view" sub-label on the Balance column header when filters are active

**Why:** Clear visual indicator prevents users from confusing a partial running balance with their actual ledger balance. Uses amber color (warning, not error) to distinguish from red error states.

---

## Fix 4: Profit Margin Rounding Consistency

**Files Changed:** `lib/expenses/actions.ts`, `lib/exports/actions.ts`

**Problem:** Profit margins were rounded inconsistently across the codebase. CSV exports used `.toFixed(1)` (1 decimal place: "65.3%") while the event profit summary used `Math.round()` (whole numbers: "65%"). This caused visual discrepancies between the dashboard and exports.

**What Changed:**
- `lib/expenses/actions.ts` `getEventProfitSummary()`:
  - `profitMarginPercent`: `Math.round(...)` changed to `parseFloat(((value) * 100).toFixed(1))`
  - `foodCostPercent`: same pattern applied
- `lib/exports/actions.ts`: Already used `.toFixed(1)` -- no change needed

**Why:** Standardizing on 1 decimal place provides more precision than whole-number rounding without being excessively granular. Using `parseFloat()` wrapper ensures the return type stays `number` rather than becoming a string.

---

## Fix 5: Inquiry-to-Event Null Pricing Validation

**File Changed:** `lib/inquiries/actions.ts`

**Problem:** `convertInquiryToEvent()` would create a draft event even when no pricing was established. The `quotedPriceCents` could be `null` (no accepted quote and no confirmed budget) or `0`, resulting in events with no price that would later cause division-by-zero in profit calculations and confuse the financial pipeline.

**What Changed:**
- Added validation gate after `quotedPriceCents` is resolved (from accepted quote or inquiry budget):
  ```typescript
  if (!quotedPriceCents || quotedPriceCents <= 0) {
    throw new Error('Cannot convert inquiry to event without a confirmed price. Please attach a quote first.')
  }
  ```

**Why:** This enforces the business rule that events must have a price before entering the event lifecycle. The error message directs the chef to attach a quote, which is the standard workflow for establishing pricing.

---

## Fix 6: duplicateMenu Component Insert Error Checking

**File Changed:** `lib/menus/actions.ts`

**Problem:** In `duplicateMenu()`, component inserts inside the dish-copying loop had no error checking. If a component insert failed (e.g., constraint violation, network issue), the failure was silently swallowed, resulting in an incomplete duplicate with missing components and no indication of the problem.

**What Changed:**
- Destructured `{ error }` from the component insert result
- Added error check after each insert:
  ```typescript
  if (error) {
    console.error('[duplicateMenu] Component insert failed:', error)
    throw new Error('Failed to duplicate menu component')
  }
  ```

**Why:** Consistent with the error handling pattern used for menu and dish inserts in the same function. Throwing on failure prevents partial duplicates from being treated as complete copies.

---

## System Impact

- **No schema changes** -- all fixes are application-layer only
- **No new dependencies** added
- **Backward compatible** -- return types unchanged (Fix 4 returns `number` with more precision, not a type change)
- **Ledger immutability preserved** -- no changes to ledger append or transition logic
