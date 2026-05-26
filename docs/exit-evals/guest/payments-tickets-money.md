# Exit Eval: Guest / PAYMENTS, TICKETS & MONEY

> **Wave 4** | 7 scenarios | Role: GUEST
> **Date:** 2026-05-25
> **Mode:** Solo (NEEDS-DEVELOPER-REVIEW)
> **Evaluator:** Claude Opus 4.6

---

## Scenario #22: Complete public ticket checkout

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** The guest must enter card details into a PCI-compliant payment form. Stripe Checkout is the legally mandated processing surface; no app can internalize raw card entry without PCI Level 1 compliance. The exit is the card-entry ceremony itself.

**Context ChefFlow has:**

- Event name, date, time, location, occasion
- Ticket type, price, quantity, remaining capacity
- Buyer name, email, phone, dietary info, allergies, notes
- Total cost calculation (unit price x quantity)
- Chef Stripe Connect config (transfer routing, application fees)
- Success and cancel return URLs with ticket ID

**Data source?** No. Stripe Checkout is a regulated payment processing surface, not a data API.

**Client-collaborative angle:** None. This is a direct guest-to-processor interaction. The chef has already set prices and ticket types.

**Physical reality:** Screen-based. Guest is browsing an event page, selects tickets, fills form, then taps "Buy" which redirects to Stripe. Mobile-first.

**Compounding:** Low. Each checkout is a one-off transactional exit. However, the return path and confirmation state compound (guest token, circle auto-join, confirmation email).

**Solution design:**

- Already built: `purchaseTicket()` in `lib/tickets/purchase-actions.ts` creates a Stripe Checkout Session with full metadata, success/cancel URLs, and CAS-guarded capacity reservation
- Already built: `public-event-view.tsx` handles `justPurchased` and `purchaseCancelled` states on return
- Already built: `handleTicketPurchaseCompleted()` webhook does 8 steps: mark paid, create hub profile, ledger entry, event guest record, circle auto-join, confirmation email, chef notification, cache invalidation
- Minor gap: No downloadable ticket/receipt PDF from the confirmation state

**Where it appears:**

- `/e/[shareToken]` public event page (purchase flow)
- Stripe Checkout (external, hosted)
- `/e/[shareToken]?purchased=true` confirmation view on return

**What remains as permanent exit:**
The card entry itself on Stripe Checkout. PCI compliance mandates this surface remains external. ChefFlow correctly redirects to Stripe and handles the return.

**Priority:** High frequency x Low effort (already built) = Maintenance only
**Spec needed?** No. Flow is complete. Minor enhancement: downloadable receipt PDF on confirmation.

---

## Scenario #23: Retry failed or cancelled checkout

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why guest leaves:** A previous payment attempt failed (card declined, session expired, user cancelled) and the guest needs to try again. The friction is: can they find their way back and does ChefFlow surface the retry clearly?

**Context ChefFlow has:**

- Original ticket record with `payment_status: 'failed' | 'cancelled'`
- `retry_available_at` timestamp
- `last_payment_error` message
- `capacity_released_at` flag (knows whether to re-reserve capacity)
- Original buyer email, ticket type, quantity
- Full event context for a new Stripe session

**Data source?** No. The retry creates a new Stripe Checkout session.

**Client-collaborative angle:** None. This is between the guest and their card/bank.

**Physical reality:** Screen. Guest returns to event page (from email, bookmark, or browser history) and needs a clear "Try again" button.

**Compounding:** Low. One-off recovery, though building robust retry UX benefits all future failed transactions.

**Solution design:**

- Already built: `retryTicketPurchase()` in `lib/tickets/purchase-actions.ts` with full CAS guards, capacity re-reservation, and new Stripe session creation
- Already built: `handleTicketPaymentFailed()` and `handleTicketCheckoutExpired()` in `lib/tickets/webhook-handler.ts` properly release capacity and set retry state
- Already built: `purchaseCancelled` prop drives "cancelled" view mode in `public-event-view.tsx`
- Gap: The cancel URL returns to `/e/[shareToken]?cancelled=true&ticket=[id]` but the UI may not prominently show the retry CTA with the specific ticket context

**Where it appears:**

- `/e/[shareToken]?cancelled=true` (return from cancelled checkout)
- Email (if chef or system notifies guest of failed payment, which is not currently implemented for the guest side)

**What remains as permanent exit:**
The retry still goes through Stripe Checkout (permanent external surface). But the discovery of the retry path and re-entry are fully in ChefFlow's control.

