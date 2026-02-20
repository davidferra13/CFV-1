# Invoice Document — Implementation

## What Was Built

A screen-only invoice view for both chef and client portals. The invoice is computed from the event + ledger data (ledger-first model) — no separate invoice table is needed.

## Database

**Migration: `supabase/migrations/20260303000001_invoice_number.sql`**

Added to the `events` table:
- `invoice_number TEXT` — sequential INV-YYYY-NNN format, generated when the event reaches `paid` status
- `invoice_issued_at TIMESTAMPTZ` — when the invoice number was assigned

Invoice numbers are sequential per chef per year: `INV-2026-001`, `INV-2026-002`, etc. The number is assigned idempotently — already-invoiced events are not re-numbered.

## Files Created

### `lib/events/invoice-actions.ts`
- `generateInvoiceNumber(tenantId)` — counts existing invoices for the tenant in the current year, returns the next number
- `assignInvoiceNumber(eventId)` — idempotent, skips if already set; called from event detail page or transitions
- `getInvoiceData(eventId)` — requireChef(), fetches event + chef + ledger_entries for chef portal
- `getInvoiceDataForClient(eventId)` — requireClient(), scoped to the client's own events
- `buildInvoiceData(event, chef, entries)` — shared computation (payment history, balance, PAID IN FULL status)

### `components/events/invoice-view.tsx`
Shared display component rendering 6 sections:
1. Header: "INVOICE", number, chef business info, issue date
2. Client info + event details
3. Line item: "Private dinner service — {occasion}", pricing model label, total
4. Payment history: ledger entries as rows (colored by type — payment, refund, tip)
5. Balance summary: quoted, paid, refunded, tip, balance due or "PAID IN FULL"
6. Thank-you footer

### `app/(chef)/events/[id]/invoice/page.tsx`
Chef-side invoice view. Calls `getInvoiceData()`.

### `app/(client)/my-events/[id]/invoice/page.tsx`
Client-side invoice view. Calls `getInvoiceDataForClient()`, which scopes to the client's auth.

## Integration

Event detail page (`app/(chef)/events/[id]/page.tsx`): "View Invoice" button added to the Financial Summary card header.

## Design Decisions

- **Ledger-first**: Invoice displays ledger_entries as the source of truth for payment history. No separate invoice line items table.
- **Single line item**: The invoice shows "Private dinner service — occasion" as a single row, not itemized costs. Per the spec: the client sees what they're getting, not the chef's food cost breakdown.
- **`price_per_person_cents` computed**: This field only exists on the `quotes` table. For invoice display, it's computed as `Math.round(quoted_price_cents / guest_count)` when pricing_model is `per_person`.
