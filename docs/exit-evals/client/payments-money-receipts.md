# Exit Eval: Client / PAYMENTS, MONEY & RECEIPTS

> Wave 2 | 8 scenarios | Evaluator: Claude (Solo mode)
> Date: 2026-05-25
> Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #35: Check credit card or bank balance before paying

**Original classification:** Permanent exit
**Reclassified to:** Permanent

**Why client leaves:** The client needs to verify they have sufficient funds or credit available before committing to a payment. This is a liquidity check that lives entirely within the banking relationship. The decision is: "Can I afford to pay this right now, or do I need to wait/use a different card?"

**Context ChefFlow has:**

- Exact amount due (quoted price, deposit, outstanding balance)
- Payment due date/deadline
- Payment plan options (installment schedule)
- Event date proximity (urgency signal)

**Data source?** No. Bank balance is private, real-time, authenticated data behind each client's banking relationship. No public API exists that ChefFlow could ethically or practically consume.

**Client-collaborative angle:** None. Financial capacity is private. No Circle member can or should provide this information.

**Physical reality:** This is a phone/app moment. Client checks bank app, then returns to ChefFlow payment page. Screen-based, private, quick.

**Compounding:** Low. Each payment is a one-off balance check. No historical pattern helps future checks.

**Solution design:**

- Show exact amount due prominently on payment page (already built: `app/(client)/my-events/[id]/pay/page.tsx`)
- Show payment deadline clearly so client can plan ahead
- Offer payment plan calculator so client can see smaller installments (already built: `app/(client)/my-events/[id]/payment-plan/page.tsx`)
- Send advance payment reminders (3 days, 1 day before due) so client checks balance proactively
- Preserve payment page state so client can leave and return without restarting

**Where it appears:**

- `/my-events/[id]/pay` (payment page with amount display)
- `/my-events/[id]/payment-plan` (installment options)
- Notification system (advance reminders)

**What remains as permanent exit:**
The actual balance check in the bank app. ChefFlow will never see bank balances. This is irreducible.

**Priority:** High frequency (every payment) x Zero effort (nothing to build beyond what exists) = Low priority (already handled well)
**Spec needed?** No

---

## Scenario #36: Pay by Venmo, Zelle, PayPal, or check

**Original classification:** Bridgeable with offline payment logging
**Reclassified to:** Partially Reducible

**Why client leaves:** The client or chef prefers informal payment rails. This happens because: (1) chef doesn't have Stripe Connect set up, (2) client wants to avoid processing fees, (3) relationship is casual/repeat and both prefer direct transfer, or (4) corporate clients paying by check.

**Context ChefFlow has:**

- Amount owed (full quote, deposit, balance)
- Chef's payment preferences/instructions (could store Venmo handle, Zelle email, PayPal address)
- Payment history and outstanding balance
- Event association for the payment

**Data source?** No. Venmo/Zelle/PayPal are peer-to-peer payment platforms with no webhook or confirmation API accessible to ChefFlow. The payment happens externally.

**Client-collaborative angle:** Medium. The client confirms "I sent $X via Venmo on [date]." This confirmation can flow back into ChefFlow via a "Mark as Sent" button or the chef records the offline payment.

**Physical reality:** Phone-based. Client opens Venmo/Zelle, sends money, then ideally confirms in ChefFlow. For checks: physical writing and mailing.

**Compounding:** Medium. If ChefFlow stores chef's preferred payment handles, repeat clients never have to ask "where do I send it?"

**Solution design:**

- Display chef's offline payment instructions on the payment page (Venmo handle, Zelle email, etc.) -- requires `chef_payment_instructions` field in settings
- "I've Sent Payment" client-side confirmation button that notifies the chef
- Chef records offline payment via existing `recordOfflinePayment()` in `lib/events/offline-payment-actions.ts` (already built, supports cash/Venmo/Zelle/check methods)
- Auto-transition event status when chef confirms receipt (already built in offline-payment-actions)
- Show payment method preference in quote/proposal so client knows upfront

**Where it appears:**

- `/my-events/[id]/pay` (show offline payment instructions alongside Stripe)
- Chef settings for payment instructions (`app/(chef)/settings/payments/page.tsx`)
- Event billing page (`app/(chef)/events/[id]/billing/page.tsx`)

