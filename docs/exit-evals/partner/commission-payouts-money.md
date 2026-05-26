# Exit Eval: Partner / COMMISSION, PAYOUTS & MONEY

> Wave 5 | 6 scenarios | Category 6 from `docs/research/partner-exit-points-analysis.md`
> Status: `NEEDS-DEVELOPER-REVIEW` (solo mode, no chef input)
> Date: 2026-05-25

---

## Scenario #31: Check whether a commission was paid

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why partner leaves:** The partner needs to confirm that a specific event's commission was actually paid out to them. They check their bank/Venmo/Zelle because ChefFlow's partner portal does not expose payout history or commission ledger. The decision they are trying to make is "Am I being paid correctly and on time?"

**Context ChefFlow has:**

- Commission type (percentage or flat_fee) stored on `referral_partners` table
- Commission rate (percent or flat cents) per partner
- Completed events with `quoted_price_cents` linked to the partner
- Full payout history in `partner_payouts` table (amount, date, method, reference)
- Computed total earned vs total paid (balance due) on chef-side partner detail page

**Data source?** No external API needed. All data is already in ChefFlow's own database (`partner_payouts`, `referral_partners`, events).

**Client-collaborative angle:** Not applicable. This is a partner-to-chef financial transparency question.

**Physical reality:** Screen-based. Partner checks from phone or desktop. No physical/kitchen context.

**Compounding:** High. Every payout recorded builds a permanent financial history. The partner never needs to ask "did I get paid for June?" again once the ledger is visible to them.

**Solution design:**

- Add a "Payouts" or "Earnings" tab/page to the partner portal (`/partner/earnings`)
- Surface the commission terms (type + rate) read-only at the top
- Show a running ledger: each payout row (date, amount, method, reference)
- Show computed total earned (from completed events) vs total paid vs balance due
- Per-event commission breakdown (event date, occasion, commission amount, paid/unpaid status)

**Where it appears:**

- `/partner/earnings` (new page in partner portal nav)
- Partner dashboard stat card (total earned, total paid)
- Partner portal navigation sidebar

**What remains as permanent exit:**
Partner will still check their bank/Venmo to confirm the actual money landed (external payment rails). ChefFlow cannot replace the bank notification.

**Priority:** Very high frequency (every payout cycle) x Low effort (data already exists in `partner_payouts` table, just needs partner-facing read view) = **P1 signal**
**Spec needed?** No (straightforward read-only view of existing data, no new schema)

---

## Scenario #32: Receive actual payout

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why partner leaves:** The actual money transfer happens through external payment rails (bank transfer, Venmo, Zelle, PayPal, check, cash). ChefFlow is not a payment processor for partner commissions. The partner receives money in their own financial account.

**Context ChefFlow has:**

- Payout amount (recorded by chef in `partner_payouts.amount_cents`)
- Payment method used (`partner_payouts.method`: check, venmo, zelle, bank_transfer, cash, paypal, other)
- Transaction reference (`partner_payouts.reference`: check number, transaction ID)
- Date paid (`partner_payouts.paid_on`)
- Chef's notes on the payout

**Data source?** No. The external payment rail IS the destination. Venmo/Zelle/bank APIs exist but are not practical to integrate for arbitrary partner payments.

**Client-collaborative angle:** Not applicable.

**Physical reality:** Partner receives via their normal financial channels. No ChefFlow surface needed for the receipt itself.