**Priority:** Medium frequency x Low effort (mostly built) = Polish the cancelled state UI
**Spec needed?** No. Core logic exists. UI polish task for the cancelled/failed state to make retry more prominent.

---

## Scenario #24: Check bank or card balance before buying

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** The guest needs to verify they have sufficient funds or credit before committing to a ticket purchase. This requires their banking/card app which ChefFlow cannot and should not access.

**Context ChefFlow has:**

- Exact total due (ticket price x quantity, clearly displayed)
- Event date (so guest knows when the charge will process)
- Ticket type details and any remaining capacity urgency

**Data source?** No. Bank balance is private financial data behind the guest's own authentication. No public API, no legal pathway for ChefFlow to access.

**Client-collaborative angle:** None. This is entirely personal financial readiness.

**Physical reality:** Guest opens their bank app or card app on the same phone, checks balance, returns to ChefFlow. The key UX need: do not lose their cart state or form data while they alt-tab.

**Compounding:** None. One-off personal check with no learnable pattern.

**Solution design:**

- Already built: Total price is prominently displayed before checkout (`orderTotalCents` calculated and shown in `public-event-view.tsx`)
- Already built: Form state persists in React state (not lost on tab switch)
- Minor consideration: If guest takes too long, the page could theoretically be GC'd by the browser. But Stripe session has 72hr expiry so this is fine.
- No further build needed

**Where it appears:**

- `/e/[shareToken]` (price visible before "Buy" button)
- Guest's banking app (permanent external)

**What remains as permanent exit:**
Checking bank balance is always external. ChefFlow's job is to show the exact amount clearly and not lose form progress while the guest checks.

**Priority:** Medium frequency x Zero effort = No action needed
**Spec needed?** No

---

## Scenario #25: Split ticket or event cost with friends

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why guest leaves:** After purchasing tickets (or before), the guest wants to split the cost with friends who are attending. They open Venmo, Cash App, Zelle, or Splitwise to request or send money. The social reimbursement layer is external.

**Context ChefFlow has:**

- Total amount paid (from ticket record)
- Number of tickets purchased (quantity)
- Per-ticket price (unit_price_cents)
- Event name, date for context in the payment request message
- Buyer name and potentially other attendee names (plus_one_name)
- Guest token for self-service ticket lookup

**Data source?** No. Venmo/Zelle/Splitwise are peer-to-peer payment platforms, not data APIs.

**Client-collaborative angle:** Moderate. If multiple people in a Dinner Circle bought tickets, the circle chat could facilitate "who owes whom." The chef's split-billing system (`lib/payments/payment-splitting.ts`) exists but is chef-side for multi-client events, not guest-side cost sharing.

**Physical reality:** Screen. Guest texts friends "you owe me $45 for the dinner" with Venmo/Zelle links. ChefFlow can make copy-paste easier.

**Compounding:** Low. Each split is event-specific. However, a spec exists for a group split page (`docs/specs/build-group-split-page.md`) that would let hosts share a breakdown link.

**Solution design:**

- Partially spec'd: `docs/specs/build-group-split-page.md` describes a public `/split/[token]` page showing event total, per-person split, and paid/unpaid status
- Already built (chef-side): `lib/payments/payment-splitting.ts` has `listPaymentSplitEvents`, `getPaymentSplitDetails`, `updateEventPaymentSplits`
- Gap: No guest-facing split share page exists yet
- Gap: No "copy split amount" or "send request via" helper on ticket confirmation
- Enhancement: After purchase, show "Splitting with friends? Here's the per-person breakdown" with copyable text

**Where it appears:**

- `/e/[shareToken]?purchased=true` (post-purchase confirmation, ideal place for split info)
- Future: `/split/[token]` public page (spec exists but not built)
- Dinner Circle chat (social coordination surface)

**What remains as permanent exit:**
The actual money transfer (Venmo, Zelle, etc.) is always external. ChefFlow can reduce friction by providing the exact amounts, copyable text, and a shareable breakdown page.

**Priority:** Medium frequency x Medium effort = P2 (spec exists, needs build)
**Spec needed?** No (already exists at `docs/specs/build-group-split-page.md`)

---

## Scenario #26: Tip via informal method

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why guest leaves:** The guest wants to tip the chef after a great experience. If the chef has not sent a tip request link, or if the guest prefers Venmo/cash/other method not supported by the in-app tip form, they leave to use their preferred payment method.

**Context ChefFlow has:**

