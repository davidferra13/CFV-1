# Client Financial Detail

**Branch:** `feature/packing-list-system`

## What Changed

Added a comprehensive per-client financial breakdown panel to the client detail page (`/clients/[id]`). This gives chefs a complete, precise picture of where every client stands financially — every event, every dollar, every payment — in one place.

## Why

The system already tracked all financial data in the ledger (immutable, append-only) and in two computed SQL views (`event_financial_summary`, `client_financial_summary`), but that data was scattered:

- The client detail page only showed 4 aggregate stats (Total Events, Completed Events, Total Spent, Avg Event Value)
- There was no way to see which specific events were paid vs. outstanding
- The full ledger was only visible tenant-wide on `/financials`, not scoped to a single client
- Outstanding balance existed in the view but was never surfaced in the UI

## What Was Built

### 1. `getClientFinancialDetail(clientId)` — `lib/clients/actions.ts`

New server action that returns three things in parallel:
- **`eventBreakdown`** — all events for the client with quoted price, total paid, outstanding balance, payment status, deposit amount, tip amount. Fetched from `events` table + `event_financial_summary` view joined by event_id.
- **`ledgerEntries`** — full payment history (all ledger entries) for this client, ordered newest-first, with event context joined.
- **`summary`** — aggregate totals across active (non-cancelled) events: total quoted, total paid, total outstanding, total refunded, total tips, collection rate %.

The action enforces tenant scoping on every query. Cancelled events are excluded from the `totalQuotedCents`, `totalPaidCents`, and `totalOutstandingCents` summary totals (they can't owe money on a cancelled event), but are still shown in the per-event table for full history.

### 2. `ClientFinancialPanel` — `components/clients/client-financial-panel.tsx`

Pure presentational server component (no client JS needed). Three sections:

**Financial Summary** — 6 stat tiles:
| Tile | Color | Meaning |
|---|---|---|
| Total Quoted | Stone | Sum of quoted prices on active events |
| Total Paid | Green | Sum of all actual payments received |
| Outstanding | Red (if >0) / Stone | What's still owed |
| Tips | Purple | Total tips from this client |
| Refunded | Stone (hidden if $0) | Total refunds issued |
| Collection Rate | Blue | % of quoted amount collected |

**Event Breakdown** — table with one row per event:
- Event name (linked to `/events/[id]`), date, event status, quoted, paid, outstanding, payment status badge
- Color-coded: paid = green, deposit_paid = blue, partial = amber, unpaid = red, refunded = stone
- Cancelled events shown at 60% opacity with "—" for financial columns
- Totals row at the bottom when there's more than one event

**Payment History** — full ledger entries for this client:
- Date, event name (linked), entry type badge (colored), amount (+/-), description
- Refunds shown with "−" prefix in red; payments shown "+" in green

### 3. `app/(chef)/clients/[id]/page.tsx`

- Added `getClientFinancialDetail` to the existing parallel `Promise.all` fetch at page load
- Rendered `<ClientFinancialPanel>` between the stats cards and the loyalty section
- Panel is conditionally rendered (`financialDetail &&`) so a fetch error doesn't break the page

## Data Flow

```
Supabase DB
  └── events (client_id, quoted_price_cents, payment_status, deposit_amount_cents)
  └── ledger_entries (client_id, tenant_id, entry_type, amount_cents, is_refund, event_id)
  └── event_financial_summary VIEW (event_id → total_paid_cents, outstanding_balance_cents, ...)

getClientFinancialDetail(clientId)
  ├── events query (by client_id + tenant_id)
  ├── ledger_entries query (by client_id + tenant_id, with events join)
  └── event_financial_summary query (by event_id IN [...])
        → merges into eventBreakdown + summary totals

ClientDetailPage (server)
  └── ClientFinancialPanel (server component)
        ├── Summary tiles
        ├── Per-event table
        └── Ledger history table
```

## No Schema Changes

No migrations required. All data already existed in:
- `events` table
- `ledger_entries` table
- `event_financial_summary` SQL view (defined in Layer 3 migration)

## Files Modified

| File | Change |
|---|---|
| `lib/clients/actions.ts` | Added `getClientFinancialDetail()` |
| `components/clients/client-financial-panel.tsx` | New component (created) |
| `app/(chef)/clients/[id]/page.tsx` | Import + fetch + render the panel |
