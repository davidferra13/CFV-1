# Inquiry-to-Revenue Pipeline Interrogation Protocol

> **Purpose:** 40 high-leverage questions that expose every failure point in the core business pipeline: inquiry intake, event lifecycle, quoting, payment, post-event follow-up. Each question either proves the pipeline works end-to-end or reveals exactly where money, leads, or trust leaks out. Ordered by revenue impact.
>
> **Scope:** The entire journey from "someone wants to hire a chef" to "chef gets paid and client comes back." Both sides of the transaction: chef and client.
>
> **Principle:** Every question is binary pass/fail. "Usually works" is not a passing answer. If the pipeline can silently lose a lead, misquote a price, or strand a payment, that is a failure.

---

## Coverage Map

| Q    | Title                                   | Domain       | Status | Priority |
| ---- | --------------------------------------- | ------------ | ------ | -------- |
| PL1  | Quote-to-Payment Handoff                | Conversion   | SPEC   | P0       |
| PL2  | Balance Payment After Deposit           | Payment      | SPEC   | P0       |
| PL3  | Zero-Match Booking Lead Capture         | Lead Loss    | SPEC   | P0       |
| PL4  | Draft Event Placeholder Enforcement     | Data Truth   | SPEC   | P0       |
| PL5  | Dual Accept Path Confusion              | UX           | SPEC   | P0       |
| PL6  | Payment Page Access vs Payment Creation | Payment      | SPEC   | P0       |
| PL7  | Inquiry Stall Detection                 | Lead Loss    | SPEC   | P1       |
| PL8  | Quote Expiry Silent Death               | Lead Loss    | SPEC   | P1       |
| PL9  | Event Without Pricing                   | Financial    | SPEC   | P1       |
| PL10 | Stripe Connect Onboarding Gate          | Payment      | SPEC   | P1       |
| PL11 | Client Portal Event Visibility          | UX           | SPEC   | P1       |
| PL12 | Cancellation Financial Cleanup          | Financial    | SPEC   | P1       |
| PL13 | Post-Event Follow-Up Delivery           | Retention    | SPEC   | P1       |
| PL14 | Dinner Circle Auto-Creation Reliability | Comms        | SPEC   | P1       |
| PL15 | Inquiry Deduplication                   | Data Truth   | SPEC   | P1       |
| PL16 | Webhook Idempotency                     | Payment      | SPEC   | P1       |
| PL17 | Chef Notification Delivery              | Lead Loss    | SPEC   | P2       |
| PL18 | Client Confirmation Email               | Comms        | SPEC   | P2       |
| PL19 | Quote PDF Accuracy                      | Financial    | SPEC   | P2       |
| PL20 | Event FSM Skip Guards                   | Lifecycle    | SPEC   | P2       |
| PL21 | Readiness Gate Override Audit           | Lifecycle    | SPEC   | P2       |
| PL22 | Offline Payment Ledger Integrity        | Financial    | SPEC   | P2       |
| PL23 | Multi-Day Event Series Integrity        | Lifecycle    | SPEC   | P2       |
| PL24 | Inquiry Channel Attribution             | Analytics    | SPEC   | P2       |
| PL25 | Client Review Collection Rate           | Retention    | SPEC   | P2       |
| PL26 | Rebooking Nudge Effectiveness           | Retention    | SPEC   | P2       |
| PL27 | Open Booking Founder First-Dibs         | Lead Routing | SPEC   | P2       |
| PL28 | Rate Limit Parity Across Intake         | Security     | SPEC   | P2       |
| PL29 | Proposal Template Completeness          | UX           | SPEC   | P3       |
| PL30 | Contract Signing Before Payment         | Legal        | SPEC   | P3       |
| PL31 | Gift Card Payment Integration           | Payment      | SPEC   | P3       |
| PL32 | Tip Collection Post-Event               | Financial    | SPEC   | P3       |
| PL33 | Menu Approval Client Flow               | UX           | SPEC   | P3       |
| PL34 | Pre-Event Checklist Enforcement         | Lifecycle    | SPEC   | P3       |
| PL35 | Event Countdown Page Utility            | UX           | SPEC   | P3       |
| PL36 | Client Spending History Accuracy        | Financial    | SPEC   | P3       |
| PL37 | Loyalty Points Accuracy                 | Retention    | SPEC   | P3       |
| PL38 | Automation Engine Reliability           | Comms        | SPEC   | P3       |
| PL39 | Remy Lead Scoring Signal Quality        | AI           | SPEC   | P3       |
| PL40 | Pipeline Funnel Metrics Visibility      | Analytics    | SPEC   | P3       |

