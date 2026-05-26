# Exit Eval: Vendor / INVOICES, PAYMENTS & ACCOUNTING

> Wave 6 | 8 scenarios | Evaluated: 2026-05-25 | Mode: Solo (NEEDS-DEVELOPER-REVIEW)

---

## Scenario #34: Submit an invoice

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why vendor leaves:** The vendor has completed a delivery or fulfilled an order and needs to submit billing documentation to the chef for payment. The `/vendor/invoices` page is read-only; vendors can view invoice status but cannot create or upload invoices. All invoice creation flows (`createInvoice` in `lib/vendors/invoice-actions.ts`, `uploadVendorDocument` in `lib/vendors/document-intake/upload.ts`) require `requireChef()` auth gating. The vendor must email a PDF, send through accounting software, or call the chef.

**Context ChefFlow has:**

- Vendor identity, contact info, and relationship (vendors table)
- Purchase order history with line items, quantities, and expected totals
- Existing invoice records with line items, date, number, and status
- Document intake pipeline with CSV/XLSX/PDF parsing already built (for chef-side use)
- Price point recording from invoice line items
- Duplicate detection (`findPotentialInvoiceDuplicates`)

**Data source?** No. The invoice originates from the vendor's own accounting/ERP system. ChefFlow is the receiving end.

**Client-collaborative angle:** None directly. This is a vendor-to-chef transaction. However, the purchase order (which the vendor already sees) contains the expected amounts, so the invoice should largely mirror it.

**Physical reality:** Screen-based. Vendors submit invoices from their office, not during physical delivery. A file upload (PDF, CSV, or photo of paper invoice) is the natural interface. Mobile photo capture useful for small suppliers with paper-only workflows.

**Compounding:** High. Once the upload flow exists, every future invoice from every vendor goes through it. Price point extraction compounds into PIE. Duplicate detection improves over time.

**Solution design:**

- Add vendor-side invoice submission form at `/vendor/invoices/new` gated by `requireVendor()`
- Allow file upload (reuse existing `uploadVendorDocument` parsing pipeline, but flip auth from chef to vendor)
- Auto-populate from recent PO if vendor links invoice to an order
- Chef receives notification and can approve/match/dispute
- On chef approval, existing `applyVendorDocumentDraft` and `recordInvoiceLineItemPricePoints` fire

**Where it appears:**

- `/vendor/invoices` (add "Submit Invoice" button)
- `/vendor/orders/[id]` (add "Submit Invoice for This Order" link)
- Chef notification center (new vendor invoice pending review)

**What remains as permanent exit:**
Vendor still maintains their own accounting system of record. They will always also record this invoice in QuickBooks/NetSuite. ChefFlow captures a copy, not the original.

**Priority:** Daily (every delivery cycle) x Medium effort (parsing pipeline exists, needs auth flip + UI) = HIGH
**Spec needed?** Yes

---

## Scenario #35: Correct an invoice

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why vendor leaves:** The vendor submitted an invoice with errors (wrong quantity, wrong price, wrong item) and needs to issue a correction. The vendor portal has zero edit/dispute/correction capability. The vendor must email the chef or send a revised invoice through external channels. There is no vendor-side amendment workflow.

**Context ChefFlow has:**

- The original invoice with line items (vendor_invoices + vendor_invoice_line_items tables)
- Purchase order with expected quantities/prices for comparison
- Invoice status field (`pending`, `matched`, `disputed`)
- Document upload pipeline for replacement files

**Data source?** No. Corrections are vendor-initiated business communications.

**Client-collaborative angle:** None. This is vendor-to-chef.

**Physical reality:** Screen-based office work. The vendor reviews the original, identifies the error, and submits a corrected version or amendment note.

**Compounding:** Medium. Correction patterns may reveal systemic issues (vendor frequently mis-prices certain items), feeding into the Vendor Trust Ledger (`vendor-trust-ledger-contract.ts` already has `overcharge` and `refund` event kinds).

**Solution design:**

- Add "Request Correction" action on vendor invoice detail view
- Vendor specifies which lines changed, with new values and a reason
- Chef receives correction request as a pending review item
- Chef can accept (auto-updates invoice) or reject with note
- Correction history tracked for trust ledger signals

**Where it appears:**