**What remains as permanent exit:**
The actual Venmo/Zelle/PayPal transaction itself. Client must open the external app to move money. ChefFlow smooths everything around it.

**Priority:** High frequency (many chefs prefer informal payment) x Low effort (offline payment recording exists, just need client-facing instructions display) = High priority
**Spec needed?** No (incremental improvement to existing payment page)

---

## Scenario #37: Complete secure card checkout

**Original classification:** Reducible only at UX level; secure processor handoff is expected
**Reclassified to:** Reducible

**Why client leaves:** Historically, "leaving" meant redirecting to a hosted Stripe Checkout page. The client must enter card details in a PCI-compliant form. The question is whether this feels like leaving ChefFlow or staying inside it.

**Context ChefFlow has:**

- Full event details, amount, deposit structure
- Client identity (pre-filled email)
- Payment history (knows if this is deposit vs. final balance)
- Stripe PaymentIntent already created server-side

**Data source?** Yes, but inverted. Stripe Elements is an embedded widget that brings the payment processor INTO ChefFlow. The card entry form renders inside the app via `@stripe/react-stripe-js`.

**Client-collaborative angle:** None. Payment is between client and their card issuer, mediated by Stripe.

**Physical reality:** Screen-based. Client types card number or uses browser autofill. Quick, focused interaction.

**Compounding:** Medium. Stripe saves payment methods for returning customers. Second payment is one-click.

**Solution design:**

- Stripe Elements embedded directly in ChefFlow (ALREADY BUILT: `components/stripe/payment-form.tsx` uses `PaymentElement` from `@stripe/react-stripe-js`)
- Gift card/voucher redemption before Stripe (ALREADY BUILT: `PaymentPageClient` in `app/(client)/my-events/[id]/pay/payment-page-client.tsx`)
- Success redirect stays in-app (`/my-events/${eventId}?payment=success`)
- Cancellation policy shown alongside payment (ALREADY BUILT: `CancellationPolicyDisplay` component on payment page)
- Amount breakdown with deposit/balance logic (ALREADY BUILT)

**Where it appears:**

- `/my-events/[id]/pay` (full Stripe Elements integration)
- `/client/[token]/pay/[eventId]` (token-based payment for non-logged-in clients)

**What remains as permanent exit:**
Nothing meaningful. The card entry form is embedded. 3D Secure bank verification may briefly open a bank popup, but that's standard and unavoidable.

**Priority:** Already built x Already working = No action needed
**Spec needed?** No

---

## Scenario #38: Download receipts for reimbursement

**Original classification:** Bridgeable with clean receipt export
**Reclassified to:** Reducible

**Why client leaves:** The client paid for a private chef event through personal funds and needs to submit a receipt to their employer, accountant, or expense management system (Expensify, Concur, etc.) for reimbursement. They need a clean, professional PDF with specific fields (date, amount, vendor name, service description).

**Context ChefFlow has:**

- Full event details (date, occasion, guest count, location)
- Chef business name, contact info, tax ID
- Exact payment amounts (deposit, balance, tip, total)
- Payment dates and methods
- Invoice number (auto-generated: `INV-YYYY-NNN` format via `generateInvoiceNumber()`)
- Sales tax breakdown (state, county, city via API Ninjas)
- Client name and email
- Corporate billing fields (company, attention, PO number)

**Data source?** No external source needed. ChefFlow IS the source of truth for this transaction.

**Client-collaborative angle:** Low. Client may need to provide PO number or corporate billing address (already supported in `InvoiceData.billTo` field).

**Physical reality:** PDF download, then upload to employer system or forward via email. Print for paper filing.

**Compounding:** High for corporate clients. Once billing details are set (company name, PO format), every future event auto-populates. The receipt template serves forever.

**Solution design:**

