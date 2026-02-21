# Fix: Finance Page Route Props TypeScript Errors

## Date
2026-02-20

## Problem
Several finance page routes were passing props that did not match their corresponding component interfaces, causing TypeScript errors. The issues fell into three categories:

1. **Nullable values passed to non-nullable props** - Server actions wrapped in `.catch(() => null)` produced `T | null`, but components expected `T`
2. **Wrong function call signature** - `getCashFlowForecast()` was called with an object `{ days: 30 }` instead of a positional argument `30`
3. **Snake_case vs camelCase field mismatch** - Supabase query results use snake_case (`contractor_type`) but the component expected camelCase (`contractorType`)

## Files Changed

### 1. `app/(chef)/finance/bank-feed/page.tsx`
- **Prop name fix**: Changed `transactions={...}` to `initialTransactions={...}` to match `BankFeedPanel` props
- **Null handling**: Added early return with fallback UI when `summaryResult` is null, so `summary` prop is guaranteed non-null when passed to the component

### 2. `app/(chef)/finance/cash-flow/page.tsx`
- **Function signature fix**: Changed `getCashFlowForecast({ days: 30 })` to `getCashFlowForecast(30)` to match the action's signature `(days: 30 | 60 | 90 = 30)`
- **Null handling**: Added conditional render - shows `CashFlowChart` only when `forecast` is non-null, otherwise displays a fallback message

### 3. `app/(chef)/finance/contractors/page.tsx`
- **Field mapping**: Added `.map()` on staff query results to transform `s.contractor_type` (snake_case from Supabase) to `contractorType` (camelCase expected by `Contractor1099Panel`'s `StaffMember` type)

### 4. `app/(chef)/finance/tax/quarterly/page.tsx`
- **Null handling**: Added conditional render - shows `TaxEstimateDashboard` only when `summary` is non-null, otherwise displays a fallback message

## Files Not Changed (Already Correct)
- `app/(chef)/finance/disputes/page.tsx` - Uses `initialDisputes={disputes ?? []}` which correctly matches `DisputeTracker`'s `{ initialDisputes: PaymentDispute[] }` prop
- `app/(chef)/finance/recurring/page.tsx` - Uses `initialInvoices={invoices ?? []}` and `clients={clients}` which correctly match `RecurringInvoiceForm`'s props

## Pattern Used for Null Handling
For components that expect a non-nullable complex type (like `ReconciliationSummary`, `CashFlowForecast`, `TaxYearSummary`), the fix uses conditional rendering: render the component only when data is available, otherwise show a styled fallback message. This avoids fabricating fake default objects and gives the user clear feedback when data is unavailable.

## How It Connects
These pages are all under the `/finance` route group. Each page is a server component that fetches data via server actions, then passes results to a client component. The `.catch(() => null)` pattern is used throughout for graceful degradation, but the downstream components were not designed to accept null. The fix keeps the graceful degradation in the page layer while ensuring components always receive valid data.