---

## TIER 1: REVENUE KILLERS (P0)

### PL1: Quote-to-Payment Handoff

**Question:** When a client accepts a quote, are they immediately offered a path to pay?

**Current state:** `QuoteResponseButtons` (`app/(client)/my-quotes/[id]/quote-response-buttons.tsx:35`) calls `router.push('/my-quotes')` after acceptance. Client lands on the quotes list. No redirect to payment. No "Pay now" CTA. No link to the event's payment page. The client must independently discover `/my-events/[id]/pay`.

**Why it matters:** This is the single biggest conversion leak in the pipeline. The moment of highest buying intent (just accepted a quote) dumps the client into a list page with no next action. Every minute between quote acceptance and payment attempt is a chance for the client to get distracted or reconsider.

**Pass criteria:**

- After `acceptQuote()` succeeds, the client is redirected to the event detail or payment page (not the quotes list)
- OR the quotes list shows a prominent "Pay Now" CTA next to accepted quotes with a linked event
- The redirect uses the quote's `event_id` to construct the payment URL

**Verification:** Read `quote-response-buttons.tsx` line 35. Confirm redirect target. Check if `/my-quotes` page shows payment CTA for accepted quotes.

**What to build:** Change `router.push('/my-quotes')` to `router.push('/my-events/${eventId}/pay')` when the quote has an `event_id`. Fall back to `/my-quotes` if no event is linked. Requires passing `eventId` into the response buttons component.

---

### PL2: Balance Payment After Deposit

**Question:** Can a client pay the remaining balance after their deposit is processed?

**Current state:** `createPaymentIntent()` (`lib/stripe/actions.ts:56`) guards: `if (event.status !== 'accepted') return error`. After deposit, the Stripe webhook transitions the event to `paid`. Client navigates to `/my-events/[id]/pay`, sees "Pay Remaining Balance" UI, clicks pay, and gets **"Event is not ready for payment"** error. The server rejects the PaymentIntent because status is `paid`, not `accepted`.

**Why it matters:** A chef who quotes $3,000 with a $1,000 deposit cannot collect the remaining $2,000 through Stripe. They must record it offline, losing the Stripe paper trail, the automatic ledger entry, and the client-facing receipt. This breaks the financial audit trail.

**Pass criteria:**

- `createPaymentIntent()` accepts events in statuses: `accepted`, `paid`, `confirmed`, `in_progress`
- The payment page correctly shows outstanding balance for each status
- After balance payment, the event does NOT transition again (already `paid`)
- The ledger correctly records both deposit and balance as separate entries

**Verification:** Read `lib/stripe/actions.ts` line 56. Change the guard. Verify the webhook handler handles subsequent payments for already-`paid` events (check for idempotency on transition).

**What to build:** Expand the status guard from `event.status !== 'accepted'` to a set: `!['accepted', 'paid', 'confirmed', 'in_progress'].includes(event.status)`. The webhook transition logic already handles the case where an event is already `paid` (it skips the transition via idempotency check).

---

### PL3: Zero-Match Booking Lead Capture

**Question:** When the `/book` form matches zero chefs, is the lead saved for future follow-up?

**Current state:** `app/api/book/route.ts:124-131` returns `{ success: true, matched_count: 0, message: "...will notify you when a chef becomes available" }` but creates **zero database records**. No client record, no inquiry, no waitlist entry. The lead is permanently lost.

**Why it matters:** Every zero-match submission is a real person with a real event who wanted to pay a real chef. The promise to notify them is a lie (no record exists to trigger notification). This is both a lead loss and a Zero Hallucination violation.

