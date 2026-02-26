# Document System Completion

## What Changed

Three gaps in the inquiry-to-booking pipeline were closed. The operational document suite (prep, packing, grocery, execution, travel, etc.) was already complete — this pass targets the business documents that handle client trust and financial formality.

---

## Gaps Closed

### 1. Contract PDF (`lib/documents/generate-contract.ts`)

**Problem:** The contracts system was fully built — template management, merge fields, client signing with signature capture and IP logging — but there was no PDF generation. A signed legal agreement with no PDF is professionally incomplete.

**What was built:**

- `lib/documents/generate-contract.ts` — new generator that renders the contract's `body_snapshot` (stored as markdown) into a formal multi-page PDF
  - Header: chef business name + "SERVICE AGREEMENT"
  - Parties block: two-column chef/client info
  - Body: basic markdown rendering (H1/H2 → section headers, bullets → bullet points, inline bold stripped)
  - Page breaks handled explicitly — new page added before overflow, not silently dropped
  - Signature block: signed status, client name, date, partial IP (first octet hidden for privacy)
  - Footer: contract reference + chef contact
- `app/api/documents/contract/[contractId]/route.ts` — dual-auth route
  - `requireAuth()` → then ownership scoped by role: chef gets `chef_id = tenantId`, client gets `client_id = entityId`
  - Returns `contract-YYYY-MM-DD.pdf` inline
- UI: "Download PDF" link added to the signed state in `components/contracts/send-contract-button.tsx` (chef side) and to the success screen in `app/(client)/my-events/[id]/contract/contract-signing-client.tsx` (client side — appears immediately after signing)

### 2. Client-Facing Quote PDF (`app/api/documents/quote-client/[quoteId]/route.ts`)

**Problem:** The chef could download the quote as a PDF via `GET /api/documents/quote/[quoteId]`, but that route uses `requireChef()`. Clients could only view their quote in HTML at `/my-quotes/[id]`. For high-value private chef bookings, clients often want to forward or print the proposal.

**What was built:**

- `app/api/documents/quote-client/[quoteId]/route.ts` — client-auth route
  - `requireClient()` → verifies ownership via `client_id = user.entityId` in the DB query
  - Reuses `renderQuote()` from the existing `generate-quote.ts` generator — same output, different auth
  - Separate client-scoped data fetch (`fetchQuoteDataForClient`) to avoid calling `requireChef()` internally
  - Also scopes the event query via `client_id` to prevent cross-tenant data access
- UI: "Download PDF" button added to the header of `app/(client)/my-quotes/[id]/page.tsx`

### 3. Invoice PDF (`lib/documents/generate-invoice.ts`)

**Problem:** `invoice-view.tsx` is a beautiful HTML invoice, but neither the chef portal nor the client portal had a PDF download. Clients requesting expense reimbursement from an employer need a proper downloadable invoice.

**What was built:**

- `lib/documents/generate-invoice.ts` — new generator using the `InvoiceData` DTO from the existing `buildInvoiceData()` function — no new DB queries
  - Header: chef business name + "INVOICE" + invoice number and issued date
  - Parties block: two-column FROM (chef) / TO (client)
  - Event details: date, guests, occasion, location
  - Line items: service total with per-person breakdown, deposit note, gratuity
  - Payment history: each ledger entry with date, type, method, and optional transaction reference — right-aligned amounts, refunds shown in parentheses
  - Balance summary: total paid, refunds, balance due, or "PAID IN FULL"
  - Multi-page handled via explicit `wouldOverflow()` checks before each ledger row
- `app/api/documents/invoice/[eventId]/route.ts` — dual-auth route
  - `requireAuth()` → delegates to `getInvoiceData()` for chefs and `getInvoiceDataForClient()` for clients (both existing functions)
  - Returns `INV-YYYY-NNN-YYYY-MM-DD.pdf` inline (uses the invoice number in the filename)
- UI:
  - "Download PDF" link added to `app/(chef)/events/[id]/invoice/page.tsx` (alongside the existing Print button)
  - "Download PDF" link added to `app/(client)/my-events/[id]/invoice/page.tsx`

---

## New Files

| File                                                | Purpose                                              |
| --------------------------------------------------- | ---------------------------------------------------- |
| `lib/documents/generate-contract.ts`                | Contract PDF generator with markdown body renderer   |
| `app/api/documents/contract/[contractId]/route.ts`  | Contract PDF — dual auth (chef + client)             |
| `app/api/documents/quote-client/[quoteId]/route.ts` | Quote PDF — client auth only                         |
| `lib/documents/generate-invoice.ts`                 | Invoice PDF generator using existing InvoiceData DTO |
| `app/api/documents/invoice/[eventId]/route.ts`      | Invoice PDF — dual auth (chef + client)              |

## Modified Files

| File                                                               | Change                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `components/contracts/send-contract-button.tsx`                    | Added "Download PDF" link in the signed state                |
| `app/(client)/my-events/[id]/contract/contract-signing-client.tsx` | Added "Download PDF" link on the post-signing success screen |
| `app/(client)/my-quotes/[id]/page.tsx`                             | Added "Download PDF" button in the header                    |
| `app/(chef)/events/[id]/invoice/page.tsx`                          | Added "Download PDF" link alongside Print button             |
| `app/(client)/my-events/[id]/invoice/page.tsx`                     | Added "Download PDF" link in nav                             |

---

## How It Connects

The document system now covers the full lifecycle end-to-end:

```
Inquiry received
  → Quote sent            ← chef generates PDF via /api/documents/quote/[id]
  → Client views quote    ← client downloads PDF via /api/documents/quote-client/[id]  ✦ NEW
  → Quote accepted
  → Contract sent         ← PDF auto-available via /api/documents/contract/[id]        ✦ NEW
  → Client signs          ← "Download PDF" appears immediately on success screen        ✦ NEW
  → Deposit paid          ← invoice PDF via /api/documents/invoice/[id]                ✦ NEW
  → Event confirmed
  ... (operational documents: prep, packing, grocery, execution, etc.)
  → Balance collected     ← receipt PDF via /api/documents/receipt/[id]
  → Invoice downloaded    ← both chef and client can now get invoice PDF               ✦ NEW
```

---

## Architecture Notes

- **No new DB queries** for the invoice PDF — reuses `buildInvoiceData()` which is already called by the HTML invoice view
- **No new PDF renderer** for the client quote — reuses `renderQuote()` from `generate-quote.ts`
- **Dual-auth pattern**: `requireAuth()` → check role → delegate to role-scoped fetcher. Used in both contract and invoice routes
- **Contract ownership**: Verified at the DB query level (`chef_id` or `client_id` scoping), not in application logic — prevents any bypass
- **Multi-page PDFs**: Contract and invoice both use `wouldOverflow()` + `newPage()` pattern for page breaks, unlike the operational 1-page-constraint sheets
- **PDF download buttons**: Plain `<a href target="_blank">` anchors, not client-side JavaScript — work in server components with no hydration cost
