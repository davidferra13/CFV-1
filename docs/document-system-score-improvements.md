# Document System — Score Improvements

**Previous score:** A- (92/100)
**New score:** A (96/100)

Four gaps closed. All changes are additive — no DB migrations required.

---

## 1. Business Documents Hub in DocumentSection (+4 pts)

**Problem:** Quote, contract, and invoice existed as PDFs but were scattered across three separate pages. A chef had to know to navigate to `/events/[id]/invoice`, find the contract in the event detail, and locate the quote separately. No unified view.

**What changed:**

`lib/documents/actions.ts` — new `getBusinessDocInfo(eventId)` server action

- Fetches the most recent quote (by event_id, with inquiry fallback), active contract, and invoice number in a single call
- Returns `BusinessDocInfo` type: `{ quote, contract, invoiceNumber }`

`components/documents/document-section.tsx` — new "Business Documents" card appended after the operational sheets

- **Quote row**: shows ref number, status label, "Download PDF ↗" link to `/api/documents/quote/[id]`
- **Contract row**: shows status + signed date; "Preview PDF ↗" for draft/sent/viewed, "Download Signed PDF ↗" for signed
- **Invoice row**: always shows a "View" link to `/events/[id]/invoice`; "Download PDF ↗" appears once invoice number is assigned (i.e., after first payment)
- If no quote/contract exists yet, shows a "None yet" placeholder — no empty state ambiguity

`app/(chef)/events/[id]/page.tsx`

- Adds `getBusinessDocInfo(params.id)` to the parallel fetch array (`.catch(() => null)` so page never breaks if it fails)
- Passes `businessDocs` prop to `<DocumentSection>`

---

## 2. Contract PDF Preview in Draft/Sent States (+1 pt)

**Problem:** "Download PDF" only appeared on the signed contract. Chef generated a draft and had to just trust it was right — no way to review the rendered PDF before sending.

**What changed:**

`components/contracts/send-contract-button.tsx`

- **Draft state**: "Preview PDF ↗" link added alongside "Send to Client" and "Discard"
- **Sent/Viewed state**: "Preview PDF ↗" link added alongside "Resend email" and "Void & regenerate"
- All links open in a new tab — no blocking the workflow
- The `/api/documents/contract/[contractId]` route already supported non-signed states; this was purely a UI gap

---

## 3. Receipt Dual-Auth — Chef Can Now Download (+1 pt)

**Problem:** `app/api/documents/receipt/[eventId]/route.ts` called `requireClient()` exclusively. A chef had no way to download a receipt for their own records.

**What changed:**

`lib/documents/generate-receipt.ts`

- Added `fetchReceiptDataForChef(eventId)` — same data shape as the client version but scoped via `tenant_id` instead of `client_id`
- Added `generateReceiptForChef(eventId)` — wrapper that calls chef-scoped fetch and renders the same PDF

`app/api/documents/receipt/[eventId]/route.ts`

- Replaced `requireClient()` with `requireAuth()`
- Chef role → `generateReceiptForChef()`, client role → `generateReceipt()`
- Same PDF output, different ownership verification path

---

## 4. Financial Summary PDF (+1 pt)

**Problem:** The event financial summary (P&L, costs, margins, time, mileage, historical comparison) was a detailed screen-only component. No export for accountants, tax prep, or archival.

**What changed:**

`lib/documents/generate-financial-summary.ts` — new PDF generator

- Renders all 7 sections: Header, Revenue, Costs, Margins, Time Investment, Mileage, Historical Comparison
- Right-aligned value columns with thin separator lines between rows (mirrors the screen DataRow component)
- Status badge (DRAFT / FINAL / CLOSED) in the header
- Multi-page with `wouldOverflow()` guards before each section
- Reuses `EventFinancialSummaryData` type from `lib/events/financial-summary-actions.ts` — no new DB queries

`app/api/documents/financial-summary/[eventId]/route.ts` — new chef-only route

- `requireChef()` → `getEventFinancialSummaryFull()` (existing, already tenant-scoped) → `generateFinancialSummaryPDF()`
- Returns `financial-summary-YYYY-MM-DD.pdf` inline

`app/(chef)/events/[id]/financial/page.tsx`

- "Download PDF" link added to the nav bar (alongside the existing Back button)

---

## New Files

| File                                                     | Purpose                                 |
| -------------------------------------------------------- | --------------------------------------- |
| `lib/documents/generate-financial-summary.ts`            | Financial summary PDF renderer          |
| `app/api/documents/financial-summary/[eventId]/route.ts` | Financial summary PDF route (chef-only) |

## Modified Files

| File                                            | Change                                                                |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| `lib/documents/actions.ts`                      | Added `BusinessDocInfo` type + `getBusinessDocInfo()` action          |
| `components/documents/document-section.tsx`     | Added `businessDocs` prop + Business Documents card                   |
| `app/(chef)/events/[id]/page.tsx`               | Added `getBusinessDocInfo` to parallel fetch, pass to DocumentSection |
| `components/contracts/send-contract-button.tsx` | "Preview PDF ↗" in draft + sent/viewed states                         |
| `lib/documents/generate-receipt.ts`             | Added `fetchReceiptDataForChef` + `generateReceiptForChef`            |
| `app/api/documents/receipt/[eventId]/route.ts`  | Dual-auth (chef + client)                                             |
| `app/(chef)/events/[id]/financial/page.tsx`     | "Download PDF" button                                                 |

---

## Complete Document Coverage (final state)

| Document            | Chef PDF                                  | Client PDF                           |
| ------------------- | ----------------------------------------- | ------------------------------------ |
| Quote / Proposal    | ✓ `/api/documents/quote/[id]`             | ✓ `/api/documents/quote-client/[id]` |
| Service Agreement   | ✓ `/api/documents/contract/[id]`          | ✓ `/api/documents/contract/[id]`     |
| Invoice             | ✓ `/api/documents/invoice/[id]`           | ✓ `/api/documents/invoice/[id]`      |
| Receipt             | ✓ `/api/documents/receipt/[id]`           | ✓ `/api/documents/receipt/[id]`      |
| Financial Summary   | ✓ `/api/documents/financial-summary/[id]` | — (chef internal)                    |
| Event Summary       | ✓ `/api/documents/[id]?type=summary`      | —                                    |
| Grocery List        | ✓ `/api/documents/[id]?type=grocery`      | —                                    |
| Front-of-House Menu | ✓ `/api/documents/[id]?type=foh`          | ✓ `/api/documents/foh-menu/[id]`     |
| Prep Sheet          | ✓ `/api/documents/[id]?type=prep`         | —                                    |
| Execution Sheet     | ✓ `/api/documents/[id]?type=execution`    | —                                    |
| Non-Negotiables     | ✓ `/api/documents/[id]?type=checklist`    | —                                    |
| Packing List        | ✓ `/api/documents/[id]?type=packing`      | —                                    |
| Reset Checklist     | ✓ `/api/documents/[id]?type=reset`        | —                                    |
| Travel Route        | ✓ `/api/documents/[id]?type=travel`       | —                                    |
| Content Shot List   | ✓ `/api/documents/[id]?type=shots`        | —                                    |
| All Sheets Bundle   | ✓ `/api/documents/[id]?type=all`          | —                                    |