**Pass criteria:**

- Zero-match submissions create a record in `directory_waitlist` (migration just built in PS3) or a dedicated `booking_waitlist` table
- The record includes: email, name, location, event date, service type, guest count
- When a new chef signs up in a previously uncovered area, there is a mechanism to notify waiting leads
- The thank-you messaging does NOT promise notification unless a record was created

**Verification:** Read `app/api/book/route.ts` lines 124-131. Check if any DB write occurs. Check if the waitlist table from PS3 is reused here.

**What to build:** Before the zero-match return, insert into `directory_waitlist` with the client's email and location. This leverages the table we already created in PS3.

---

### PL4: Draft Event Placeholder Enforcement

**Question:** Can a chef propose an event (draft -> proposed) without filling in TBD placeholder fields?

**Current state:** Auto-created events from public intake have `location_city: 'TBD'`, `location_zip: 'TBD'`. The FSM transition `draft -> proposed` in `transitionEvent()` does NOT check whether these placeholders have been replaced with real data. A chef could propose an event with "TBD" as the city, and the client would see it.

**Why it matters:** A client receiving a proposal that says "Location: TBD" looks unprofessional and erodes trust. It also means the event can progress through the entire lifecycle with incomplete data.

**Pass criteria:**

- `transitionEvent('proposed')` validates that `location_city` is not 'TBD' and `location_zip` is not 'TBD'
- OR the transition adds a soft readiness gate warning (chef can override with reason)
- The client NEVER sees "TBD" as a location in any proposal or event view

**Verification:** Read `lib/events/transitions.ts` for the `draft -> proposed` transition handler. Search for any validation of `location_city` or `location_zip`. Check the event detail page for how location is displayed.

**What to build:** Add a soft readiness gate to `draft -> proposed`: if `location_city === 'TBD'` or `location_zip === 'TBD'`, warn the chef "Event location is incomplete. Continue anyway?" Chef can override, but the warning surfaces the issue.

---

### PL5: Dual Accept Path Confusion

**Question:** Is it possible for a client to need to accept BOTH a quote AND a proposal for the same event?

**Current state:** Two parallel acceptance mechanisms exist:

1. **Quote acceptance** via `/my-quotes/[id]` with `QuoteResponseButtons` (transitions quote `sent -> accepted`, advances inquiry to `confirmed`)
2. **Proposal acceptance** via `/my-events/[id]` with `AcceptProposalButton` (transitions event `proposed -> accepted`)

If a chef sends a quote AND proposes the event, the client sees two separate things to accept. The quote acceptance does NOT auto-accept the proposal (they are different state machines). The client could accept the quote but the event remains in `proposed` status, requiring a SECOND acceptance.

**Why it matters:** A client who accepted a quote and thinks they're done will be confused when the event still shows "awaiting your response." Double acceptance is friction that kills conversion.

**Pass criteria:**

- When a client accepts a quote that is linked to an event in `proposed` status, the event automatically transitions to `accepted`
- OR quotes and proposals are mutually exclusive (if a quote exists, the proposal accept button is hidden)
- The client is NEVER asked to accept the same deal twice through two different UI paths

**Verification:** Read `acceptQuote()` in `lib/quotes/client-actions.ts`. Check if it transitions the linked event. Read `AcceptProposalButton` to understand when it renders. Check if both can be visible simultaneously.

**What to build:** In `acceptQuote()`, after the atomic RPC succeeds, check if `quote.event_id` has an event in `proposed` status. If so, auto-transition it to `accepted` via `transitionEvent()`. This collapses the dual path into a single client action.

---

### PL6: Payment Page Access vs Payment Creation Guard Mismatch

**Question:** Does the payment page UI match what the server will actually allow?

**Current state:** The payment page (`app/(client)/my-events/[id]/pay/page.tsx`) renders for statuses `accepted, paid, confirmed, in_progress, completed`. It shows "Pay Remaining Balance" buttons. But `createPaymentIntent()` only works for `accepted`. The UI promises payment capability that the server rejects.

**Why it matters:** This is a Zero Hallucination violation. The client sees a working payment form, enters their card, clicks pay, and gets an error. The UI lied about what was possible.

