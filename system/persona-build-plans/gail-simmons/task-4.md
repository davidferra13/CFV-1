# Build Task: Financial accuracy gap

**Source Persona:** Gail Simmons
**Gap Number:** 4 of 5
**Severity:** MEDIUM

## What to Build

Implement a financial reconciliation feature in the chef portal for cannabis events. Display totals for GMV, transferred amounts, platform fees, deferred amounts, and refunds.

## Files to Modify

- `app/(chef)/cannabis/ledger/page.tsx` -- Add a new section below the "No financial activity" message to display the reconciliation totals.

## Implementation Notes

- Use the data structure returned by `getPlatformReconciliation()` in `app/(admin)/reconciliation/page.tsx`.
- Format currency values using `formatCurrency()` from `lib/utils/currency`.
- Ensure the displayed values match those shown in the admin financials page.

## Acceptance Criteria

1. The chef portal cannabis ledger page includes a new section titled "Platform Reconciliation" with totals for GMV, transferred amounts, platform fees, deferred amounts, and refunds.
2. Totals are formatted as currency and match the admin financials page.
3. `npx tsc --noEmit --skipLibCheck` passes without errors.

## DO NOT

- Modify any files outside of `app/(chef)/cannabis/ledger/page.tsx`.
- Add new npm dependencies or change existing ones.
- Alter the database schema or delete functionality related to financial data.
