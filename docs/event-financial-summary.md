# Event Financial Summary — Implementation

## What Was Built

A standalone financial close page (`/events/[id]/financial`) that presents a complete per-event P&L picture. The page is separate from the event detail page so it can be bookmarked and reviewed independently.

## Database

**Migration: `supabase/migrations/20260303000003_financial_closure.sql`**

Added to the `events` table:

- `financial_closed BOOLEAN NOT NULL DEFAULT false` — whether the chef has marked this event financially closed
- `financial_closed_at TIMESTAMPTZ` — timestamp of closure
- `mileage_miles DECIMAL(8,2)` — round-trip miles driven (home → stores → client → home)
- CHECK constraint: `mileage_miles >= 0`

## Files Created

### `lib/events/financial-summary-actions.ts`

- **`getEventFinancialSummaryFull(eventId)`** — The main data fetcher. Builds 7 data sections:
  1. Event header (occasion, date, guest count, client name, status)
  2. Revenue (quoted, payments received, tip, variance)
  3. Costs (projected food cost, actual grocery spend, leftover carry-forward in/out, additional expenses, total cost)
  4. Margins (food cost %, gross profit, margin %, net profit with tip)
  5. Time (per-phase minutes from `getEventProfitSummary().timeInvested`, total, effective hourly rate)
  6. Mileage (miles from `events.mileage_miles`, IRS deduction at $0.70/mile)
  7. Comparison (vs chef historical average — only if prior data exists)
  8. `pendingItems[]` — list of missing data that prevents closure

- **`markFinancialClosed(eventId)`** — Sets `financial_closed = true` and `financial_closed_at = now()`. Only valid for events in completed/in_progress states.

- **`updateMileage(eventId, mileageMiles)`** — Updates `mileage_miles` on the event. The mileage field is editable inline on the financial summary page.

### `components/events/financial-summary-view.tsx`

Client component with 7 section cards. Notable UX decisions:

- **No red/green grading on margins** — neutral data presentation per spec. The chef sees numbers, not anxiety.
- **Editable mileage** — input field on the page, auto-saves via `updateMileage()`.
- **Draft mode** — if `pendingItems.length > 0`, the status badge shows "DRAFT — {pending items}" and the "Mark Financially Closed" button is hidden.
- **IRS rate** — hardcoded at 70 cents/mile ($0.70, the 2025 IRS standard mileage rate for business).

### `app/(chef)/events/[id]/financial/page.tsx`

Server component that calls `getEventFinancialSummaryFull()` and renders `<FinancialSummaryView>`.

## Integration

Event detail page closure status card: Added "Open Financial Summary" / "View Financial Summary" button that links to `/events/[id]/financial`. The label changes based on `closureStatus.financiallyClosed`.

## Design Decisions

- **Reuses `getEventProfitSummary()`** from `lib/expenses/actions.ts` for time + expense data rather than re-querying. This avoids double-fetching and keeps the financial summary consistent with the event detail page's profit display.
- **Historical comparison** is computed inline (average food cost % and margin % across prior completed events for the same tenant). Only shown if there are at least 2 prior events with financial data.
- **Leftover carry-forward** uses `leftover_credit_cents` on `events` — items the chef brought from a prior event (reduces effective food cost) or carried to the next event (net deduction).
