# Payment & Cancellation System

**Added:** 2026-02-28
**Branch:** Current feature branch
**Summary:** Unified payment recording (Stripe + offline), structured cancellation policy, refund initiation, and proactive payment reminders.

---

## Problem Solved

The platform had solid Stripe infrastructure but three operational gaps:

1. **No offline payment recording** — when clients paid via Venmo, cash, or Zelle, events stayed stuck in `accepted` forever and the ledger never updated.
2. **No cancellation policy** — no refund logic, no client-visible terms, no refund initiation UI.
3. **No payment reminders** — clients had no automated nudges to pay before the event.

---

## Cancellation Policy (Take a Chef Terms)

| Scenario | Refund |
|---|---|
| ≥15 days before event | Full balance refund |
| Within 24 hrs of payment AND event >3 days away | Full balance refund |
| <15 days before event (outside 24-hr window) | No refund |
| Deposit | **Non-refundable** by default |

Chef can configure `cancellation_cutoff_days` (default 15) and `deposit_refundable` (default false) via the new columns on the `chefs` table.

The policy engine lives in [`lib/cancellation/policy.ts`](../lib/cancellation/policy.ts). It is a pure function — no DB calls, fully testable.

---

## New Files

### Core Logic

| File | Purpose |
|---|---|
| [`lib/cancellation/policy.ts`](../lib/cancellation/policy.ts) | Pure policy engine — `computeCancellationRefund()`, `getCancellationPolicySummary()`, `getCancellationPolicyLines()` |
| [`lib/cancellation/refund-actions.ts`](../lib/cancellation/refund-actions.ts) | Chef server actions: `getCancellationRefundRecommendation()`, `initiateRefund()` |
| [`lib/events/offline-payment-actions.ts`](../lib/events/offline-payment-actions.ts) | Chef server action: `recordOfflinePayment()` |
| [`lib/stripe/refund.ts`](../lib/stripe/refund.ts) | `createStripeRefund()`, `getStripePaymentIntentIdForEvent()` |

### UI Components

| File | Purpose |
|---|---|
| [`components/events/record-payment-modal.tsx`](../components/events/record-payment-modal.tsx) | Modal for recording offline payments |
| [`components/events/initiate-refund-modal.tsx`](../components/events/initiate-refund-modal.tsx) | Modal for initiating refunds (Stripe or offline) |
| [`components/events/cancellation-policy-display.tsx`](../components/events/cancellation-policy-display.tsx) | Policy display — `compact` (banner) and `full` (table) variants |
| [`components/events/payment-actions-panel.tsx`](../components/events/payment-actions-panel.tsx) | `RecordPaymentPanel` and `ProcessRefundPanel` — panel-level wrappers used by chef event page |

### Email Templates

| File | When Sent |
|---|---|
| [`lib/email/templates/offline-payment-receipt.tsx`](../lib/email/templates/offline-payment-receipt.tsx) | Client receives when chef records offline payment |
| [`lib/email/templates/refund-initiated.tsx`](../lib/email/templates/refund-initiated.tsx) | Client receives when refund is initiated |
| [`lib/email/templates/payment-reminder.tsx`](../lib/email/templates/payment-reminder.tsx) | Client receives at 7d, 3d, 1d before event (unpaid) |
| [`lib/email/templates/payment-received-chef.tsx`](../lib/email/templates/payment-received-chef.tsx) | Chef receives when Stripe payment succeeds |

### Database Migration

**File:** [`supabase/migrations/20260228000006_payment_cancellation_policy.sql`](../supabase/migrations/20260228000006_payment_cancellation_policy.sql)

New columns added (all additive — no drops, no renames):

```sql
-- chefs table
cancellation_cutoff_days INT NOT NULL DEFAULT 15
deposit_refundable BOOLEAN NOT NULL DEFAULT false

-- events table
payment_reminder_7d_sent_at TIMESTAMPTZ
payment_reminder_3d_sent_at TIMESTAMPTZ
payment_reminder_1d_sent_at TIMESTAMPTZ
```

---

## Modified Files

