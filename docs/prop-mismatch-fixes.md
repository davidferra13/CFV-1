# TypeScript Prop Mismatch Fixes

**Date:** 2026-02-20
**Branch:** fix/grade-improvements

## Summary

Fixed TypeScript prop mismatch errors across pages and components, Recharts formatter type errors, incorrect function call signatures, null safety issues, and a missing module.

---

## Prop Mismatch Fixes (Page → Component)

### 1. `app/(chef)/events/[id]/kds/page.tsx`

- **Fix:** `initialCourses` → `courses` (matching `KDSViewProps` in `components/operations/kds-view.tsx`)

### 2. `app/(chef)/finance/contractors/page.tsx`

- **Fix:** `summary` → `summaries` (with `?? []` fallback), `payments` → `recentPayments`, `staff` → `staffMembers`, `currentYear` → `taxYear` (matching `Contractor1099Panel` Props)

### 3. `app/(chef)/finance/disputes/page.tsx`

- **Fix:** `disputes` → `initialDisputes` (matching `DisputeTracker` Props)

### 4. `app/(chef)/finance/recurring/page.tsx`

- **Fix:** `invoices` → `initialInvoices` (matching `RecurringInvoiceForm` Props)

### 5. `app/(chef)/settings/highlights/page.tsx`

- **Fix:** `initialHighlights` → `highlights` (matching `HighlightEditorProps`)

### 6. `app/(chef)/settings/portfolio/page.tsx`

- **Fix:** `initialItems` → `items` (matching `GridEditorProps`)

### 7. `app/(client)/my-events/[id]/countdown/page.tsx`

- **Fix:** Replaced `data={countdownData}` with individual props: `eventName`, `eventDate`, `status`, `countdownEnabled` (matching `EventCountdown` Props)

### 8. `app/(client)/my-events/[id]/payment-plan/page.tsx`

- **Fix:** Replaced `eventId`, `eventTotalCents`, `eventDate`, `initialPlan` with `totalCents`, `eventDate`, `eventName` (matching `PaymentPlanCalculator` Props)
- **Also fixed:** `.catch()` on PromiseLike — replaced with `try/catch` pattern

### 9. `app/(chef)/events/[id]/split-billing/page.tsx`

- **Fix:** `eventTotalCents` → `totalCents`, `initialSplits` → `currentSplits`
- **Also fixed:** `.catch()` on PromiseLike — replaced with `try/catch` pattern
- **Also fixed:** `client.full_name` → `client.name` by mapping at the call site (SplitBillingForm expects `name: string`)

---

## Missing Module Fix

### `components/analytics/demand-heatmap.tsx` (created)

- The page `app/(chef)/analytics/demand/page.tsx` imported this but it didn't exist
- Created a full implementation that accepts `SeasonalHeatmap` from `lib/analytics/demand-forecast-actions.ts`
- Maps `predictedInquiryCount`/`actualInquiryCount` to internal `DemandDataPoint` fields for display

---

## Null Safety / Type Fixes

### `app/(chef)/finance/bank-feed/page.tsx`

- **Fix:** Added early return when `summaryResult` is null (was: `ReconciliationSummary | null` not assignable to `ReconciliationSummary`)
- **Also fixed:** `transactions` → `initialTransactions` prop name

### `app/(chef)/finance/cash-flow/page.tsx`

- **Fix:** `getCashFlowForecast({ days: 30 })` → `getCashFlowForecast(30)` (function expects a scalar `30 | 60 | 90`)
- **Also fixed:** Added null check for forecast before rendering `CashFlowChart`

### `app/(chef)/finance/tax/quarterly/page.tsx`

- **Fix:** Added null guard — renders placeholder when `summary` is null instead of passing it to `TaxEstimateDashboard`

---

## Recharts Formatter Fixes

Recharts `formatter` prop types require `(v: number | undefined, name: string | undefined)` in newer versions, and the callback must be cast as `any` to satisfy the overloaded type.

- `components/analytics/pipeline-forecast.tsx` — wrapped formatter with `as any`
- `components/analytics/benchmark-dashboard.tsx` — wrapped formatter with `as any`
- `components/analytics/client-ltv-chart.tsx` — wrapped formatter with `as any`, updated parameter types
- `components/marketing/campaign-performance.tsx` — wrapped formatter with `as any`

---

## Schema Mismatch Fixes (Column Not In Types)

### `lib/client-portal/actions.ts`

- Removed `address` from the `events` select (column does not exist in current schema)
- Removed `address` from `ClientPortalData.upcomingEvents` type
- Changed `amount_cents` → `total_quoted_cents` in quotes select (correct column name)
- Added null filters for `event_id` (which is nullable in the DB) when building activeQuotes and pendingPayments

### `app/client/[token]/page.tsx`

- Removed rendering of `ev.address` (column no longer in the data shape)
- Cast `ev.status as any` when passing to `EventStatusBadge` (status comes back as `string`, badge expects `EventStatus` union)

### `lib/clients/next-best-action.ts`

- Changed select from `id, first_name, last_name` → `id, full_name` (clients table uses `full_name`)
- Updated name map construction to use `c.full_name`
- Fixed `filter(Boolean)` on nullable array → `filter((id): id is string => id != null)` for proper type narrowing

---

## Pre-Existing Errors (Not Fixed — Require DB Migrations)

The following errors existed before this work and require database migrations to resolve:

- `stripe_transfers` table not in generated types
- `platform_fee_ledger` table not in generated types
- `food_cost_budget_cents` column not in `events` table
- `stripe_payment_intent_id` column not in events
- `lib/admin/reconciliation-actions.ts` — queries against non-existent tables
- `lib/stripe/deferred-transfers.ts` — queries against non-existent tables
- `app/(chef)/settings/page.tsx` — `BookingSettings` default value mismatch
- `app/book/[chefSlug]/page.tsx` — `bookingConfig` prop not in component

These require migrations, not code fixes.
