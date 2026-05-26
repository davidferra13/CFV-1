# Exit Eval: Admin / PAYMENTS, FINANCE & ACCOUNTING

> **Wave 3** | 8 scenarios | Role: **Admin/Owner**
> **Date:** 2026-05-25
> **Mode:** Solo (NEEDS-DEVELOPER-REVIEW)
> **Evaluator:** Claude (exit-eval skill, solo batch)

---

## Scenario #25: Verify a charge, transfer, or refund in Stripe

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why admin leaves:** The admin needs to confirm that a specific payment event (charge, transfer, refund) actually settled in Stripe, because ChefFlow's ledger is a secondary record. Stripe is the system of record for money movement. Typical triggers: client disputes a charge, chef claims non-receipt, ledger shows an entry that needs external confirmation.

**Context ChefFlow has:**

- Ledger entry with amount, type, date, event reference, payment method (`lib/events/offline-payment-actions.ts`)
- Stripe transfer records in `stripe_transfers` table (gross, fee, net, status, stripe_transfer_id)
- Webhook event log with provider event IDs (`app/(admin)/admin/system/payments/page.tsx`)
- Platform reconciliation view with per-chef GMV, transferred, fees, deferred, refunded (`lib/admin/reconciliation-actions.ts`)
- Payment health stats including Stripe key mode and webhook failure history (`lib/admin/platform-stats.ts`)
- Exit link #29 already exists: "View in Stripe" with template `https://dashboard.stripe.com/payments/{paymentId}` (`lib/exit-links/registry.ts:349`)

**Data source?** Yes. Stripe API (charges, transfers, refunds, balance transactions). All retrievable by ID.

**Client-collaborative angle:** None. This is purely platform-operator verification against the payment processor.

**Physical reality:** Screen-based admin task. No physical constraints.

**Compounding:** Medium. Individual verifications do not compound, but building a pattern of which types of entries need verification (webhook gaps, failed events) informs system reliability improvements.

**Solution design:**

