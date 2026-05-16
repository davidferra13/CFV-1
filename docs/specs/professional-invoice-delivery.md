# Professional Invoice Delivery

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** "Picky Client" persona stress test (2026-05-16)
> **Depends On:** None (ledger and invoice system already built)

---

## Problem Statement

Client's husband's company is expensing the dinner. She needs a clean, professional, itemized invoice she can forward to accounting. Not a Venmo screenshot. Not a Square receipt. A real business document.

ChefFlow has a ledger system and invoice infrastructure. But the CLIENT-FACING delivery of a polished, downloadable, forwardable invoice needs verification and polish.

---

## Solution

### 1. Invoice PDF Generation

Generate a professional PDF invoice with:

- Chef's business name, address, contact info (from profile)
- Client's name and address
- Invoice number (auto-generated, sequential per chef)
- Event date and occasion
- Itemized charges: food cost, labor, travel, service fee, add-ons
- Subtotal, tax (if applicable), total
- Payment status: paid/partial/outstanding
- Payment method and date(s)
- Chef's payment terms and cancellation policy (footer)
- Clean, professional layout (not a screenshot of a table)

### 2. Client Portal Invoice Access

On the client portal event page:

- "Download Invoice (PDF)" button for any event with charges
- "Email Invoice" button (sends PDF to client's email, CC optional for accounting)
- Invoice history: all past invoices accessible from client profile
- Receipts for individual payments (deposit receipt, final payment receipt)

### 3. Automatic Invoice Delivery

- After final payment is received, auto-email the complete invoice PDF to client
- Include in the post-event thank-you sequence (attach PDF, don't make them log in)
- Chef can also manually send/resend invoices from event detail page

### 4. Corporate-Ready Formatting

For clients who need corporate expense reports:

- Optional "Bill To" field (company name, attention line, PO number)
- W-9 / tax ID display option (chef configures once in settings)
- Export as CSV for accounting software import

### Files Likely Touched

- `lib/invoices/pdf-generator.ts` (new or enhance existing)
- `lib/invoices/delivery-actions.ts` (new, email with PDF attachment)
- `app/client/[token]/page.tsx` (add invoice download/email buttons)
- `components/client-portal/invoice-actions.tsx` (new)
- `app/(chef)/events/[id]/billing/page.tsx` (add send/resend invoice)
- `lib/email/templates/invoice-delivery.tsx` (new, clean email with PDF attached)
- `app/(chef)/settings/billing/page.tsx` (business info, tax ID, payment terms)

---

## Verification

- [ ] Invoice PDF generates with all required fields
- [ ] PDF layout is clean and professional (not a raw table dump)
- [ ] Client can download PDF from portal
- [ ] Client can request email delivery with optional CC
- [ ] Auto-email fires after final payment with PDF attached
- [ ] Chef can resend invoice from event billing page
- [ ] "Bill To" field supports company name and PO number
- [ ] Invoice number is sequential and unique per chef