- Full tip request system: `lib/finance/tip-actions.ts` with `createTipRequest`, `getTipRequestByToken`, `recordTip`
- Public tip page at `/tip/[token]` with Uber-style suggested amounts (percentage or flat)
- Tip methods: card, cash, venmo, other (recorded but not processed inline)
- Chef business name, event date, event occasion displayed on tip page
- Post-action footer with "Book Again" link
- Ledger integration (tips appear in financial summary)

**Data source?** No. The payment transfer is external (Venmo, cash, etc.). But the tip recording is fully in-app.

**Client-collaborative angle:** The chef can attach payment instructions (Venmo handle, PayPal link) to the tip request. Currently the tip form records method choice but does not display chef payment instructions.

**Physical reality:** Post-event. Guest is relaxed, on phone, willing to interact. Not time-pressured.

**Compounding:** Medium. Tip patterns per client compound (tip rate, average amount tracked in `getTipSummary`). Chef learns which clients tip and by how much.

**Solution design:**

- Already built: Full tip request system with public `/tip/[token]` page, suggested amounts, method selection, notes
- Already built: `recordTip()` with CAS guard, ledger entry, event_tips mirror
- Already built: Chef-side tip log panel, YTD summary, per-event tip request creation
- Gap: Chef cannot attach their Venmo/PayPal/Cash App handle to the tip page for guests who choose "venmo" or "other"
- Gap: Guest choosing "venmo" sees no actionable link or instructions; they must already know the chef's Venmo

**Where it appears:**

- `/tip/[token]` (public, no auth, Uber-style tip prompt)
- Post-event email (chef sends tip request link)
- Guest feedback page (post-action footer could link to tip)

**What remains as permanent exit:**
If guest chooses Venmo/cash/other, the actual transfer happens externally. ChefFlow can only record that it happened. If chef provides their Venmo handle on the tip page, the guest still opens Venmo to send it.

**Priority:** High frequency x Low effort = P1 (add chef payment handle display to tip page)
**Spec needed?** No. Small enhancement: add `payment_instructions` field to tip request or chef settings, display on `/tip/[token]` when method is venmo/other.

---

## Scenario #27: Resolve card dispute or refund

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** The guest disputes a charge or requests a refund. Disputes go through their bank/card issuer. Refunds may be initiated by the chef through Stripe. The guest's role is to contact their bank or the chef, both of which happen outside the guest's ChefFlow surface.

**Context ChefFlow has:**

- Chef-side dispute tracking: `lib/finance/dispute-actions.ts` with full CRUD (status: open/under_review/won/lost, evidence notes, evidence URLs)
- Chef-side refund system: `lib/stripe/refund.ts`, `lib/cancellation/refund-actions.ts`, `lib/commerce/refund-actions.ts`
- Ticket webhook handlers for failed/cancelled payments
- Ledger entries for all financial transactions
- Guest has no authenticated surface to view dispute status

**Data source?** No. Bank dispute processes are regulatory and external. Stripe dispute webhooks inform the chef, not the guest.

**Client-collaborative angle:** Minimal for guests. The chef resolves disputes. If the guest is a client (authenticated), they have portal access. Public ticket buyers have no self-service dispute surface.

**Physical reality:** Phone call to bank, or email to chef. Not an in-app workflow for the guest.

**Compounding:** None for the guest. Chef-side: dispute rate tracking compounds (`lib/finance/chargeback-rate.ts`).

**Solution design:**

- Already built (chef-side): Full dispute tracking, evidence management, status workflow
- Already built: Stripe webhook integration for dispute lifecycle
- Gap: Guest/ticket buyer has no way to view refund status or contact support from their ticket context
- Minor enhancement: Add "Need help?" or "Request refund" link on the ticket confirmation page or guest token page that opens a pre-filled email to the chef

**Where it appears:**

- Guest's bank app (permanent external)
- Chef's finance dashboard (internal)
- Future: Ticket guest token page could show refund status

**What remains as permanent exit:**
Bank disputes are entirely external. Even refund initiation happens on the chef's side. The guest's only action is to contact their bank or the chef directly.

**Priority:** Low frequency x Low effort = P3 (add support contact on ticket pages)
**Spec needed?** No

---

## Scenario #28: Expense ticket or dinner cost

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why guest leaves:** The guest needs to submit the dinner/ticket cost to their employer's expense system (Expensify, Concur, corporate portal). They need a receipt or invoice with date, amount, vendor name, and description.

**Context ChefFlow has:**

- Ticket purchase record: amount, date, event name, chef business name
- Event details: date, occasion, location
- Stripe generates a receipt (accessible via Stripe-hosted receipt URL on the PaymentIntent)
- Client-side receipt system exists (`lib/receipts/client-receipt-actions.ts`) but requires client auth
- `getTicketByGuestToken()` returns full ticket and event info for self-service lookup