- `/vendor/invoices/[id]` (correction request button, once detail view exists)
- Chef vendor invoice management (correction queue)

**What remains as permanent exit:**
If vendor uses formal credit/debit notes in their own accounting system, they will always create those externally. ChefFlow captures the correction intent, not the vendor's internal accounting entry.

**Priority:** Weekly x Medium effort = MEDIUM-HIGH
**Spec needed?** Yes (can be combined with #34 spec as invoice lifecycle)

---

## Scenario #36: Send credit memo

**Original classification:** Reducible
**Reclassified to:** Partially Reducible

**Why vendor leaves:** The vendor owes the chef a credit (returned goods, overbilling, quality issue refund) and needs to issue a credit memo document. ChefFlow has no credit memo entity. The vendor_invoices status check constraint allows only `pending`, `matched`, `disputed`. There is no negative invoice or credit document type.

**Context ChefFlow has:**

- Invoice history showing the original charge
- Vendor Trust Ledger events (`refund`, `overcharge`, `quality_issue`) that could trigger credits
- Document upload pipeline (could store credit memo PDF)
- `vendor_document_uploads` table with `document_type` enum: `catalog`, `invoice`, `expense`, `supplier_doc`, `other`

**Data source?** No. Credit memos originate from the vendor's accounting system.

**Client-collaborative angle:** None. Vendor-to-chef financial document.

**Physical reality:** Screen-based. Credit memos are formal accounting documents, typically PDF or structured data.

**Compounding:** Medium. Credit memo patterns inform vendor reliability scoring. Frequent credits from a vendor = trust signal.

**Solution design:**

- Add `credit_memo` to the `VendorDocumentTypeSchema` enum
- Allow vendor-side upload of credit memo documents (similar to invoice submission)
- Display credit memos as negative balance entries in the vendor invoice list
- Chef approval workflow before credit is applied
- Link credit memos to originating invoices or trust ledger events

**Where it appears:**

- `/vendor/invoices` (credit memo tab or inline with invoices as negative entries)
- Chef vendor financial view (credit memo queue)

**What remains as permanent exit:**
The vendor's own accounting system issues the formal credit memo. ChefFlow captures a copy and applies the balance adjustment, but does not replace the vendor's AR/AP system.

**Priority:** Monthly x Medium effort = MEDIUM
**Spec needed?** No (include in invoice lifecycle spec)

---

## Scenario #37: Check payment clearing

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** The vendor wants to confirm that the chef's payment (check, ACH, wire) has actually cleared their bank account. ChefFlow has invoice status (`pending`, `matched`, `disputed`) but does not have access to vendor bank settlement data. Payment clearing is a bank-level event that neither party's app can observe directly without bank API integration.

**Context ChefFlow has:**

- Invoice status (pending/matched/disputed)
- Chef-side payment records (if using offline payments or QuickBooks sync)
- Invoice dates and amounts
- `syncInvoiceToQuickBooks` exists in `lib/integrations/quickbooks/quickbooks-client.ts` for chef-side outbound invoices

**Data source?** Partially. If the chef marks an invoice as paid in ChefFlow, that status could be surfaced to the vendor. But actual bank clearing requires the vendor's bank, which is permanently external.

**Client-collaborative angle:** The chef knows when they sent payment. Exposing "payment sent" status to the vendor reduces the need to check bank.

**Physical reality:** Screen-based. Vendor checks bank portal or accounting software.

**Compounding:** Low. Payment clearing is a point-in-time check with no historical learning value.

**Solution design:**

- Add `paid` status to vendor_invoices status constraint (currently only pending/matched/disputed)
- When chef marks invoice paid, surface that status in vendor portal
- Show payment date and method (check/ACH/wire) if chef provides it
- Vendor sees "Paid on [date] via [method]" instead of just "matched"

**Where it appears:**

- `/vendor/invoices` (status badge shows "Paid" with date)
- Vendor invoice detail (payment details section)

**What remains as permanent exit:**
Actual bank settlement confirmation. The vendor will always check their bank to confirm funds received. ChefFlow can only show "chef says they paid."

**Priority:** Weekly x Low effort (status field addition) = MEDIUM
**Spec needed?** No (simple status extension)

---

## Scenario #38: Reconcile open AR

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** The vendor needs to reconcile their accounts receivable (all outstanding invoices across all customers) in their accounting system. ChefFlow only shows this one chef's invoices. The vendor's AR includes many customers, not just ChefFlow chefs.

**Context ChefFlow has:**

- Complete invoice history for this vendor-chef relationship
- Invoice statuses (pending, matched, disputed)
- Amounts and dates
- Takeout/export capability via `lib/exports/takeout-categories.ts` (vendors category includes `vendor_invoices`)

**Data source?** No. AR reconciliation is the vendor's internal accounting process spanning all their customers.

**Client-collaborative angle:** None. This is the vendor's internal book-keeping.

**Physical reality:** Screen-based, spreadsheet/accounting software work.

**Compounding:** Low. Reconciliation is a periodic process with no compounding knowledge.

**Solution design:**

- Add vendor-facing export of their invoice/payment history as CSV or PDF statement
- Include: invoice number, date, amount, status, payment date (if marked paid)
- Format should be importable into QuickBooks/NetSuite/Excel
- Accessible from `/vendor/invoices` as "Download Statement"

**Where it appears:**

- `/vendor/invoices` (export/download button)

**What remains as permanent exit:**
The actual reconciliation process in the vendor's accounting system. ChefFlow provides the data extract; the vendor reconciles externally.

**Priority:** Monthly x Low effort (export generation) = LOW-MEDIUM
**Spec needed?** No (straightforward export feature)

---

## Scenario #39: Update payment terms

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why vendor leaves:** The vendor wants to change their payment terms with the chef (e.g., moving from Net 30 to Net 15, or changing to COD). Payment terms are chef-owned metadata on the vendor record (`payment_terms` field in vendors table, managed via `updateVendor` in `lib/vendors/actions.ts`). The vendor has no portal control to propose term changes.

**Context ChefFlow has:**

- Current payment terms on vendor record
- `payment_terms` field exists and is editable by chef
- Wholesale accounts have a terms check constraint (`cod`, `net_7`, `net_15`, `net_30`)
- Invoice history showing actual payment patterns

**Data source?** No. Terms are negotiated between parties.

**Client-collaborative angle:** None directly. This is a vendor-chef business negotiation.

**Physical reality:** Screen-based. Terms are documented in contracts and system settings.

**Compounding:** Medium. Terms rarely change. Once set, they persist for the relationship duration. The request itself is low-frequency.

**Solution design:**

- Add "Request Terms Change" form in vendor profile section
- Vendor proposes new terms with effective date and reason
- Chef receives notification and can approve (auto-updates vendor record) or counter-propose
- Terms change history logged for audit trail

**Where it appears:**

- `/vendor/profile` (add "Request Terms Update" section)
- Chef vendor detail page (terms change request queue)

**What remains as permanent exit:**
Formal contract amendments may still require external signatures or legal review. ChefFlow handles the operational request; formal contracts remain external.

**Priority:** Rare (few times per year) x Low effort = LOW
**Spec needed?** No (lightweight request form)

---

## Scenario #40: Collect tax forms or W-9s

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why vendor leaves:** The vendor needs to provide tax documentation (W-9 form, tax exemption certificates, 1099 info) to the chef for year-end tax compliance. Currently, this happens via email or physical mail. The database already has `w9_signed_date`, `w9_document_url`, and `w9_collected` fields on the `staff_members` table, showing the pattern exists for staff but not for vendors.

**Context ChefFlow has:**

- Vendor identity and business info
- `vendor_document_uploads` table with `supplier_doc` type (could store tax documents)
- Existing document intake pipeline with file storage
- Staff member table already has W-9 fields as precedent

**Data source?** No. Tax forms are vendor-originated legal documents.

**Client-collaborative angle:** None. Tax compliance is vendor-to-chef (or vendor-to-government, mediated by chef).

**Physical reality:** Screen-based for upload. Physical original may be mailed separately for legal requirements. PDF upload covers 90% of cases.

**Compounding:** High. W-9s are collected once and valid until info changes. Once stored, the chef never asks again. Certificate expiry dates drive proactive re-collection.

**Solution design:**

- Add `w9_collected`, `w9_document_url`, `w9_signed_date` fields to vendors table (mirror staff_members pattern)
- Allow vendor-side upload of tax documents via existing document intake pipeline with `supplier_doc` type
- Chef sees compliance status on vendor profile (collected/missing/expired)
- Optional: proactive reminder to vendor when annual tax season approaches

**Where it appears:**

- `/vendor/profile` (tax documents section with upload capability)
- Chef vendor detail (compliance badge: W-9 collected/missing)

**What remains as permanent exit:**
Government tax portals (IRS for W-9 filing). Vendor still files with the government. ChefFlow is the collection and storage intermediary.

**Priority:** Annual x Low effort = LOW
**Spec needed?** No (field addition + document upload reuse)

---

## Scenario #41: Handle collections/escalation

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** An invoice is significantly overdue and the vendor needs to escalate collections efforts: formal demand letters, involving accounts receivable teams, or engaging collection agencies. This is a legal/business process that exists entirely outside any SaaS tool. ChefFlow has no collections workflow, no escalation states beyond `disputed`, and no vendor-to-chef formal demand mechanism.

**Context ChefFlow has:**

- Invoice aging data (invoice dates + current status)
- Vendor Trust Ledger with performance events and states
- Invoice status (`pending`, `matched`, `disputed`)
- Vendor-chef relationship history

**Data source?** No. Collections is a human/legal process.

**Client-collaborative angle:** None. Collections is adversarial by nature; the chef is the debtor.

**Physical reality:** Phone calls, formal letters, legal proceedings. Not a screen workflow.

**Compounding:** Low. Collections events are rare and each is unique. No pattern compounds.

**Solution design:**

- Add `overdue` status to vendor_invoices (between pending and escalation)
- Surface aging badges in vendor portal (30/60/90 day indicators)
- Add vendor-side "Payment Reminder" action that sends a structured note to chef
- Store escalation notes/trail on invoice for audit purposes
- Do NOT build a collections system; just make the status visible

**Where it appears:**

- `/vendor/invoices` (aging indicators on overdue invoices)
- Vendor invoice detail (send reminder action)

**What remains as permanent exit:**
Formal collections: demand letters, credit agency involvement, legal action. All permanently external to ChefFlow.

**Priority:** Rare x Low effort (status + reminder) = LOW
**Spec needed?** No (status field extension + simple notification)

---

## Batch Summary

| #   | Title                         | Reclassified To     | Spec Needed?             |
| --- | ----------------------------- | ------------------- | ------------------------ |
| 34  | Submit an invoice             | Reducible           | Yes                      |
| 35  | Correct an invoice            | Reducible           | Yes (combined with #34)  |
| 36  | Send credit memo              | Partially Reducible | No (include in #34 spec) |
| 37  | Check payment clearing        | Permanent           | No                       |
| 38  | Reconcile open AR             | Permanent           | No                       |
| 39  | Update payment terms          | Bridgeable          | No                       |
| 40  | Collect tax forms or W-9s     | Bridgeable          | No                       |
| 41  | Handle collections/escalation | Permanent           | No                       |

---

## Key Findings

**Existing infrastructure is strong.** The chef-side document intake pipeline (`lib/vendors/document-intake/`) already handles invoice parsing, duplicate detection, line-item extraction, and price point recording. The primary gap is auth: all flows require `requireChef()`. Flipping to `requireVendor()` with a chef-approval gate is the core architectural change.

**Database supports most of this today.** `vendor_invoices`, `vendor_invoice_line_items`, `vendor_document_uploads` tables are production-ready. The status constraint (`pending`/`matched`/`disputed`) needs expansion to include `paid` and optionally `overdue` and `credit`.

**Vendor portal is read-only today.** The `/vendor/invoices` page queries and displays invoices but has zero mutation capability. All 3 reducible scenarios (#34, #35, #36) share the same root cause: no vendor-side write path.

**QuickBooks integration exists but is chef-outbound only.** `syncInvoiceToQuickBooks` pushes client invoices to QB. There is no vendor-inbound QB sync (and may never be, since the vendor's QB is their system).

**Compounding value concentrates in #34.** Every invoice submission feeds price points into PIE via `recordInvoiceLineItemPricePoints`. This makes vendor invoice submission one of the highest-ROI features for the vendor portal.

---

_All scenarios marked NEEDS-DEVELOPER-REVIEW. Chef operational input may change classifications, especially around #36 (credit memo formality) and #41 (whether ChefFlow should surface more escalation tooling)._