| File | Change |
|---|---|
| [`lib/email/notifications.ts`](../lib/email/notifications.ts) | Added 4 new dispatcher functions |
| [`app/api/webhooks/stripe/route.ts`](../app/api/webhooks/stripe/route.ts) | Added chef email on `payment_intent.succeeded` |
| [`app/api/scheduled/lifecycle/route.ts`](../app/api/scheduled/lifecycle/route.ts) | Added payment reminder logic (section 4) |
| [`app/(chef)/events/[id]/page.tsx`](../app/(chef)/events/[id]/page.tsx) | Added Record Payment + Process Refund panels |
| [`app/(client)/my-events/[id]/pay/page.tsx`](../app/(client)/my-events/[id]/pay/page.tsx) | Added cancellation policy banner |
| [`app/(client)/my-events/[id]/page.tsx`](../app/(client)/my-events/[id]/page.tsx) | Added cancellation policy banner above action buttons |

---

## Offline Payment Flow

1. Chef opens event in `accepted` or `paid` state with outstanding balance
2. "Record Payment" / "Record Deposit" amber card appears in Financial section
3. Chef clicks → `RecordPaymentModal` opens (pre-populated with correct amount)
4. Chef enters amount, method (Venmo / cash / Zelle / etc.), date, optional notes
5. `recordOfflinePayment()` server action:
   - Determines entry type: `'deposit'` if first payment and deposit not yet met, else `'payment'`
   - Inserts to `ledger_entries` (admin client, triggers `update_event_payment_status_on_ledger_insert`)
   - Re-fetches summary — if deposit threshold met, calls `transitionEvent(accepted → paid, systemTransition: true)`
   - Emails client a receipt (non-blocking)
   - Logs chef activity (non-blocking)
6. Page refreshes — event now shows `paid` status

---

## Refund Initiation Flow

### For Stripe Payments
1. Chef opens a cancelled event that has prior payments
2. "Process Refund" blue card appears
3. `getCancellationRefundRecommendation()` computes recommended refund from policy
4. Chef reviews → `InitiateRefundModal` shows breakdown
5. Chef adjusts amount if needed, enters reason
6. `initiateRefund()` → `createStripeRefund(paymentIntentId, amount)` → Stripe API
7. `charge.refunded` webhook fires → existing `handleRefund()` writes ledger entry
8. Client receives refund email; chef sees activity log

### For Offline Payments
Same flow, but instead of calling Stripe, `initiateRefund()` directly writes a negative ledger entry (`type: 'refund', is_refund: true, amount_cents: -X`).

**Important:** Stripe refunds do NOT also write a ledger entry in `initiateRefund()`. Only the webhook does that. This prevents double-entry.

---

## Payment Reminders Flow

1. Lifecycle cron (`/api/scheduled/lifecycle`) runs daily
2. Section 4 finds events in `accepted` status with `payment_status IN ('unpaid', 'deposit_paid')` where `event_date` is within 7 days
3. For each event, checks which reminder thresholds (7d, 3d, 1d) are past and not yet sent
4. Sends `payment-reminder` email to client
5. Stamps `payment_reminder_*d_sent_at` on the event (idempotent)
6. Respects existing chef-level (`client_event_reminders_enabled`) and client-level (`automated_emails_enabled`) opt-outs

---

## Policy Display Locations

- **Client payment page** (`/my-events/[id]/pay`): compact banner above payment form
- **Client event detail** (`/my-events/[id]`): compact banner above action buttons (paid/confirmed/in_progress events)

---

## Architectural Notes

- **Deposit is non-refundable by default.** The `deposit_refundable` column on `chefs` controls this. Chef can manually override at refund-initiation time by adjusting the amount in the modal.
- **Policy is a pure function.** `computeCancellationRefund()` takes all inputs, returns a result. No DB calls, no side effects.
- **Offline payments have no `transaction_reference`.** The system identifies Stripe vs. offline payments by checking `ledger_entries.internal_notes` for a `PaymentIntent:` prefix.
- **Payment status computed by trigger, never by app code.** The existing `update_event_payment_status_on_ledger_insert` trigger runs on every ledger insert, keeping `events.payment_status` accurate after offline recordings.
- **Offline receipt always shows remaining balance.** After every offline payment, `recordOfflinePayment()` re-fetches the financial summary and passes `outstanding_balance_cents` to the receipt email — so the client always knows what they still owe (important after a deposit-only payment).
- **Payment reminders use actual days.** The lifecycle cron passes the real computed `daysUntilEvent` to the email, not just the threshold bucket (7/3/1), so the email body is always accurate.
