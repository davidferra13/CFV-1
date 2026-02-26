# Post-Event Financial Closure

**Date:** 2026-02-20
**Status:** Implemented — audited and patched

---

## What Changed & Why

After every dinner, both the chef and the client need to close out the event cleanly. The data models for this (ledger, expenses, receipts, AAR, financial_closed flag, post-event queue) already existed in full — what was missing was a guided, opinionated flow that takes both parties through closure without friction or hunting.

This implementation adds that orchestration layer.

---

## New Files

| File                                        | Purpose                                             |
| ------------------------------------------- | --------------------------------------------------- |
| `components/events/close-out-wizard.tsx`    | 5-screen guided wizard for chef post-event closure  |
| `app/(chef)/events/[id]/close-out/page.tsx` | Server page that fetches wizard data and renders it |
| `components/client/post-event-banner.tsx`   | Review prompt banner shown on client My Events page |

---

## Modified Files

| File                                      | What Changed                                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/events/financial-summary-actions.ts` | Added `recordTip()` and `getEventCloseOutData()`                                                                                                |
| `components/events/event-transitions.tsx` | "Mark Completed" button now redirects to `/events/[id]/close-out` instead of refreshing                                                         |
| `app/(client)/my-events/page.tsx`         | Added PostEventBanner, balance-due badge + "Pay Balance" button on completed events, "Leave Review" button                                      |
| `app/(client)/my-events/[id]/page.tsx`    | Added `id="review"` anchor to feedback section, red balance-due display + "Pay Remaining Balance" for completed events with outstanding balance |
| `lib/email/templates/event-completed.tsx` | Two CTAs (View Receipt + Leave Review), better subject line, HR divider                                                                         |
| `lib/email/notifications.ts`              | Passes `receiptUrl` + `reviewUrl` (with `#review` anchor) to email template                                                                     |

---

## Chef Flow (same night, ~3–5 minutes)

```
[Mark Completed] → redirects to /events/[id]/close-out
   ↓
Step 1 — Tip
  • Already in ledger? Shows "already recorded" + Continue
  • Balance outstanding? Warns chef + Continue anyway
  • Otherwise: amount input + method picker (Cash/Venmo/Zelle/Other) + "No tip tonight"
  → Calls: recordTip() → appendLedgerEntry(entry_type='tip')

Step 2 — Receipts
  • No expenses at all? Note + "Go add expenses" link
  • All receipts uploaded? Green checkmark + Continue
  • Missing receipts? Lists them + link to event page + "Continue anyway"
  → No new server action: chef uploads from the event page

Step 3 — Mileage
  • Pre-fills current value if already set
  • Shows IRS deduction in real-time as chef types
  → Calls: updateMileage() (existing action)

Step 4 — Quick AAR
  • AAR already filed? Shows "already filed" + Continue
  • Otherwise: calm rating (1–5) + prep rating (1–5) + optional notes field
  → Calls: createAAR() with calm_rating, preparation_rating, general_notes

Step 5 — Financial Close
  • Shows: revenue, tip, expenses, profit, margin %, effective hourly rate, mileage deduction
  • Warns if outstanding balance still exists (non-blocking)
  • [Mark Tonight Financially Closed] button
  → Calls: markFinancialClosed()
  → Shows green success screen with net profit figure
```

The wizard is dismissable at any step ("Finish later — go back to event"). Steps auto-detect existing data: if tip is already in ledger, step 1 shows confirmation instead of a form.

---

## Client Flow (next morning, ~2–3 minutes)

```
[Auto] Email sent by completeEvent() side effect:
  Subject: "Thank you for dining with [Chef Name]"
  CTA 1 (primary): "View Your Receipt" → /my-events/[id]
  CTA 2 (secondary): "Leave a Review" → /my-events/[id]#review

Client My Events page:
  • PostEventBanner shown for most recent completed event without a review
  • Dismissable (sessionStorage — no database write needed)
  • "Leave Review" link on each completed event card (new)
  • "Balance Due" error badge + "Pay Balance" button if outstanding_balance_cents > 0

Client event detail page:
  • Balance Due shown in red when > 0
  • "Pay Remaining Balance" red CTA on event detail for completed events with balance
  • Review section has id="review" for deep-link from email/banner
```