- Invoice PDF download (ALREADY BUILT: `app/api/documents/invoice-pdf/[eventId]/route.ts`)
- Receipt PDF download (ALREADY BUILT: `app/api/documents/receipt/[eventId]/route.ts`)
- Client invoice view page (ALREADY BUILT: `app/(client)/my-events/[id]/invoice/page.tsx` with "Download PDF" button)
- Client documents hub (ALREADY BUILT: `app/(client)/my-documents/page.tsx` -- contracts, invoices, proposals)
- Client receipts page (ALREADY BUILT: `app/(client)/my-receipts/page.tsx` -- grocery/supply receipts)
- Tax summary page with print support (ALREADY BUILT: `app/(client)/my-spending/tax-summary/page.tsx` with `PrintScript` component)
- Corporate billing fields in invoice (ALREADY BUILT: `InvoiceData.billTo` with company, attention, PO number)

**Where it appears:**

- `/my-events/[id]/invoice` (per-event invoice with PDF download)
- `/my-documents` (all documents hub)
- `/my-receipts` (grocery receipts per event)
- `/my-spending/tax-summary` (annual summary with print/PDF)
- `/api/documents/receipt/[eventId]` (direct PDF endpoint)
- `/api/documents/invoice-pdf/[eventId]` (direct PDF endpoint)

**What remains as permanent exit:**
Uploading the PDF to the employer's expense system (Expensify, Concur, SAP). ChefFlow cannot submit to arbitrary corporate expense platforms.

**Priority:** High frequency (corporate clients always need this) x Already built = No action needed
**Spec needed?** No

---

## Scenario #39: Split payment with guests

**Original classification:** Reducible with split-pay links and contribution tracking
**Reclassified to:** Reducible

**Why client leaves:** The host organized a dinner for a group and wants guests to share the cost. Today this means awkward Venmo/Cash App requests, manual math, and chasing people. The decision: "How much does each person owe, and how do I collect from them without being awkward?"

**Context ChefFlow has:**

- Total event cost
- Guest list (names, possibly emails/phones from RSVP)
- Guest count
- Event details for context in the payment request
- Host payment status
- Split billing configuration (already stored on events as `split_billing` JSON)

**Data source?** No external source. ChefFlow owns the event cost and guest list.

**Client-collaborative angle:** High. Guests are the ones who pay. The split link goes TO guests, who can see what they owe and (eventually) pay their share. This is fundamentally collaborative.

**Physical reality:** Link-based. Host shares a link (text, email). Guests open on phone, see their share, pay via their preferred method.

**Compounding:** Medium. Group dining patterns repeat. If the same friend group splits often, saved preferences help.

**Solution design:**

- Split billing configuration (ALREADY BUILT: `lib/payments/payment-splitting.ts` with `updateEventPaymentSplits()`)
- Public split breakdown page via token (ALREADY BUILT: `app/(public)/split/[token]/page.tsx` with `SplitBreakdownView`)
- Client-facing split view (ALREADY BUILT: `app/(client)/my-events/[id]/split/page.tsx`)
- Split share token generation (ALREADY BUILT: `lib/payments/split-share-actions.ts` with `generateSplitShareToken()` and `generateClientSplitShareToken()`)
- Chef-side split billing management (ALREADY BUILT: `app/(chef)/payments/splitting/page.tsx` and `app/(chef)/events/[id]/split-billing/page.tsx`)
- Per-person amount calculation with metadata (event name, date, chef name shown on public page)

**Where it appears:**

- `/my-events/[id]/split` (client manages splits)
- `/split/[token]` (public page guests see with breakdown)
- `/payments/splitting` (chef-side management)
- `/events/[id]/split-billing` (chef configures per-event)

**What remains as permanent exit:**
The actual money transfer between guests and host still happens via Venmo/Cash App/Zelle. ChefFlow shows what's owed and tracks who paid, but moving the money between friends remains external.

**Priority:** Medium frequency (group events) x Already built = Low priority (polish only)
**Spec needed?** No

---

## Scenario #40: Dispute or reverse a charge

**Original classification:** Permanent exit
**Reclassified to:** Permanent

