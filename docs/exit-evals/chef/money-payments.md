# Exit Eval: Chef / MONEY & PAYMENTS

> **Batch:** Wave 1 | 5 scenarios (#38-#42)
> **Mode:** Solo (NEEDS-DEVELOPER-REVIEW on all)
> **Date:** 2026-05-25
> **Evaluator:** Claude (exit-eval skill, solo batch mode)

---

## Scenario #38: Check if a client payment cleared

**Original classification:** Partially Reducible (Stripe integration shows payment status in-app)
**Reclassified to:** Partially Reducible
**Status:** NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The chef needs to confirm that money actually arrived in their account, not just that Stripe says "succeeded." Three distinct sub-needs: (1) Did the Stripe payment intent succeed? (2) Did Stripe actually pay out to my bank? (3) For informal payments (Venmo/Zelle/cash), did the money show up? The operational question is "can I buy groceries for this event, or am I fronting the cost?"

**Context ChefFlow has:**

- Full event financial summary (`event_financial_summary` view): quoted price, deposit, total paid, outstanding balance, payment status
- Stripe webhook handler processes `payment_intent.succeeded`, `payout.paid`, `payout.failed` events
- Ledger entries with `transaction_reference` tied to Stripe event IDs
- Payment method recorded per ledger entry (cash, venmo, paypal, zelle, card, check)
- `getEventPaymentStatus()` returns `paymentStatus`, `isDepositPaid`, `isFullyPaid`, `totalPaidCents`, `outstandingBalanceCents`
- `getEventsWithOutstandingBalances()` surfaces all events with unpaid amounts
- Stripe payout webhooks (`payout.paid`, `payout.failed`) are handled in the webhook route
- Manual payment import supports Venmo/Zelle/cash/check with `PaymentImportInput`

**Data source?** Yes. Stripe API for card payment status and payout tracking. Bank feed (Plaid/Stripe) for deposit verification. Venmo/Zelle have no reliable API for incoming payment verification.

**Client-collaborative angle:** Minimal. The client knows they sent the payment, but the chef's question is about arrival, not sending. For informal methods, the Circle could prompt "Payment sent? Confirm amount and method" which would pre-populate the manual payment log.

**Physical reality:** Screen-based. Chef checks this between events or during planning, not mid-cook. Quick glance: a single status badge per event is ideal ("Paid," "Deposit Only," "Awaiting Payment," "Payout Pending").

**Compounding:** Medium. Payment patterns per client compound (who pays on time, who needs chasing), but the individual "did it clear?" check is transactional. The payment-reminder system already captures the pattern data.

**Solution design:**

- Surface Stripe payout status alongside payment status on the event detail finance tab. Currently ChefFlow knows "Stripe payment succeeded" but the chef wants "money is in my bank." The `payout.paid` webhook data needs to surface as a visible state on the event.
- Add a "Payment Cleared" confirmation step for manual payments (Venmo/Zelle/cash). Currently `PaymentImportInput` records the payment but doesn't distinguish "I recorded this" from "I verified the deposit."
- Dashboard widget: "Payments Awaiting Clearance" showing Stripe payouts in transit and unconfirmed manual payments.
- Optional: Circle prompt for informal payments asking client to confirm amount sent, which auto-populates the manual payment log for chef to confirm.

**Where it appears:**

- Event detail page, finance/payment tab (primary)
- `/finance/payments` hub (aggregate view)
- `/finance/payouts/reconciliation` page (already exists, compares invoiced vs. recorded)
- Dashboard widget (new: "Pending Clearance")
- Dinner Circle (for informal payment confirmation)

**What remains as permanent exit:**

- Checking personal bank app to verify the actual deposit posted to the checking account. ChefFlow cannot access the chef's bank balance in real-time without Plaid integration, and even with Plaid there is latency. The "is the money actually spendable?" question will always require a bank app check for edge cases.
- Venmo/Zelle apps to verify informal payments when there is a dispute about whether payment was sent.

**Priority:** High frequency (every paid event) x Low effort (data already exists, needs surfacing) = HIGH
**Spec needed?** No. The data plumbing exists. This is a UI surfacing task: show payout status from existing webhook data, add "confirmed" toggle on manual payments.

---

## Scenario #39: Send a payment request via Venmo/Zelle

**Original classification:** Permanent exit (could log informal payments)
**Reclassified to:** Bridgeable
**Status:** NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The client said "just Venmo me" or prefers not to pay through Stripe. The chef opens Venmo/Zelle, finds the client, enters the amount, adds a note, and sends the request. The operational reason is collecting money through the client's preferred channel, not ChefFlow's preferred channel.

**Context ChefFlow has:**

- Exact amount owed per event (`event_financial_summary.outstanding_balance_cents`)
- Client contact info (email, phone) which maps to Venmo/Zelle accounts
- Event occasion and date for the payment note/memo
- Payment plan schedule with due dates (`payment-plan-actions.ts`)
- `PaymentImportInput` already supports `venmo`, `zelle`, `paypal` as payment methods
- Invoice generation with line items

**Data source?** No. Venmo and Zelle do not offer merchant-initiated payment request APIs for individual users. These are consumer P2P platforms. The chef must use the app.

**Client-collaborative angle:** Strong. The Circle could display the amount owed and a suggested payment note ("Dinner for Smith family, June 14 - $850") along with the chef's Venmo handle or Zelle email. The client self-serves the payment. Chef never sends a request; the Circle tells the client what to pay and where to send it.

**Physical reality:** Screen (phone app). Usually happens after the event, at home, not in the kitchen. Copy-pasteable amounts and memos are helpful.

**Compounding:** Medium. Client payment preferences compound (always Venmo, always Zelle, always card). Recording the preferred method means ChefFlow can auto-generate the right payment instructions next time.

**Solution design:**

- Store client preferred payment method on client profile (already partially supported via `service_defaults`). Use this to auto-select the payment channel.
- "Payment Instructions" block in the client portal/Circle: displays amount, memo, and chef's payment handles (Venmo username, Zelle email). Client can pay without the chef sending a manual request.
- Chef settings: store Venmo handle, Zelle email, PayPal email, CashApp tag under payment configuration.
- One-click "Copy Payment Memo" button on event finance tab: copies "Dinner for [Client], [Date] - $[Amount]" to clipboard. Chef pastes into Venmo/Zelle.
- After sending request externally, one-click "Mark as Requested" on the event to track that a payment request was sent, with timestamp.
- When payment arrives, use existing `PaymentImportInput` to record it with the correct method.

**Where it appears:**

- Event detail finance tab: "Request Payment" section with method-specific instructions
- Client portal / Dinner Circle: payment instructions card
- Chef settings / integrations: payment handles configuration
- Invoice PDF/email: include informal payment option alongside Stripe link

**What remains as permanent exit:**

- Opening Venmo/Zelle app to actually send a payment request or verify receipt. ChefFlow cannot initiate P2P payment requests. The bridging reduces this to a 10-second interaction (open app, request is pre-formatted, paste memo, send).

**Priority:** High frequency (many clients prefer informal payment) x Low effort (mostly UI/config) = HIGH
**Spec needed?** No. Individual pieces are small. Client payment preference on profile, chef payment handles in settings, Circle payment instructions block, clipboard copy for memo.

---

## Scenario #40: Reconcile bank statements

**Original classification:** Permanent exit (could export reconciliation report)
**Reclassified to:** Partially Reducible
**Status:** NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** Monthly or quarterly, the chef (or their bookkeeper) opens the bank website, downloads the statement, and matches each deposit to an invoice/event. The operational question: "Does my book of record (ChefFlow ledger) match my bank's record?" This catches missing payments, double-charges, unrecorded expenses, and bank fees.

**Context ChefFlow has:**

- Complete immutable ledger (`ledger_entries`) with all payment, deposit, refund, expense entries
- `event_financial_summary` view mapping payments to events
- `/finance/payouts/reconciliation` page already compares invoiced amounts vs. recorded payments per event
- Bank feed infrastructure (`bank-feed-actions.ts`): `connectBankAccount`, `getBankTransactions`, `confirmTransaction`, `ignoreTransaction`, `addManualTransaction`, `getReconciliationSummary`
- Bank connections via Plaid or Stripe with transaction categorization
- Expense tracking with 12 categories, receipt photos, tax deductibility flags
- CPA export (`cpa-export-actions.ts`): Schedule C summary, accounting detail rows, CSV/ZIP export
- CSV export from ledger entries

**Data source?** Yes, partially. Plaid API provides bank transaction data. Stripe provides payout details. But many chefs bank at institutions Plaid doesn't cover well, or use multiple accounts. The bank's own statement PDF remains the authoritative source for the bank's side.

**Client-collaborative angle:** None. This is purely chef-side bookkeeping.

**Physical reality:** Desktop/laptop task. Chef sits down with bank statement (paper or PDF) and compares line by line. This is never a kitchen or mobile task.

**Compounding:** High. Reconciliation patterns compound: recurring clients always pay the same way, typical bank fees are predictable, expense categories stabilize. A well-maintained ledger makes each subsequent month faster.

**Solution design:**

- Reconciliation report generator: for a given date range, produce a side-by-side view of "ChefFlow ledger entries" vs. "Bank transactions" (from bank feed). Highlight matched, unmatched on ChefFlow side (recorded but not in bank), and unmatched on bank side (in bank but not recorded).
- Bank statement import: upload a bank statement CSV (most banks export this). Parse columns, auto-match against ledger entries by amount + date proximity. Flag discrepancies.
- The existing `bank-feed-actions.ts` infrastructure handles live bank connections. Extend the reconciliation page (`/finance/payouts/reconciliation`) to include bank-side data, not just invoice-vs-payment comparison.
- Reconciliation checklist: mark each month as "reconciled" with a timestamp. Surface months that haven't been reconciled as a reminder.
- Export reconciliation report as PDF for bookkeeper/CPA.

**Where it appears:**

- `/finance/payouts/reconciliation` (enhance existing page)
- `/finance/bank-feed` (enhance with reconciliation workflow)
- `/finance/reporting/` (new reconciliation report)
- Tax center (link to reconciliation status)

**What remains as permanent exit:**

- Logging into the bank website/app to download the statement or verify specific transactions. Even with Plaid, some chefs will want to eyeball the bank's own record.
- Communicating with the bank about discrepancies (fees, holds, errors).
- Handing the reconciliation to a bookkeeper or CPA who uses their own tools (QuickBooks, etc.).

**Priority:** Medium frequency (monthly) x Medium effort (bank feed infra exists, needs reconciliation matching logic) = MEDIUM
**Spec needed?** No. The bank-feed and reconciliation infrastructure already exist. This is an enhancement: connect bank transactions to the existing reconciliation page and add CSV import as a fallback for banks without Plaid support.

---

## Scenario #41: Handle taxes / quarterly estimates

**Original classification:** Permanent exit (could export financial summaries for tax prep)
**Reclassified to:** Partially Reducible
**Status:** NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The chef is a sole proprietor (Schedule C). Four times a year, they calculate estimated tax, then go to IRS Direct Pay or their state's tax portal to submit payment. At year-end, they gather all financial data for their CPA or TurboTax. The operational questions: "How much do I owe this quarter?" and "Is all my financial data organized for filing?"

**Context ChefFlow has:**

- `tax-estimate-actions.ts`: quarterly estimate tracker with SE tax, federal, state breakdowns, due dates, payment recording
- `tax-prep-actions.ts`: full Schedule C breakdown (expense categories mapped to IRS lines), quarterly estimate summary, contractor count, 1099 tracking
- `tax-prep-constants.ts`: Schedule C line definitions
- `cpa-export-actions.ts`: CPA-ready export with verified CSV + ZIP, Schedule C summary, accounting detail rows
- `chef-tax-config-actions.ts`: chef tax configuration (filing status, state, etc.)
- Tax center UI at `/finance/tax/` with quarterly estimates, 1099-NEC, home office, retirement, depreciation, year-end pages
- `1099-actions.ts`: 1099-NEC generation for contractors
- `sales-tax-actions.ts`: state + local sales tax rates, filing frequency, remittance tracking
- Expense categorization with tax deductibility flags
- Mileage tracking per event with IRS rate calculations
- Revenue, P&L, and tax summary reports

**Data source?** Partially. IRS and state tax portals are the actual filing/payment destinations. Tax software (TurboTax, etc.) is the calculation engine for complex situations. ChefFlow provides the data; the filing happens externally.

**Client-collaborative angle:** None. Taxes are entirely chef-side.

**Physical reality:** Desktop task. Paper receipts may need scanning (receipt OCR exists). Chef may print the CPA export to hand to their accountant. Physical mail for tax documents (1099s received from platforms like Take a Chef).

**Compounding:** High. Tax categories, deduction patterns, quarterly estimate accuracy all improve year over year. First year is painful; subsequent years are largely automated if ChefFlow's data is complete.

**Solution design:**

- ChefFlow already has the majority of this built. The tax center (`/finance/tax/`) with quarterly estimates, Schedule C mapping, CPA export, 1099 tracking, home office, depreciation, and retirement covers the "organize data" half completely.
- Remaining gap: "How much do I owe?" calculator. Use revenue + expenses + mileage + deductions to estimate quarterly SE tax and income tax. The `tax-estimate-actions.ts` stores estimates but the calculation could be more automated (pull actual YTD numbers instead of requiring manual entry of `estimatedIncomeCents`).
- IRS Direct Pay link: exit link with pre-populated context (quarter, estimated amount) so the chef knows exactly what to pay when they land on the IRS site.
- State tax portal link: same pattern, with the state amount.
- Tax calendar: surface due dates (April 15, June 15, September 15, January 15) with countdown and "Estimated amount: $X" based on YTD actuals.
- Year-end checklist: guided workflow ensuring all expenses categorized, mileage logged, 1099s generated, CPA export downloaded.

**Where it appears:**

- `/finance/tax/` (existing tax center, enhance with auto-calculation)
- `/finance/tax/quarterly` (existing quarterly estimates page)
- Dashboard (tax due date countdown widget)
- Exit links to IRS Direct Pay and state tax portals

**What remains as permanent exit:**

- Actually filing taxes (IRS, state portals, TurboTax, CPA). ChefFlow is not tax software and should never be.
- Making estimated tax payments on IRS Direct Pay or state portals.
- Consulting with a CPA/tax professional for complex situations.
- Receiving and processing 1099s from external platforms (Take a Chef, Thumbtack).
- Scanning/entering receipts that aren't already in the system.

**Priority:** Medium frequency (quarterly + year-end) x Low effort (infrastructure 90% built) = MEDIUM-HIGH
**Spec needed?** No. The tax infrastructure is extensive. The main enhancement is auto-populating quarterly estimates from YTD actuals and adding IRS/state exit links with context.

---

## Scenario #42: Manage business insurance

**Original classification:** Permanent exit (could store policy info + renewal reminders)
**Reclassified to:** Bridgeable
**Status:** NEEDS-DEVELOPER-REVIEW

**Why chef leaves:** The chef needs general liability insurance (most venues require proof), possibly professional liability, auto insurance for the work vehicle, equipment coverage, and workers' comp for hired staff. They visit their insurance provider's portal to renew policies, update coverage amounts, file claims, or download certificates of insurance (COI) for venues.

**Context ChefFlow has:**

- `insurance-actions.ts` (in `lib/business-ops/`): full CRUD for insurance policies with types (general_liability, professional_liability, auto, health, equipment, workers_comp), provider info, policy numbers, coverage amounts, premiums, renewal dates, agent contacts, portal URLs, document storage
- 30-day and 7-day renewal reminders (`reminder_sent_30d`, `reminder_sent_7d` flags)
- Compliance tracking (`lib/compliance/`) with certification/license expiration tracking
- Event readiness checks that can verify insurance coverage
- Venue profiles that can note insurance requirements
- Document storage for uploaded policy PDFs

**Data source?** No. Insurance portals are interactive; there is no API for managing policies. COI generation is provider-specific.

**Client-collaborative angle:** Indirect. Venues (via the event client or venue manager) may request proof of insurance. The Circle could include a "Download COI" link if ChefFlow stores the certificate. The client asking "do you have insurance?" can be answered by sharing stored policy info.

**Physical reality:** Desktop task. Policy management, claims filing, premium payments all happen on provider portals. COI may need to be emailed or printed for venue submission.

**Compounding:** High. Insurance policies are stable year-to-year. Once entered, the data serves every venue that asks for proof, every renewal cycle, and every compliance check. A chef with 5 years of policy history never re-enters this data.

**Solution design:**

- ChefFlow already has robust insurance policy storage (`insurance-actions.ts`). The existing system covers: policy CRUD, types, provider details, agent contacts, portal URLs, renewal dates, and reminder flags.
- Enhance with COI storage: upload the certificate of insurance PDF. When a venue requests proof, one-click share from the event detail page.
- Renewal calendar integration: surface upcoming renewals on the dashboard and in the unified calendar view. Link to the provider portal for one-click renewal navigation.
- Insurance requirement matching: when a venue profile notes "requires $2M general liability," cross-reference against the chef's stored policies and flag gaps.
- Claim tracking: when filing a claim (damaged equipment at an event, slip-and-fall), link the claim to the event record with timeline and status.
- Exit link to provider portal: stored per policy, opens directly to the provider's site with context visible before the chef leaves ("Renewing: General Liability, Provider: Hartford, Expires: July 15").

**Where it appears:**

- Chef settings / business ops (policy management, already exists)
- Event detail page (insurance requirements, COI sharing)
- Dashboard (renewal countdown)
- Compliance center (insurance coverage status)
- Dinner Circle (COI download for venue/client)

**What remains as permanent exit:**

- Provider portal for renewing, modifying, or canceling policies. Insurance is a regulated product; the portal is the destination.
- Filing claims through the provider.
- Paying premiums through the provider's billing system.
- Shopping for new insurance (comparison shopping across providers).
- Communicating with insurance agent about coverage questions.

**Priority:** Low frequency (annual renewals, occasional COI requests) x Low effort (infrastructure exists) = LOW
**Spec needed?** No. The `insurance-actions.ts` infrastructure is comprehensive. Enhancements are incremental: COI upload/share, renewal calendar surfacing, event-level insurance requirement matching.

---

## Batch Summary

| #   | Title                                  | Reclassified To     | Spec Needed? |
| --- | -------------------------------------- | ------------------- | ------------ |
| 38  | Check if a client payment cleared      | Partially Reducible | No           |
| 39  | Send a payment request via Venmo/Zelle | Bridgeable          | No           |
| 40  | Reconcile bank statements              | Partially Reducible | No           |
| 41  | Handle taxes / quarterly estimates     | Partially Reducible | No           |
| 42  | Manage business insurance              | Bridgeable          | No           |

**Summary Stats:**

- Reducible: 0
- Partially Reducible: 3 (#38, #40, #41)
- Bridgeable: 2 (#39, #42)
- Permanent: 0
- Specs written: 0 (all scenarios build on existing infrastructure)
- All 5 marked NEEDS-DEVELOPER-REVIEW

**Key Finding:** ChefFlow's financial infrastructure is remarkably deep. The `lib/finance/` module has 50+ action files covering tax prep, CPA export, bank feeds, expenses, mileage, 1099s, sales tax, payroll, and more. The `lib/stripe/` module handles payment intents, webhooks, payouts, refunds, and connect onboarding. The `lib/ledger/` module provides an immutable append-only ledger. None of these 5 scenarios require new architectural work. They are all "surface existing data better" or "smooth the exit with context" tasks.