---

## New Server Actions

### `recordTip(eventId, amountCents, paymentMethod)`

`lib/events/financial-summary-actions.ts`

Records a cash/offline tip as an immutable ledger entry (`entry_type = 'tip'`). Requires event to be `in_progress` or `completed`. Uses admin client for the insert (same pattern as `recordOfflinePayment`). Revalidates event and close-out paths.

### `getEventCloseOutData(eventId): CloseOutData | null`

`lib/events/financial-summary-actions.ts`

Single aggregated fetch for the wizard page. Returns:

- Event metadata (occasion, date, client first name, aarFiled, financialClosed, mileageMiles)
- Financial snapshot (quoted, paid, tip, gross profit, margin %, food cost %, hourly rate, mileage deduction)
- Existing tip entry (to skip/confirm on wizard step 1)
- Expenses with missing receipts (step 2)
- Whether an AAR exists (step 4)

Returns `null` if event is not found, not owned by chef, or not in `completed` status.

---

## Post-Audit Fixes (same session)

Three bugs caught and corrected before shipping:

| Bug                    | Where                                                                                                                                                  | Fix                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Column name mismatch   | `getEventCloseOutData()` — queried `shopping_minutes` but DB column is `time_shopping_minutes` (added with `time_` prefix in migration 20260216000003) | Fixed all 5 column names                                                                                                   |
| Hardcoded chef name    | `app/(client)/my-events/page.tsx` — PostEventBanner showed "your chef"                                                                                 | Added single `chefs` table lookup for `business_name` when unreviewed event found                                          |
| Missing follow-up step | Wizard success screen had no way to mark `follow_up_sent = true`, leaving the post-event queue item perpetually pending                                | Added follow-up prompt to the success screen — calls existing `markFollowUpSent()` action; queue item clears automatically |

---

## Architecture Notes

### Immutability preserved

`recordTip()` uses the same append-only pattern as all other ledger writes. No existing entries are modified.

### No new database migrations needed

All columns used (`financial_closed`, `aar_filed`, `mileage_miles`, `tip_amount_cents` via ledger trigger) already exist from prior migrations.

### Wizard is idempotent

Each step checks current state before allowing action:

- Step 1: skips form if tip already in ledger
- Step 4: skips form if AAR already filed
- Close step: shows "already closed" if financially_closed = true

### Client banner is zero-cost

PostEventBanner uses `sessionStorage` for dismiss state — no database read/write. The list page does a single bulk query (`client_reviews IN (event_ids)`) rather than per-event queries.

---

## How to Test

1. **Chef completes an event** — tap "Mark Completed" on an `in_progress` event → wizard opens at `/events/[id]/close-out`
2. **Walk wizard steps** — each step saves correctly (verify via event detail page financial summary + AAR section)
3. **Skip steps** — "No tip tonight" and "Skip for now" buttons work without errors
4. **Already-done detection** — if tip exists in ledger, step 1 shows confirmation instead of form
5. **Financial close** — step 5 shows correct profit; "Mark Tonight Financially Closed" sets `financial_closed = true`
6. **Post-event closure card** — on event detail, all 4 checklist items show green after wizard completes
7. **Client email** — upon completion, client receives email with both "View Your Receipt" and "Leave a Review" CTAs
8. **Client My Events** — `PostEventBanner` visible for unreviewed completed events; dismisses on click
9. **Client balance due** — completed event with unpaid balance shows red "Balance Due" badge + "Pay Balance" button
10. **Review anchor** — `/my-events/[id]#review` deep-link scrolls directly to the feedback form