**Why client leaves:** The client believes they were overcharged, received poor service, or needs to contest a transaction. The dispute mechanism lives in the payment rails (bank/credit card issuer for chargebacks, or Stripe's dispute flow). This is adversarial by nature and involves the client's financial institution.

**Context ChefFlow has:**

- Full payment history and amounts
- Event details and service rendered
- Contract terms and cancellation policy
- Communication history
- Chef's dispute tracking (ALREADY BUILT: `lib/finance/dispute-actions.ts` with status tracking)
- Evidence storage (notes and URLs on dispute record)

**Data source?** No. The dispute resolution process lives with the card issuer or Stripe. ChefFlow cannot adjudicate financial disputes.

**Client-collaborative angle:** Inverse collaboration. The chef needs to respond to the dispute with evidence. ChefFlow helps the chef side, not the client side (the client's bank helps the client).

**Physical reality:** Phone/web. Client contacts bank via app or phone. Formal process.

**Compounding:** Low. Disputes are (hopefully) rare one-off events.

**Solution design:**

- Chef-side dispute tracker (ALREADY BUILT: `app/(chef)/finance/disputes/page.tsx` with `DisputeTracker` component)
- Dispute data model with status FSM (ALREADY BUILT: `PaymentDispute` type with open/under_review/won/lost states)
- Evidence attachment (ALREADY BUILT: `evidenceNotes` and `evidenceUrls` fields)
- Stripe dispute ID linking (ALREADY BUILT: `stripeDisputeId` field)
- Clear refund/cancellation policy shown pre-payment (ALREADY BUILT: `CancellationPolicyDisplay` on payment page)
- Refund initiation by chef (ALREADY BUILT: `lib/stripe/refund.ts`, `lib/cancellation/refund-actions.ts`, `app/(chef)/finance/payments/refunds/page.tsx`)

**Where it appears:**

- `/finance/disputes` (chef tracks disputes)
- `/finance/payments/refunds` (chef processes refunds)
- Client sees cancellation/refund policy on payment page before paying

**What remains as permanent exit:**
The actual chargeback/dispute filing with the bank. This is an adversarial legal process between client and their card issuer. ChefFlow cannot and should not mediate this. The chef can only respond with evidence through Stripe's dispute response system.

**Priority:** Low frequency (rare if service is good) x Already built (chef-side tracking) = Very low priority
**Spec needed?** No

---

## Scenario #41: Track spending for taxes or business hosting

**Original classification:** Bridgeable with CSV/PDF exports and category labels
**Reclassified to:** Reducible

**Why client leaves:** The client uses private chef services for business entertainment (client dinners, team events, investor hosting) and needs to categorize and export this spending for tax deductions or expense reports. They leave to enter data into QuickBooks, Expensify, or a spreadsheet.

**Context ChefFlow has:**

- Complete spending history per event (ALREADY BUILT: `lib/clients/spending-actions.ts`)
- Annual aggregation with monthly breakdown (ALREADY BUILT: `lib/finance/client-tax-summary-actions.ts`)
- Event categorization (occasion field: "business dinner", "team event", etc.)
- Per-event totals, guest counts, dates
- Invoice PDFs with full detail
- Tax summary page with print support

**Data source?** No external source needed. ChefFlow IS the spending record for private chef services.

**Client-collaborative angle:** None. This is the client's own financial tracking.

**Physical reality:** Print for paper records. PDF for digital filing. CSV for import into accounting software. The tax summary page already has print styling (ALREADY BUILT: print CSS classes throughout `app/(client)/my-spending/tax-summary/page.tsx`).

**Compounding:** High. Every event adds to the spending history. Year-over-year comparison becomes more valuable. A client who has used ChefFlow for 3 years has a complete entertainment expense record.

**Solution design:**

- Spending dashboard (ALREADY BUILT: `app/(client)/my-spending/page.tsx` with lifetime, YTD, average stats)
- Tax summary by year (ALREADY BUILT: `app/(client)/my-spending/tax-summary/page.tsx` with monthly breakdown)
- Print/Save as PDF button (ALREADY BUILT: `PrintScript` component on tax summary page)
- Per-event invoice PDFs (ALREADY BUILT: downloadable from `/my-events/[id]/invoice`)
- Could add: CSV export of spending history for QuickBooks import
- Could add: Category/tag field on events (business vs personal) for filtering

**Where it appears:**

- `/my-spending` (aggregate dashboard)
- `/my-spending/tax-summary` (year-end summary with print)
- `/my-events/[id]/invoice` (per-event PDF)
- `/my-documents` (all invoices in one place)

**What remains as permanent exit:**
Importing data INTO the external accounting system (QuickBooks, Expensify). ChefFlow can produce the export, but the client still uploads it to their tool. A CSV export would minimize manual re-entry.

**Priority:** Medium frequency (business clients, annually) x Low effort (mostly built, needs CSV export) = Medium priority
**Spec needed?** No (CSV export is a small addition to existing tax summary actions)

---

## Scenario #42: Tip after the event

**Original classification:** Reducible with post-event tip links and reminders
**Reclassified to:** Reducible

**Why client leaves:** The event is over, the client is delighted, and they want to tip the chef. Today this means fumbling for cash, opening Venmo, or forgetting entirely. The moment of gratitude fades quickly. The decision: "How do I express appreciation easily right now?"

**Context ChefFlow has:**

- Event completion status
- Client contact info (email, phone)
- Chef identity and Stripe account
- Event total (for suggested tip percentages)
- Tip request system with token-based links (ALREADY BUILT)
- Tip recording with ledger integration (ALREADY BUILT)

**Data source?** No external source. The tip payment can flow through Stripe (same as event payment) or be recorded as offline.

**Client-collaborative angle:** Low. Tipping is between client and chef.

**Physical reality:** Post-event moment. Client is relaxed, happy, possibly on phone. Should be one-tap easy. The Uber-style tip prompt (link via email/text after event) is perfect for this moment.

**Compounding:** Medium. Tip history informs chef's understanding of client satisfaction. Patterns emerge over time.

**Solution design:**

- Uber-style tip request system (ALREADY BUILT: `lib/finance/tip-actions.ts` with `createTipRequest()`, token generation, status tracking)
- Public tip page requiring no login (ALREADY BUILT: `app/(public)/tip/[token]/page.tsx` with `TipForm`)
- Suggested tip amounts based on event total (shown on tip form)
- Chef sends tip link post-event (manual or automated via Remy routine)
- Tip recorded to ledger (ALREADY BUILT: `appendLedgerEntryForChef()` on tip submission)
- Completion states (pending/completed/declined with appropriate UI for each)
- Post-tip cross-link to book again (ALREADY BUILT: `PostActionFooter` with "Book Again" link)
- Rate limiting on public tip page (ALREADY BUILT: `checkRateLimit`)

**Where it appears:**

- `/tip/[token]` (public, no-auth tip page)
- Chef event close-out flow (generates and sends tip link)
- Ledger entries (tip appears in financial summary)

**What remains as permanent exit:**
If client insists on cash or Venmo tip, that happens externally. But the token-based tip link captures the majority case where a digital prompt works.

**Priority:** High frequency (every completed event) x Already built = No action needed
**Spec needed?** No

---

## Batch Summary

| #   | Title                                           | Reclassified To     | Spec Needed? |
| --- | ----------------------------------------------- | ------------------- | ------------ |
| 35  | Check credit card or bank balance before paying | Permanent           | No           |
| 36  | Pay by Venmo, Zelle, PayPal, or check           | Partially Reducible | No           |
| 37  | Complete secure card checkout                   | Reducible           | No           |
| 38  | Download receipts for reimbursement             | Reducible           | No           |
| 39  | Split payment with guests                       | Reducible           | No           |
| 40  | Dispute or reverse a charge                     | Permanent           | No           |
| 41  | Track spending for taxes or business hosting    | Reducible           | No           |
| 42  | Tip after the event                             | Reducible           | No           |

---

## Key Finding

This category is **exceptionally well-built**. 6 of 8 scenarios are already Reducible with working code. The payment infrastructure in ChefFlow covers:

- Embedded Stripe checkout (no redirect)
- Offline payment recording (Venmo/Zelle/cash/check)
- Split billing with public token pages
- Uber-style tip links
- Invoice/receipt PDF generation
- Tax summary with print support
- Dispute tracking (chef-side)
- Payment plan calculator

**Remaining gaps (minor):**

1. Client-facing display of chef's offline payment instructions (Venmo handle, Zelle email) on the payment page
2. CSV export from spending/tax summary for accounting software import
3. "I've Sent Payment" client confirmation button for offline payments

None of these gaps warrant a standalone spec.