**Pass criteria:**

- The set of statuses that render the payment page EXACTLY matches the set that `createPaymentIntent()` accepts
- OR the payment page shows a clear "offline payment only" message for statuses where Stripe is not available
- No client ever fills out a payment form that will be rejected by the server

**Verification:** Compare the status guard in the payment page component vs `createPaymentIntent()` status guard. They must match.

**What to build:** This is solved by PL2 (expanding the server guard). After PL2, both guards will match: `accepted, paid, confirmed, in_progress`.

---

## TIER 2: PIPELINE INTEGRITY (P1)

### PL7: Inquiry Stall Detection

**Question:** If an inquiry sits in `new` status for more than 48 hours with no chef response, does anything happen?

**Current state:** No automated escalation, no reminder email to the chef, no notification to the platform. An inquiry can sit in `new` status forever. The client got an email saying "chefs will respond within 24-48 hours" and never hears back.

**Pass criteria:**

- Inquiries in `new` status for 48+ hours trigger a reminder notification to the chef
- Inquiries in `new` status for 72+ hours trigger an alert to the platform admin
- OR the client gets an honest follow-up: "We haven't heard back from the chef yet. Would you like us to match you with others?"

**Verification:** Search for scheduled jobs, cron tasks, or Inngest events that monitor inquiry age. Check if any exist.

---

### PL8: Quote Expiry Silent Death

**Question:** When a quote expires (passes `valid_until` date), does the chef or client get notified?

**Current state:** The `transitionQuote()` function handles `sent -> expired` transition. But is this triggered automatically on date, or does it require manual action? If no automated check runs, expired quotes sit in `sent` status forever, and the client sees a stale quote they can still try to accept (the pre-flight `valid_until` check in `acceptQuote` catches this, but the UX is an error message, not a graceful expiry notice).

**Pass criteria:**

- Quotes past `valid_until` are automatically marked `expired` (via scheduled job or on-read check)
- Chef receives notification when a quote expires without response
- Client sees "This quote has expired" with a "Request new quote" CTA (not an error message)

**Verification:** Search for any cron, Inngest, or scheduled task that transitions expired quotes. Check if `/my-quotes/[id]` page handles expired state gracefully.

---

### PL9: Event Without Pricing

**Question:** Can a chef propose an event (`draft -> proposed`) without setting `quoted_price_cents`?

**Current state:** The FSM does not validate pricing before `draft -> proposed`. A chef could propose an event with $0 pricing. The client would see a proposal with no price, accept it, and then the payment page would show $0.

**Pass criteria:**

- `transitionEvent('proposed')` validates that `quoted_price_cents > 0`
- OR the event detail/proposal view clearly shows "Pricing not yet set" instead of $0.00
- A client cannot accept a $0 proposal (or if they can, no payment is required and the event skips to `paid`)

**Verification:** Check the `draft -> proposed` transition for pricing validation. Check the client event detail page for how zero pricing is displayed.

---

### PL10: Stripe Connect Onboarding Gate

**Question:** If `isConnectOnboardingRequiredForPayments()` returns true and the chef has not onboarded to Stripe Connect, what does the client see?

**Current state:** `createPaymentIntent()` returns `{ error: "Online payments are temporarily unavailable while your chef finishes payout setup." }` The client sees an error message on the payment page.

**Pass criteria:**

- The error message is clear and actionable for the client
- The chef is notified that their Connect onboarding is blocking payments
- The payment page shows a distinct state (not just an error banner) explaining the situation
- An alternative payment method is offered (offline instructions)

**Verification:** Read the Connect gate logic. Check if the chef gets any notification about incomplete onboarding.

---

### PL11: Client Portal Event Visibility

**Question:** After a client submits an inquiry through /book or /chef/[slug]/inquire, when do they first see something in their portal?

**Current state:** Draft events are filtered out of client views (`not('status', 'eq', 'draft')`). The client must wait until the chef proposes the event (transitions to `proposed`) before anything appears in `/my-events`. The inquiry appears immediately in `/my-inquiries`, but the client may not know to look there.

