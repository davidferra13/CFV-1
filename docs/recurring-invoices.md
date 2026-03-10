# Recurring Invoices System

Built: 2026-03-09
Branch: feature/risk-gap-closure

## Overview

Recurring invoices automate billing for meal prep clients and retainer arrangements. Chefs configure a schedule (weekly, biweekly, monthly, quarterly) and the system generates individual invoices on each billing date, optionally charging a saved payment method via Stripe autopay.

## Architecture

### Database

**`recurring_invoices` (schedule configuration)**

- Pre-existing table from `20260312000001_financial_infrastructure.sql`
- Extended by `20260330000098_recurring_invoices.sql` with:
  - `name` - human-readable label
  - `day_of_week` (0-6) - anchor for weekly/biweekly
  - `day_of_month` (1-28) - anchor for monthly/quarterly
  - `start_date`, `end_date` - schedule lifecycle bounds
  - `is_autopay`, `stripe_payment_method_id` - autopay config
  - `status` (active/paused/cancelled) - richer lifecycle than boolean `is_active`

**`recurring_invoice_history` (generated invoices)**

- New table tracking each individual invoice instance
- Links to schedule, chef, client
- Has its own `invoice_number` (shares sequence with event invoices)
- Tracks payment status: draft, sent, paid, overdue, cancelled
- Stores Stripe PaymentIntent ID and ledger entry ID for paid invoices

### Server Actions (`lib/finance/recurring-invoice-actions.ts`)

| Action                        | Purpose                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| `createRecurringSchedule`     | Set up a new recurring billing schedule                                  |
| `updateRecurringSchedule`     | Modify schedule parameters                                               |
| `pauseRecurringSchedule`      | Pause (can be resumed later)                                             |
| `resumeRecurringSchedule`     | Resume a paused schedule, advancing dates if needed                      |
| `cancelRecurringSchedule`     | Cancel permanently                                                       |
| `getRecurringSchedules`       | List schedules with optional status filter                               |
| `getRecurringScheduleHistory` | View past invoices for a schedule                                        |
| `getRecurringRevenueSummary`  | MRR, overdue count, upcoming invoices                                    |
| `generateDueInvoices`         | Process all due schedules: create history, charge autopay, advance dates |
| `processAutopayment`          | Retry autopayment on a specific history entry                            |

### Date Computation (`lib/recurring/scheduler.ts`)

Pure utility functions:

- `computeNextInvoiceDate(frequency, dayOfWeek, dayOfMonth, currentDate)` - advances to next billing date
- `getRecurringPeriod(frequency, invoiceDate)` - computes period_start and period_end
- `estimateMonthlyRevenue(amountCents, frequency)` - MRR estimation

### UI Components

- `components/finance/recurring-invoice-form.tsx` - full CRUD form with schedule list, create/edit, pause/resume/cancel, history viewer, generate due invoices, summary stats
- `components/finance/recurring-dashboard.tsx` - widget for the finance dashboard showing MRR, active count, overdue, upcoming invoices

### Page

- `app/(chef)/finance/recurring/page.tsx` - the main recurring invoices page

## Autopay Flow

1. Chef enables autopay on a schedule and saves a Stripe PaymentMethod ID
2. When `generateDueInvoices()` runs, it finds due schedules with autopay enabled
3. Creates a PaymentIntent with `off_session: true` and `confirm: true`
4. On success: creates ledger entry, marks history as paid
5. On failure: marks history as sent (will become overdue), notifies chef

## Integration Points

- **Invoice numbering**: uses the same `generateInvoiceNumber()` from `lib/events/invoice-actions.ts` (INV-YYYY-NNN format, sequential per chef per year)
- **Ledger**: autopay creates ledger entries via `appendLedgerEntryForChef()` with transaction_reference for idempotency
- **Activity logging**: schedule creation logged to `chef_activity_log` (non-blocking)
- **Notifications**: autopay failures create chef notifications (non-blocking)

## Future Work

- Cron endpoint or edge function to call `generateDueInvoices()` daily
- Email notifications to clients when invoices are generated
- Client portal view of recurring invoices
- Stripe Customer portal integration for payment method management