**Compounding:** Low for the transfer itself. The record of the transfer compounds (see #31).

**Solution design:**

- Record method, reference, paid date, and optional receipt/confirmation note (already built in `partner_payouts` table and `PartnerPayoutPanel` component)
- When partner-visible ledger exists (from #31), show the recorded method and reference so the partner knows where to look
- Optional: partner can mark "received" to close the loop from their side

**Where it appears:**

- Chef-side: `PartnerPayoutPanel` on `/partners/[id]` (already built)
- Partner-side: future `/partner/earnings` ledger (from #31)

**What remains as permanent exit:**
The actual money transfer always happens outside ChefFlow. This is truly permanent. Banks, Venmo, Zelle, PayPal, checks, and cash are external rails.

**Priority:** N/A (permanent exit, no build needed) x N/A = **No action**
**Spec needed?** No

---

## Scenario #33: Resolve payout discrepancy

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why partner leaves:** The partner believes they were underpaid, missed a payout, or the commission calculation seems wrong. They email/call the chef to dispute. The operational need is resolving a financial disagreement that requires human judgment and potentially reviewing the underlying event data.

**Context ChefFlow has:**

- Full event history with pricing (events linked to partner)
- Commission terms (type, rate) from `referral_partners`
- Computed commission per event (chef detail page calculates this)
- Payout history with dates and amounts (`partner_payouts`)
- Balance due calculation (earned minus paid)
- Event status (only completed events earn commission)

**Data source?** No external API. The dispute is about ChefFlow's own data accuracy.

**Client-collaborative angle:** Not applicable. This is partner-to-chef only.

**Physical reality:** Screen-based conversation. May require phone/email for tone, but the data resolution is digital.

**Compounding:** Medium. Resolved disputes establish precedent and trust. The resolution notes compound as relationship history.

**Solution design:**

- Add "Question about a payout" action from the partner earnings page
- Attach the question to a specific payout period or event
- Chef sees the dispute note on their partner detail page
- Chef can respond with a resolution note (visible to partner)
- If the shared ledger from #31 is accurate and transparent, most disputes self-resolve before escalation

**Where it appears:**

- `/partner/earnings` (dispute/question button per payout or per period)
- Chef-side partner detail page (incoming dispute notes section)
- Potential notification to chef when partner raises a question

**What remains as permanent exit:**
Complex disputes may still require phone calls or email threads for nuance. Legal/accounting disputes go fully external.

**Priority:** Low frequency (occasional) x Medium effort (needs messaging primitive between partner and chef) = **P3 signal**
**Spec needed?** No (piggbacks on partner messaging feature, not standalone)

---

## Scenario #34: Reconcile tax income

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why partner leaves:** The partner needs to report commission income to their accountant or tax preparer. They go to QuickBooks, a spreadsheet, or their accountant's portal to enter the total commission income received from this chef for the tax year.

**Context ChefFlow has:**

- Full annual payout history per partner (`partner_payouts` with dates and amounts)
- Commission terms and rates
- Per-event commission breakdown
- Annual totals (sum of `amount_cents` for a given year, filterable by `paid_on`)
- Payment method per payout (relevant for 1099 thresholds)
- Chef already has CPA export actions (`lib/finance/cpa-export-actions.ts`) and tax prep tools (`lib/reports/tax-prep.ts`)

**Data source?** ChefFlow has the source data. The external accounting system is the destination, not the source.

**Client-collaborative angle:** Not applicable.

**Physical reality:** Desktop/screen. Partner needs a printable or exportable summary.

**Compounding:** High. Annual statement format, once built, serves every year automatically. Partner never manually tallies again.

**Solution design:**

- Add "Export Annual Statement" from partner earnings page
- Generate a PDF or CSV: partner name, chef business name, tax year, total payouts, per-payout detail (date, amount, method)
- Include chef's EIN/business info if the chef chooses to share it (for 1099 purposes)
- Format suitable for handing to an accountant or importing into QuickBooks
- Chef-side: existing CPA export could include "contractor payments" section referencing partner payouts

**Where it appears:**

- `/partner/earnings` (export button, filter by year)
- PDF download or email delivery
- Chef-side: CPA export package could include partner payout summary

**What remains as permanent exit:**
Partner will always need to enter data into their own accounting system (QuickBooks, tax preparer portal). ChefFlow provides the source document, not the destination.

**Priority:** Low frequency (annual) x Medium effort (PDF/CSV generation from existing data) = **P3 signal**
**Spec needed?** No (standard export, piggybacks on existing CPA export patterns in `lib/finance/cpa-export-actions.ts`)

---

## Scenario #35: Confirm commission terms

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why partner leaves:** The partner wants to verify what commission rate they agreed to. They dig through email, contracts, or text messages to find the original agreement. The decision they are trying to make is "What am I supposed to be earning?"

**Context ChefFlow has:**

- `referral_partners.commission_type` (none, percentage, flat_fee)
- `referral_partners.commission_rate_percent` (e.g., 10.00 for 10%)
- `referral_partners.commission_flat_cents` (e.g., 5000 for $50)
- `referral_partners.commission_notes` (free-text notes about the agreement)
- Chef-side partner detail page already displays all of this prominently
- The `partner-never-leaves-analysis.md` confirms (#161): "Benefit from commission type and rate being stored in the partner record"

**Data source?** No external source needed. ChefFlow already stores the terms.

**Client-collaborative angle:** Not applicable.

**Physical reality:** Quick glance from phone. Partner just needs to see "I get 10% of each booking."

**Compounding:** High. Terms are set once and referenced repeatedly. Displaying them eliminates recurring uncertainty.

**Solution design:**

- Show commission terms prominently on the partner portal (dashboard or earnings page)
- Display: commission type, rate, and any notes the chef added
- Show effective date (could use `referral_partners.updated_at` or add an explicit field)
- Read-only from partner side (chef controls terms)
- One-line summary: "You earn 10% of each completed booking"

**Where it appears:**

- `/partner/dashboard` (earnings summary card)
- `/partner/earnings` (terms section at top)
- Partner portal sidebar or profile page

**What remains as permanent exit:**
If the partner disputes the terms or wants to renegotiate, that conversation happens externally (phone/email). But confirming existing terms is fully in-app.

**Priority:** High frequency (partners check this often) x Very low effort (data exists, just needs portal read view) = **P1 signal**
**Spec needed?** No (trivial display of existing fields)

---

## Scenario #36: Send invoice to chef

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why partner leaves:** Some partners operate as businesses and need to invoice the chef before receiving payment (for their own accounting/tax purposes). They create an invoice in their accounting app (QuickBooks, FreshBooks, Wave) or generate a PDF and email it to the chef.

**Context ChefFlow has:**

- Partner's business name and contact info
- Chef's business info
- Commission amount owed (computed from events)
- Period and event breakdown
- Payout history (what has already been paid)

**Data source?** The external accounting/invoicing tool is the partner's own business system. ChefFlow is not an invoicing platform.

**Client-collaborative angle:** Not applicable.

**Physical reality:** Desktop workflow. Partner creates invoice in their own system.

**Compounding:** Medium. If ChefFlow stores received invoices, they become part of the financial audit trail. The invoice template/pattern compounds (same format each time).

**Solution design:**

- Add "Upload Invoice" or "Submit Payment Request" action on partner earnings page
- Partner uploads a PDF or enters amount + reference number
- Chef sees pending invoice on their partner detail page
- Chef can mark it "paid" (which creates the payout record)
- Optional: auto-generate a draft invoice from ChefFlow data that partner can download and submit through their own system

**Where it appears:**

- `/partner/earnings` (submit invoice button)
- Chef-side partner detail page (pending invoices section)
- Optional: downloadable invoice template pre-filled with ChefFlow data

**What remains as permanent exit:**
Partners who require formal invoicing through their own accounting system (for their own tax/legal compliance) will always create invoices externally. ChefFlow can receive them but not replace the partner's invoicing workflow.

**Priority:** Low frequency (monthly or per-event for some partners, never for others) x Medium effort (file upload + chef review workflow) = **P3 signal**
**Spec needed?** No (standard file upload pattern, piggybacks on partner earnings page)

---

## Batch Summary

| #   | Title                               | Reclassified To     | Spec Needed? |
| --- | ----------------------------------- | ------------------- | ------------ |
| 31  | Check whether a commission was paid | Reducible           | No           |
| 32  | Receive actual payout               | Permanent           | No           |
| 33  | Resolve payout discrepancy          | Bridgeable          | No           |
| 34  | Reconcile tax income                | Partially Reducible | No           |
| 35  | Confirm commission terms            | Reducible           | No           |
| 36  | Send invoice to chef                | Bridgeable          | No           |

## Key Findings

**ChefFlow's current state is strong on the chef side, weak on the partner side:**

- Chef-side partner detail page (`app/(chef)/partners/[id]/page.tsx`) already shows full commission summary, per-event breakdown, and payout history panel
- `partner_payouts` table exists with full schema (amount, date, method, reference, notes)
- `PartnerPayoutPanel` component provides chef-side payout recording and management
- Commission terms are stored (`commission_type`, `commission_rate_percent`, `commission_flat_cents`)
- BUT: the partner portal has zero financial visibility. The dashboard comment literally says "No financial data shown here. Exposure IS the value."
- Partner portal (`app/(partner)/partner/`) has no earnings page, no payout ledger, no commission terms display

**The gap is purely a read-view exposure problem.** All underlying data and computation already exists. Scenarios #31 and #35 are trivially solvable by adding a partner-facing read view of data the chef already records.

**Relevant files:**

- `lib/partners/payout-actions.ts` - server actions for recording/reading payouts (chef-gated)
- `components/partners/partner-payout-panel.tsx` - chef-side payout UI
- `app/(chef)/partners/[id]/page.tsx` - chef partner detail with commission summary
- `database/migrations/20260413000001_partner_payout_history.sql` - payout table schema
- `database/migrations/20260412000007_partner_commission_rates.sql` - commission rate columns
- `lib/partners/portal-actions.ts` - partner portal data fetching (currently excludes financial data)
- `lib/finance/cpa-export-actions.ts` - existing export patterns for tax/accounting