**Pass criteria:**

- The client portal shows SOMETHING immediately after inquiry submission
- Either the inquiry is prominently shown on the client dashboard
- OR the client receives an email with a direct link to their inquiry status
- The client is never in a state where they submitted something and see an empty portal

**Verification:** Check `/my-inquiries` page for draft/new inquiry visibility. Check the post-submission email for portal links. Check the client dashboard for inquiry widgets.

---

### PL12: Cancellation Financial Cleanup

**Question:** When an event is cancelled after payments have been made, what happens to the money?

**Current state:** The `cancelled` transition handler likely does NOT auto-initiate Stripe refunds. The ledger records the payment, but no reversal entry is created. The financial summary still shows the payment.

**Pass criteria:**

- Cancellation of a paid event creates a refund decision point (not automatic, but surfaced to the chef)
- The chef is prompted: "This event has $X in payments. Would you like to issue a refund?"
- If refund is issued, a reversal ledger entry is created
- If no refund, the chef must document why (cancellation fee, etc.)
- The client sees the cancellation status and payment status clearly

**Verification:** Read the `cancelled` transition handler in `transitions.ts`. Check for refund logic. Check the cancelled event view for financial summary.

---

### PL13: Post-Event Follow-Up Delivery

**Question:** Do post-event follow-up emails actually deliver?

**Current state:** The completion handler dispatches an Inngest job (`chefflow/event.completed`). If Inngest is down, unreachable, or the job fails, the entire 3-step follow-up sequence (thank-you day 1, rebooking day 14, seasonal day 90) is silently lost. No retry, no alert.

**Pass criteria:**

- Follow-up email dispatch has at-least-once delivery guarantee
- Failed dispatches are retried or logged in an observable way
- The `follow_up_sends` table is checked for completeness (sent vs scheduled)
- A chef can see which follow-ups were sent on the event detail page

**Verification:** Search for the Inngest event handler. Check for retry configuration. Check `follow_up_sends` table usage.

---

### PL14: Dinner Circle Auto-Creation Reliability

**Question:** Is a Dinner Circle created for every event that has one, and does it fail gracefully if creation fails?

**Current state:** All three public intake surfaces attempt to create a Dinner Circle as a non-blocking side effect. If the creation fails (DB error, missing data), the event still proceeds but the client/chef lose the coordination tool.

**Pass criteria:**

- Dinner Circle creation failure is logged with enough context to diagnose
- The event is NOT blocked by Circle failure
- If a Circle was not created at intake, it can be created later from the event detail page
- The chef can see whether a Circle exists for each event

**Verification:** Check each intake surface for Circle creation error handling. Check the event detail page for "create Circle" fallback.

---

### PL15: Inquiry Deduplication

**Question:** If the same client submits two inquiries for the same event through different channels (e.g., /book and /chef/[slug]/inquire), does the chef see duplicates?

**Current state:** Intake surfaces deduplicate clients by email (idempotent client creation). But they always create NEW inquiries and NEW events. A client who submits through both surfaces creates two draft events under the same chef.

**Pass criteria:**

- Same email + same date + same chef = deduplication warning or merge
- OR the chef's inquiry view flags potential duplicates
- The chef is never confused by two identical-looking inquiries from the same person

**Verification:** Check each intake surface for duplicate inquiry detection. Search for any dedup logic by email + date combination.

---

### PL16: Webhook Idempotency

**Question:** If Stripe sends the same `payment_intent.succeeded` webhook twice, does the system create a duplicate ledger entry?

**Current state:** The webhook handler checks `ledger_entries.transaction_reference` for the Stripe event ID before inserting. This should prevent duplicates.

**Pass criteria:**

- Duplicate webhook delivery results in exactly one ledger entry
- The second delivery returns 200 (not 409 or 500) to prevent Stripe retries
- No duplicate event transitions occur
- The idempotency check uses the Stripe event ID (not the PaymentIntent ID, since one PI can have multiple events)

**Verification:** Read the webhook handler's dedup logic. Verify it checks `transaction_reference`. Check the HTTP response for duplicate deliveries.