- Fetch and display Stripe object status inline when admin clicks a ledger entry or transfer row (use `stripe.charges.retrieve()`, `stripe.transfers.retrieve()`, `stripe.refunds.retrieve()`)
- Show Stripe settlement status (succeeded/pending/failed) alongside ChefFlow ledger status
- Deep-link to Stripe dashboard for the specific object (already wired via exit link #29)
- Add a "Verify against Stripe" button on reconciliation rows that fetches live status
- Surface discrepancies (ChefFlow says paid, Stripe says pending) as alerts in Payment Health

**Where it appears:**

- `/admin/financials` ledger table (per-entry verification)
- `/admin/reconciliation` per-chef rows
- `/admin/system/payments` payment health page
- Chef detail page ledger section

**What remains as permanent exit:**
Admin still leaves for complex investigations (partial captures, multi-transfer chains, balance transaction waterfall), Stripe dispute evidence submission, and any action that mutates Stripe state (void, capture, manual refund).

**Priority:** High frequency (every time money questions arise) x Medium effort (Stripe API calls + UI) = High
**Spec needed?** Yes (stripe-verification-inline.md)

---

## Scenario #26: Cancel or inspect a paid subscription after comping

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** After comping a chef (which sets `subscription_status: 'comped'` and cancels the Stripe subscription via `compChef()` in `lib/admin/chef-admin-actions.ts:85-150`), the admin may need to verify the cancellation actually took effect in Stripe, check if there are pending invoices, or investigate why a webhook later tried to reactivate billing. The comp flow already calls `stripe.subscriptions.cancel()` but error handling is lenient (continues on failure).

**Context ChefFlow has:**

- `compChef()` cancels Stripe subscription and logs the action with audit trail
- Chef record stores `stripe_subscription_id`, `subscription_status`
- Admin audit log records comp/revoke actions with previous status
- Admin can see chef subscription status in `/admin/users/[chefId]`

**Data source?** Yes. Stripe Subscriptions API (status, current_period_end, latest_invoice, cancellation_details).

**Client-collaborative angle:** None. Internal platform operation.

**Physical reality:** Screen-based admin task.

**Compounding:** Low. One-off verification per comp action.

**Solution design:**

- After `compChef()` succeeds, display the Stripe cancellation confirmation (or failure details) in the UI response
- Add subscription history section to chef detail showing: Stripe sub ID, status, cancel date, last invoice
- Show a warning badge if `compChef()` failed to cancel Stripe (the code already catches this error but only logs to console)
- Deep-link to `https://dashboard.stripe.com/subscriptions/{subId}` from chef detail

**Where it appears:**

- `/admin/users/[chefId]` chef detail page (subscription section)
- Admin audit log (comp action outcome)

**What remains as permanent exit:**
Admin still leaves to inspect complex subscription states (prorations, upcoming invoice previews, customer billing portal), resume a subscription, or issue manual credits on the Stripe customer object.

**Priority:** Low frequency (comp events are rare) x Low effort (display existing data) = Low-Medium
**Spec needed?** No

---

## Scenario #27: Reconcile platform fees against payouts

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** The `/admin/reconciliation` page shows platform-computed totals (GMV, transferred, fees, deferred, refunded per chef from `lib/admin/reconciliation-actions.ts`), but the admin needs to confirm these match actual Stripe payouts and bank settlements. Discrepancies arise from timing (Stripe batches payouts), failed transfers, or fee calculation drift.

**Context ChefFlow has:**

- Full reconciliation view: per-chef GMV, transferred, platform fees, deferred, refunded (`getPlatformReconciliation()`)
- `stripe_transfers` table with gross, fee, net, status, deferred flag
- `platform_fee_ledger` table tracking fee/fee_refund entries
- Ledger entries with `transaction_reference` (Stripe event IDs)
- Export capabilities for ledger, revenue by month, revenue by client, expenses (`lib/finance/export-actions.ts`)
- CPA export package with full accounting detail rows (`lib/finance/cpa-export-actions.ts`)

**Data source?** Yes. Stripe Balance Transactions API, Stripe Payouts API, bank feed (if connected via `lib/finance/bank-feed-actions.ts`).

**Client-collaborative angle:** None. Internal financial reconciliation.

**Physical reality:** Screen + spreadsheet workflow. Admin often exports to compare in Excel/Sheets.

**Compounding:** Medium. Reconciliation patterns (which chefs have timing gaps, which fee types drift) inform operational improvements. Monthly reconciliation cadence means the workflow repeats.

**Solution design:**

- Add "Export for Reconciliation" button on `/admin/reconciliation` that produces a CSV with Stripe transfer IDs, dates, amounts, and ChefFlow-computed fees side by side
- Add variance column: computed fee vs. actual Stripe fee (requires fetching `application_fee` from Stripe)
- Add "last payout date" per chef from Stripe Connect
- Add annotation field: admin can note "reconciled through [date]" per chef
- Surface unreconciled period (days since last confirmed reconciliation) as a health signal

**Where it appears:**

- `/admin/reconciliation` (primary surface)
- `/admin/financials` (summary level)
- `/admin/system/payments` (health alert if variance detected)

**What remains as permanent exit:**
Admin still leaves for bank portal confirmation (actual deposits), Stripe payout detail (individual payout composition), and accounting software entry (QuickBooks, spreadsheet).

**Priority:** Medium frequency (monthly) x Medium effort (API integration + export) = Medium
**Spec needed?** No (enhancement to existing reconciliation page)

---

## Scenario #28: Confirm bank deposits

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** Bank balances and deposit confirmations live in the banking system. Even with Stripe payout data, the admin needs to confirm actual money arrived in the bank account. This is a fundamental trust boundary: ChefFlow cannot be the system of record for bank balances.

**Context ChefFlow has:**

- Stripe transfer/payout records (what should have arrived)
- Bank feed infrastructure exists (`lib/finance/bank-feed-actions.ts`) with Plaid/Stripe provider support, transaction confirmation, and reconciliation summary
- Platform reconciliation totals
- Chef payout summary (`lib/stripe/payout-actions.ts`)

**Data source?** Partially. Bank feed integration exists in code (Plaid/Stripe providers), but bank balance confirmation is inherently external. The bank is the ultimate source of truth.

**Client-collaborative angle:** None.

**Physical reality:** Screen-based. Often mobile banking app.

**Compounding:** Low. Each deposit confirmation is ephemeral.

**Solution design:**

- Surface "expected deposit" amounts and dates from Stripe payout schedule
- If bank feed is connected, show matched/unmatched transactions (infrastructure already exists in `bank-feed-actions.ts`)
- Add "deposit confirmed" toggle that admin can mark, creating a reconciliation checkpoint
- Store settlement notes (date confirmed, amount matched, discrepancy if any)

**Where it appears:**

- `/admin/reconciliation` (settlement status column)
- `/admin/system/payments` (last confirmed settlement date)

**What remains as permanent exit:**
Admin always leaves for the bank portal/app to see actual balance. ChefFlow cannot replace the bank as source of truth for deposits. This is correctly classified as permanent.

**Priority:** Medium frequency (weekly/monthly) x Low effort (UI annotations only) = Low-Medium
**Spec needed?** No

---

## Scenario #29: Handle chargebacks or disputes

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why admin leaves:** Stripe's dispute center owns the chargeback response workflow (evidence submission, deadlines, outcomes). The admin needs to gather evidence, submit it through Stripe's interface, and monitor resolution. However, ChefFlow already has a dispute tracking system (`lib/finance/dispute-actions.ts`) and chargeback rate calculator (`lib/finance/chargeback-actions.ts`).

**Context ChefFlow has:**

- `payment_disputes` table with: stripe_dispute_id, amount, reason, status (open/under_review/won/lost), evidence_notes, evidence_urls, opened_at, resolved_at
- `createDispute()`, `updateDisputeEvidence()`, `resolveDispute()` server actions
- `getChargebackRate()` computing dispute-to-transaction ratio over 12 months
- Event data linked to disputes (event_id foreign key)
- Full event history: client, menu, contract, communications, payment ledger
- Chef-side dispute management at `/finance/disputes`

**Data source?** Yes. Stripe Disputes API (status, evidence requirements, deadline, outcome).

**Client-collaborative angle:** Minimal. Client communications history (emails, portal messages) serves as evidence. Contract acceptance records are relevant.

**Physical reality:** Screen-based. Document gathering and form submission.

**Compounding:** Medium. Dispute patterns (which clients, which event types, which payment methods) compound into risk intelligence. Evidence templates improve over time.

**Solution design:**

- Sync dispute status from Stripe webhooks into `payment_disputes` table automatically
- Surface admin-level dispute dashboard showing all tenant disputes (cross-tenant view)
- Auto-assemble evidence package from ChefFlow data: contract signed, client communications, event completion proof, payment receipt, delivery confirmation
- Show Stripe evidence deadline and required fields
- Deep-link to Stripe dispute for actual submission (evidence upload happens in Stripe)
- Add dispute alerts to Payment Health when new disputes arrive via webhook

**Where it appears:**

- `/admin/system/payments` (dispute alert)
- `/admin/financials` (dispute impact on revenue)
- Chef detail page (dispute history per chef)
- New: `/admin/disputes` cross-tenant dispute dashboard

**What remains as permanent exit:**
Admin still leaves for: Stripe evidence submission UI (uploading documents, selecting evidence categories), direct communication with Stripe support for complex cases, and bank-level chargeback responses (rare, for non-Stripe payments).

**Priority:** Low frequency (disputes are rare in private chef) x High effort (webhook sync + evidence assembly) = Medium
**Spec needed?** No (incremental enhancement to existing dispute system)

---

## Scenario #30: Prepare taxes or monthly books

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why admin leaves:** Tax preparation and monthly bookkeeping require an external accounting system (QuickBooks, accountant portal, spreadsheet) because ChefFlow is not an accounting system. However, ChefFlow has an extraordinarily deep financial module that can produce most of the source data.

**Context ChefFlow has:**

- Full CPA export package (`lib/finance/cpa-export-actions.ts`): Schedule C breakdown, accounting detail rows, readiness blockers/warnings, manifest with checksums
- Tax package (`lib/finance/tax-package.ts`): gross revenue, tips, deductible expenses by category, quarterly estimates, mileage
- Tax prep actions (`lib/finance/tax-prep-actions.ts`): Schedule C line items, quarterly estimate tracking, tax prep summary
- 1099 generation (`lib/finance/1099-actions.ts`): 1099-NEC reports, filing summary, CSV export
- Sales tax tracking (`lib/finance/sales-tax-actions.ts`): settings, per-event tax, remittances, unremitted totals
- Profit & Loss report (`lib/finance/profit-loss-report-actions.ts`)
- Expense export, revenue by month, revenue by client CSVs (`lib/finance/export-actions.ts`)
- Payroll with 941 summary and W-2 generation (`lib/finance/payroll-actions.ts`)
- Contractor payments with 1099 summary (`lib/finance/contractor-actions.ts`)
- Mileage tracking with IRS rate (`lib/finance/mileage-actions.ts`)
- Owner draws (`lib/finance/owner-draw-actions.ts`)
- Break-even analysis, cash flow forecast, concentration risk

**Data source?** ChefFlow IS the data source here. The external tool (accounting software) is the consumer. ChefFlow should produce clean, complete exports.

**Client-collaborative angle:** None.

**Physical reality:** Screen + paper (printed reports for CPA meetings). PDF export is valuable.

**Compounding:** High. Tax configuration (rates, filing frequency, Schedule C categories) persists year over year. CPA preferences for report format compound. Quarterly cadence means this workflow repeats 4+ times per year.

**Solution design:**

- The infrastructure is largely built. Key improvement: admin-level aggregate tax reporting across all tenants
- Add platform-level P&L: total platform fees collected, by period, exportable
- Add 1099 generation for platform fees paid to chefs (platform is payer)
- Ensure CPA export package includes platform fee breakdowns
- Add "Tax Season Readiness" admin dashboard: which chefs have complete data, which have gaps

**Where it appears:**

- `/admin/financials` (platform P&L)
- `/admin/reconciliation` (fee totals for platform 1099s)
- New: `/admin/tax-readiness` (cross-tenant tax data completeness)

**What remains as permanent exit:**
Admin always leaves for: actual tax filing (IRS, state portals), accountant review meetings, QuickBooks/accounting software data entry, and professional tax advice. ChefFlow produces source data; external systems consume it.

**Priority:** Medium frequency (quarterly/annual) x Low effort (exports exist, need admin aggregate) = Medium
**Spec needed?** No

---

## Scenario #31: Investigate Stripe key mode mismatch

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** The admin Payment Health page already detects and displays Stripe key mode (test vs. live) for both secret and publishable keys (`app/(admin)/admin/system/payments/page.tsx:81-86`). However, fixing a mismatch requires accessing the hosting secrets manager or `.env.local` to update the keys. ChefFlow correctly refuses to reveal or edit secrets.

**Context ChefFlow has:**

- Stripe secret key mode detection (live/test prefix parsing)
- Stripe publishable key mode detection
- Mode mismatch blocker alert in Payment Health
- Webhook event count and failure tracking (confirms whether live events are flowing)

**Data source?** No. The fix requires infrastructure access (hosting dashboard, secret manager).

**Client-collaborative angle:** None.

**Physical reality:** Screen-based. Infrastructure console access.

**Compounding:** Low. One-time fix per environment. Rarely recurs.

**Solution design:**

- Already well-handled. Payment Health shows the mismatch clearly.
- Add: specific remediation instructions (which env var to check, expected format)
- Add: link to hosting dashboard if configured
- Add: "last known good state" timestamp (when keys last matched and webhooks flowed)

**Where it appears:**

- `/admin/system/payments` (primary, already built)
- System Health overview (roll-up blocker badge)

**What remains as permanent exit:**
Admin always leaves to access the secret manager, hosting dashboard, or `.env.local` file. ChefFlow must never expose or allow editing of API keys through its UI. This is correctly permanent.

**Priority:** Very low frequency (rare misconfiguration) x Very low effort (instructions only) = Low
**Spec needed?** No

---

## Scenario #32: Issue non-ChefFlow refund or goodwill payment

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** The admin needs to send money through an external channel (Stripe manual refund, bank transfer, Venmo, Zelle) because the payment was not processed through ChefFlow's payment rails, or the goodwill gesture has no corresponding ChefFlow transaction to reverse.

**Context ChefFlow has:**

- Admin credit/debit adjustment capability (`issueAdminCredit()` in `lib/admin/chef-admin-actions.ts:287+`): appends immutable ledger entry of type 'adjustment' with admin audit
- Offline payment recording (`lib/events/offline-payment-actions.ts`): records cash/Venmo/Zelle payments in ledger
- Exit link #29 for Stripe dashboard access
- Full chef ledger history for context on what the adjustment is for

**Data source?** No. The payment rails (Venmo, Zelle, bank, Stripe manual) are external action surfaces, not data sources.

**Client-collaborative angle:** None directly. Client may need to provide payment details (Venmo handle, bank info) but this is typically handled through direct communication.

**Physical reality:** Screen-based. Admin uses external payment app/portal.

**Compounding:** Low. Each goodwill payment is a one-off business decision.

**Solution design:**

- Add "Record External Adjustment" action on chef detail that captures: amount, direction (credit/debit), external reference (Venmo transaction ID, Zelle confirmation, check number), reason, date
- Use existing `issueAdminCredit()` infrastructure but extend it to store external payment reference
- Show external adjustment history with reference IDs for audit trail
- Add templates for common goodwill scenarios (service issue credit, overcharge correction, promotional credit)

**Where it appears:**

- `/admin/users/[chefId]` (chef detail, ledger section)
- `/admin/financials` (adjustment entries visible in platform ledger)
- Admin audit log (all adjustments logged)

**What remains as permanent exit:**
Admin always leaves to actually execute the payment (send money via Venmo, initiate bank transfer, process Stripe refund). ChefFlow records the decision and outcome but cannot move money through external rails.

**Priority:** Low frequency (occasional goodwill situations) x Low effort (extend existing adjustment flow) = Low
**Spec needed?** No

---

## Batch Summary

| #   | Title                                               | Reclassified To     | Spec Needed? |
| --- | --------------------------------------------------- | ------------------- | ------------ |
| 25  | Verify a charge, transfer, or refund in Stripe      | Partially Reducible | yes          |
| 26  | Cancel or inspect a paid subscription after comping | Bridgeable          | no           |
| 27  | Reconcile platform fees against payouts             | Bridgeable          | no           |
| 28  | Confirm bank deposits                               | Permanent           | no           |
| 29  | Handle chargebacks or disputes                      | Partially Reducible | no           |
| 30  | Prepare taxes or monthly books                      | Partially Reducible | no           |
| 31  | Investigate Stripe key mode mismatch                | Permanent           | no           |
| 32  | Issue non-ChefFlow refund or goodwill payment       | Bridgeable          | no           |

---

## Key Findings

**ChefFlow's financial infrastructure is remarkably deep.** The `lib/finance/` module exports 50+ server actions covering: CPA export packages, tax prep (Schedule C, 1099, W-2, 941), payroll, sales tax, dispute tracking, bank feed reconciliation, cash flow forecasting, margin analysis, mileage, expenses, and more. The admin portal already has reconciliation (`/admin/reconciliation`), financials overview (`/admin/financials`), and payment health (`/admin/system/payments`).

**Primary gap:** Live Stripe object verification. ChefFlow stores Stripe IDs but does not fetch live status from Stripe's API for inline display. The exit link infrastructure (registry #29) provides a "View in Stripe" deep link, but the admin cannot verify without context-switching.

**Existing strengths:**

- `compChef()` already handles Stripe subscription cancellation with audit logging
- Dispute system (`payment_disputes` table + CRUD actions) exists at chef level
- Bank feed infrastructure (Plaid/Stripe) is code-complete
- CPA export is production-grade with checksums and blockers
- Admin credit/debit adjustments are already immutable and audited

**All scenarios marked NEEDS-DEVELOPER-REVIEW** (solo mode, no chef/operator input on workflow preferences).
