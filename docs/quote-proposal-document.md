# Quote/Proposal PDF — Implementation

## What Was Built

A printable PDF quote sent to clients, generated from the `quotes` table + linked event menu. Follows the same 3-function pattern as all other document generators: `fetchQuoteDocumentData()` → `renderQuote()` → `generateQuote()`.

## Files Created

### `lib/documents/generate-quote.ts`

- **`fetchQuoteDocumentData(quoteId)`** — Fetches:
  - Quote: pricing model, total, deposit, valid_until, pricing_notes
  - Chef: business_name, email, phone, cancellation_cutoff_days, deposit_refundable
  - Client: full_name, email
  - Event details: from linked `event_id` (occasion, date, guest count, location, dietary restrictions) or fallback to `inquiry_id` confirmed fields
  - Menu: from `menus → dishes → components` (FOH names + descriptions only, grouped by course)

- **`renderQuote(pdf, data)`** — 5 sections:
  1. **Header**: chef business name + date + quote reference (QUOTE-YYYY-XXXX derived from created_at + short UUID)
  2. **Your Menu**: occasion, event date, guest count, location, dietary notes, then courses with FOH descriptions. Menu always comes first — never lead with the price.
  3. **Your Investment**: single line total, pricing model label, deposit breakdown, included items from `pricing_notes`
  4. **Terms**: derived from `cancellation_cutoff_days` and `deposit_refundable` chef settings — no hardcoded copy
  5. **Ready to Book?**: warm CTA with chef contact info

- **`generateQuote(quoteId)`** — orchestrator, returns Buffer.

### `app/api/documents/quote/[quoteId]/route.ts`
`GET /api/documents/quote/[quoteId]` — returns PDF with inline disposition.

## Integration

`app/(chef)/inquiries/[id]/page.tsx`: Added "PDF" link next to each quote with status `sent` or `accepted`. Opens in new tab.

## Design Decisions

- **Menu before price**: The spec is explicit — the client should see what they're getting before they see what it costs. The price lands in context, not cold.
- **Single line item**: No itemized food costs in the quote. The client sees "Private dinner service" + total. The food cost breakdown is internal-only.
- **Terms from settings**: Cancellation policy language is derived from the chef's actual settings (`cancellation_cutoff_days`, `deposit_refundable`) so the PDF is always accurate and doesn't diverge from the system's policy rules.
- **Fallback for no menu**: If the quote is linked to an inquiry without an event (and therefore no menu yet), the menu section shows a graceful "Menu to be finalized" placeholder.
- **Quote reference**: Generated as `QUOTE-{YEAR}-{4-char uppercase hex from UUID}`. Not a sequential number — avoids collisions if quotes are deleted.