---

## TIER 3: OPERATIONAL QUALITY (P2)

### PL17: Chef Notification Delivery

**Question:** When an inquiry arrives, does the chef always receive a notification, and through what channels?

**Pass criteria:**

- Every new inquiry triggers an email to the chef (verified in all 3 intake surfaces)
- If email delivery fails, the failure is logged
- The chef also sees the inquiry in their portal immediately (real-time via SSE)
- Push notification fires if the chef has push enabled

**Verification:** Check each intake surface for chef notification calls. Verify email send is attempted. Check for SSE broadcast.

---

### PL18: Client Confirmation Email

**Question:** Does every client who submits an inquiry receive a confirmation email?

**Pass criteria:**

- All 3 intake surfaces send a client confirmation email
- The email includes: event date, occasion, chef name (if direct inquiry), "what happens next" steps
- Email send failure does not block the inquiry creation
- The email does not contain "TBD" placeholders visible to the client

**Verification:** Check `sendInquiryReceivedEmail` calls in all intake surfaces. Read the email template.

---

### PL19: Quote PDF Accuracy

**Question:** Does the downloadable quote PDF match the quote data exactly (line items, totals, dates)?

**Pass criteria:**

- PDF total matches the `total_quoted_cents` in the database
- PDF line items match the `quote_line_items` records
- PDF expiry date matches `valid_until`
- No hardcoded sample data in the PDF
- PDF renders correctly for quotes with 0 line items, 1 item, and 20+ items

**Verification:** Generate a test PDF and compare to DB values. Check the PDF generation code for hardcoded values.

---

### PL20: Event FSM Skip Guards

**Question:** Does the `draft -> paid` shortcut (instant-book) bypass any required validation?

**Current state:** `draft -> paid` is allowed for instant-book. This skips `proposed` and `accepted` entirely. The event goes from draft to paid without the client ever seeing a proposal.

**Pass criteria:**

- `draft -> paid` requires `quoted_price_cents > 0`
- `draft -> paid` requires a payment to exist in the ledger (not just a manual status change)
- OR `draft -> paid` is only allowed via `systemTransition: true` (Stripe webhook, not manual chef action)
- The client portal correctly shows the event after this skip (no "proposed" status confusion)

**Verification:** Read the `draft -> paid` transition handler. Check what guards exist. Check if a chef can manually trigger this without a payment.

---

### PL21: Readiness Gate Override Audit

**Question:** When a chef overrides a soft readiness gate (e.g., skipping allergy verification), is the override recorded and visible?

**Pass criteria:**

- Every override is recorded in `event_state_transitions.metadata` with the chef's reason
- The override reason is visible on the event timeline
- Hard blocks (anaphylaxis) cannot be overridden under any circumstances
- There is no code path that silently bypasses readiness gates

**Verification:** Check readiness gate implementation. Check for `override_reason` or equivalent in the metadata. Test the anaphylaxis hard block.

---

### PL22: Offline Payment Ledger Integrity

**Question:** When a chef records an offline payment, does the ledger entry contain enough information for a clean audit trail?

**Pass criteria:**

- Offline payments record: amount, method (cash/venmo/zelle/check), date, recorded_by
- The ledger entry has a unique `transaction_reference` (not null, not empty)
- Two offline payments for the same amount + date are distinguishable
- Offline payments auto-update the event's financial summary

**Verification:** Read `recordOfflinePayment()`. Check the ledger entry fields. Check for unique reference generation.

---

### PL23: Multi-Day Event Series Integrity

**Question:** When an inquiry with `service_mode === 'multi_day'` is converted, does every day in the series get its own event with correct dates?

**Pass criteria:**

- Each day creates a separate event linked to the same inquiry
- Events have sequential dates (no gaps, no duplicates)
- Cancelling one day does not cancel the entire series (unless explicitly requested)
- The chef can manage each day independently
- The client sees the series as related but individually manageable

**Verification:** Read `createSeriesFromBookingRequest()`. Check for date validation. Check client portal series rendering.

---

### PL24: Inquiry Channel Attribution