**Data source?** No. The expense system is external. But ChefFlow has all the data needed to produce a downloadable receipt.

**Client-collaborative angle:** None. This is a guest-to-employer workflow.

**Physical reality:** Guest needs a PDF or image of a receipt they can upload to their expense system. Email receipt is ideal (forward to expense system). Downloadable PDF is the fallback.

**Compounding:** Medium. If ChefFlow generates proper receipts, repeat corporate guests learn to expect them. The format standardizes across events.

**Solution design:**

- Partially built: `getTicketByGuestToken()` in `lib/tickets/purchase-actions.ts` provides self-service ticket lookup with event details
- Partially built: Client receipt system exists but requires authentication
- Partially built: Stripe sends its own receipt email (but generic, not branded with event details)
- Gap: No ChefFlow-branded downloadable receipt/invoice for ticket buyers
- Gap: Ticket confirmation email does not include a receipt attachment or link
- Enhancement: Generate a simple receipt (event name, date, location, chef name, amount, transaction ID) available via guest token or emailed post-purchase

**Where it appears:**

- Ticket confirmation email (ideal place to include receipt link)
- `/e/[shareToken]?purchased=true` (confirmation page could offer "Download Receipt")
- Guest token self-service page (if one exists)
- Employer expense portal (permanent external)

**What remains as permanent exit:**
The actual expense submission to the employer's system is always external. ChefFlow's job is to provide the receipt in a format the expense system accepts (PDF, email with structured data).

**Priority:** Medium frequency x Medium effort = P2 (generate guest receipt PDF)
**Spec needed?** Yes (small spec for guest ticket receipt generation, but could be a build queue item rather than full spec)

---

## Batch Summary

| #   | Title                                    | Reclassified To     | Spec Needed? |
| --- | ---------------------------------------- | ------------------- | ------------ |
| 22  | Complete public ticket checkout          | Permanent           | No           |
| 23  | Retry failed or cancelled checkout       | Reducible           | No           |
| 24  | Check bank or card balance before buying | Permanent           | No           |
| 25  | Split ticket or event cost with friends  | Bridgeable          | No (exists)  |
| 26  | Tip via informal method                  | Partially Reducible | No           |
| 27  | Resolve card dispute or refund           | Permanent           | No           |
| 28  | Expense ticket or dinner cost            | Bridgeable          | Yes (small)  |

### Key Findings

1. **Ticketing system is mature.** The purchase flow, retry logic, webhook handling, capacity management, and post-purchase lifecycle (circle join, email, notifications, ledger) are all production-ready.

2. **Tip system is complete but missing chef payment instructions.** The Uber-style tip flow works end-to-end, but when a guest chooses "venmo" or "other," there is no way to display the chef's payment handle.

3. **Receipt/expense gap is the most actionable.** Ticket buyers currently have no downloadable receipt. The data exists (`getTicketByGuestToken`), but no PDF/export is generated.

4. **Split page is spec'd but not built.** `docs/specs/build-group-split-page.md` fully describes the guest-facing group split page. It is a build queue item.

5. **Three scenarios are truly Permanent** (checkout card entry, bank balance check, dispute resolution) with no further reduction possible beyond what is already built.

### Codebase Evidence

| File                                                | Role                                                   |
| --------------------------------------------------- | ------------------------------------------------------ |
| `lib/tickets/purchase-actions.ts`                   | Full purchase + retry + waitlist + public event info   |
| `lib/tickets/webhook-handler.ts`                    | Payment success/failure/cancel/expire handlers         |
| `app/(public)/e/[shareToken]/public-event-view.tsx` | Public ticket purchase UI                              |
| `lib/finance/tip-actions.ts`                        | Full tip request system (create, record, get by token) |
| `app/(public)/tip/[token]/tip-form.tsx`             | Guest-facing tip UI                                    |
| `lib/payments/payment-splitting.ts`                 | Chef-side split billing (not guest-facing yet)         |
| `docs/specs/build-group-split-page.md`              | Spec for guest-facing split page                       |
| `lib/finance/dispute-actions.ts`                    | Chef-side dispute tracking                             |
| `lib/receipts/client-receipt-actions.ts`            | Client receipt system (auth-required)                  |
| `lib/stripe/checkout.ts`                            | Stripe Checkout session creation for event payments    |

---

_All scenarios marked NEEDS-DEVELOPER-REVIEW (solo mode, no chef input)._