**Question:** Can the chef see which channel each inquiry came from, and is the attribution accurate?

**Pass criteria:**

- Every inquiry has a `channel` value that maps to the actual source
- Public form -> `website`, Embed -> `embed`, Open booking -> `website` (with `utm_medium: open_booking`), Manual -> user-selected
- The chef's inquiry list shows the channel
- Analytics/reports can aggregate by channel

**Verification:** Check each intake surface for channel assignment. Check the inquiry list UI for channel display.

---

### PL25: Client Review Collection Rate

**Question:** Does the system actively request reviews from clients after completed events, and is the request timed correctly?

**Pass criteria:**

- A review request is sent 3-7 days after event completion
- The request links to a review page that works without authentication (token-based)
- If the client already left a review, no second request is sent
- The chef can see which clients have/haven't reviewed

**Verification:** Check `post-event-triggers.ts` for review request timing. Check the review page for token-based access.

---

### PL26: Rebooking Nudge Effectiveness

**Question:** Does the rebooking nudge (day 14 follow-up) include enough context to be actionable?

**Pass criteria:**

- The email references the completed event (date, occasion, chef name)
- The email includes a direct link to rebook with the same chef
- The email does not go to clients who have already rebooked
- The email does not go to clients who cancelled their event

**Verification:** Read the rebooking nudge template. Check for event context. Check for rebooked/cancelled filtering.

---

### PL27: Open Booking Founder First-Dibs

**Question:** Does the founder first-dibs logic in `/api/book` work correctly, and does it not double-create inquiries?

**Current state:** If the founder is in the matched list, they get an inquiry. If they were excluded by the 10-chef cap but are within radius, they get added as an extra slot. If they are outside radius, they are excluded.

**Pass criteria:**

- Founder receives inquiry only if within matching radius
- Founder does not receive duplicate inquiries (once from match, once from first-dibs)
- The cap check (`!chefsToNotify.some(c => c.id === founderChefId)`) works correctly
- First-dibs failure does not block other chef notifications (it is non-blocking, verified)

**Verification:** Read the founder first-dibs logic in `app/api/book/route.ts` lines 110-122.

---

### PL28: Rate Limit Parity Across Intake

**Question:** Are rate limits consistent across all three public intake surfaces?

**Current state:**

- Public chef inquiry: 8/5min per IP, 4/hr per email
- Embed widget: 10/5min per IP, 3/hr per email
- Open booking: 5/10min per IP, no per-email limit

**Pass criteria:**

- Rate limits are documented and intentional (not accidental discrepancies)
- The tightest surface (open booking: 5/10min) is not so tight it blocks legitimate use
- Per-email limits exist on all surfaces (open booking currently has none)
- Rate limit responses return 429 with clear messaging

**Verification:** Read rate limit configuration in each intake surface. Document discrepancies.

---

## TIER 4: POLISH & COMPLETENESS (P3)

### PL29: Proposal Template Completeness

**Question:** When a chef proposes an event, does the client receive all information needed to make a decision?

**Pass criteria:**

- The proposal/event detail includes: date, time, location, guest count, menu (if attached), total price, deposit amount, what is included, what is not included
- The proposal email or Circle notification links directly to the proposal page
- The client can see the full proposal without creating an account (if they arrived via email link)

---

### PL30: Contract Signing Before Payment

**Question:** If a chef requires a contract, can the client pay before signing?

**Pass criteria:**

- If a contract exists for the event, payment is blocked until the contract is signed
- OR the payment page shows a warning: "Please sign the contract before paying"
- OR contracts and payments are independent (documented design choice)

---

### PL31: Gift Card Payment Integration

**Question:** Can a client apply a gift card to an event payment, and does the ledger handle the split correctly?

**Pass criteria:**

- Gift card balance is applied first, remaining charged to Stripe
- Ledger records both: gift card redemption entry + Stripe payment entry
- If gift card covers the full amount, no Stripe charge is created
- Gift card balance is reduced atomically (no double-spend)

---

### PL32: Tip Collection Post-Event

**Question:** Can a client leave a tip after the event, and does it route correctly?

**Pass criteria:**

- Tip page/form is accessible after event completion
- Tip is recorded as a separate ledger entry (not added to the quoted price)
- Tip routes to chef via Stripe Connect (if onboarded)
- Chef can see tips in their financial summary

---

### PL33: Menu Approval Client Flow

**Question:** When a chef requests menu approval, does the client have a clear path to review and approve?

**Pass criteria:**

- `/my-events/[id]/approve-menu` shows the menu with all dishes, descriptions, dietary info
- Approval/rejection creates a record and notifies the chef
- The client can add notes or requests with their response
- Approved menus are locked from further edits without client re-approval

---

### PL34: Pre-Event Checklist Enforcement

**Question:** Does the pre-event checklist actually block or warn on incomplete items?

**Pass criteria:**

- Unchecked critical items (allergies, location confirmed, timing) generate a warning
- The chef can proceed with overrides (soft gate, not hard block)
- The checklist is visible to both chef and client

---

### PL35: Event Countdown Page Utility

**Question:** Does `/my-events/[id]/countdown` provide useful information or is it decorative?

**Pass criteria:**

- Shows days/hours until event
- Shows key details (time, location, chef name, menu)
- Shows checklist status (what is confirmed, what is pending)
- If event is past, redirects to event detail (not a stale countdown)

---

### PL36: Client Spending History Accuracy

**Question:** Does `/my-spending` show accurate payment history derived from ledger entries?

**Pass criteria:**

- Total spending matches sum of ledger payment entries
- Each payment shows: date, amount, event, method (Stripe/offline/gift card)
- Refunds are shown as negative entries
- No hardcoded or demo data

---

### PL37: Loyalty Points Accuracy

**Question:** Are loyalty points awarded correctly and consistently?

**Pass criteria:**

- Points are awarded only for completed events (not cancelled)
- Points match the configured multiplier in loyalty settings
- Double-awarding is prevented (idempotency on event_id)
- Client can see their point balance and history

---

### PL38: Automation Engine Reliability

**Question:** Does the automation engine (`runAutomationRules`) fire reliably after intake, and do failed automations not block the inquiry?

**Pass criteria:**

- Automation is non-blocking (inquiry succeeds even if automation fails)
- Automation failures are logged
- Automations do not run twice for the same inquiry

---

### PL39: Remy Lead Scoring Signal Quality

**Question:** Does Remy's lead scoring produce actionable signals, or is it noise?

**Pass criteria:**

- Lead scores correlate with conversion outcomes (high-scored leads convert more)
- Scoring uses real signals (guest count, budget tier, event date proximity, repeat client)
- A score of 0 or null does not mean "bad lead" (it means "not scored")
- The chef can see the score and understand what it means

---

### PL40: Pipeline Funnel Metrics Visibility

**Question:** Can the chef see their conversion funnel: inquiries -> proposals -> accepted -> paid -> completed?

**Pass criteria:**

- Dashboard or analytics page shows funnel counts
- Funnel data is derived from real event status counts (not hardcoded)
- Drop-off points are visible (e.g., "5 proposals sent, 2 accepted, 1 paid")
- Time-based filtering exists (this week, this month, this quarter)

---

## Execution Protocol

### Phase 1: Fix Revenue Killers (P0)

Build fixes for PL1, PL2, PL3 first. These directly affect money flow.

- PL1: Change quote acceptance redirect target
- PL2: Expand `createPaymentIntent` status guard
- PL3: Insert into `directory_waitlist` on zero-match booking
- PL4: Add soft readiness gate for placeholder fields
- PL5: Auto-transition event on quote acceptance
- PL6: Solved by PL2

### Phase 2: Pipeline Integrity (P1)

Investigate and build: PL7 (inquiry stall alerts), PL8 (quote expiry automation), PL13 (follow-up delivery guarantee).

### Phase 3: Operational Quality (P2)

Audit and fix: PL15 (dedup), PL17 (notification delivery), PL22 (offline payment integrity).

### Phase 4: Regression Protection

After fixes, add structural tests to the system-integrity-question-set.md.
Each fix references the PL number: `fix(PL2): allow balance payments after deposit`
