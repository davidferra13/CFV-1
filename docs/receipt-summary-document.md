# Receipt Summary — Implementation

## What Was Built

A full receipt digitization pipeline: upload a receipt photo → AI extracts line items → chef reviews and tags → approve → business items are written to the expenses table.

## Database

**Migration: `supabase/migrations/20260303000006_receipt_digitization.sql`**

Three new tables, all with `tenant_id` RLS:

### `receipt_photos`

One record per uploaded receipt photo. Tracks pipeline state via `upload_status`:

- `pending` — uploaded, not yet processed
- `processing` — OCR in flight
- `extracted` — AI extraction complete, awaiting chef review
- `approved` — chef approved, business items copied to expenses

### `receipt_extractions`

Structured header data from one receipt photo. Fields:

- `store_name`, `store_location`, `purchase_date`, `payment_method`
- `subtotal_cents`, `tax_cents`, `total_cents`
- `extraction_confidence` (DECIMAL 0.00–1.00 mapped from AI's high/medium/low)

### `receipt_line_items`

Individual items from a receipt extraction:

- `description` — full item name (AI expands abbreviations)
- `price_cents` — total price for the line
- `expense_tag` — `business | personal | unknown` (AI pre-tags personal items; chef adjusts)
- `ingredient_category` — `protein | produce | dairy | pantry | alcohol | supplies | personal | unknown`
- `event_id` FK — which event this item belongs to (defaulted to the photo's event, editable)

## Files Created

### `lib/receipts/actions.ts`

- **`uploadReceiptPhoto(eventId, photoUrl)`** — Registers an already-uploaded photo URL with the pipeline. The photo must be in Supabase Storage before calling this.
- **`processReceiptOCR(receiptPhotoId)`** — Fetches the image, calls `parseReceiptImage()` from `lib/ai/parse-receipt.ts`, stores extraction + line items. Idempotent — re-running clears old extraction first.
- **`updateLineItem(lineItemId, patch)`** — Chef inline edits: expense_tag, ingredient_category, description, price_cents.
- **`approveReceiptSummary(receiptPhotoId)`** — Marks `upload_status = 'approved'`, copies all `business` line items to the `expenses` table. Idempotent.
- **`getReceiptSummaryForEvent(eventId)`** — Fetches all receipts with nested extractions and line items.

### `components/events/receipt-summary-client.tsx`

Interactive client component:

- Per-receipt blocks with photo thumbnail, store info, payment method, totals
- Line items table with inline editing (click to edit description, dropdowns for category + tag)
- Confidence badge (green/amber/red based on AI's confidence score)
- Business/personal subtotal below the items table
- "Extract with AI" button (→ OCR), "Re-extract" button, "Approve" button

### `app/(chef)/events/[id]/receipts/page.tsx`

Server component wrapper that fetches data and renders `<ReceiptSummaryClient>`.

## Integration

Event detail page (`app/(chef)/events/[id]/page.tsx`): "Receipt Summary" link added to the Expenses section header.

## Design Decisions

- **Existing AI parser reused**: `lib/ai/parse-receipt.ts` (Gemini vision) already existed with full line item extraction + categorization. The receipt pipeline wraps it rather than duplicating.
- **Non-destructive OCR**: Re-running OCR deletes the old extraction first (via DELETE before INSERT), so chefs can re-process blurry receipts without creating duplicate line items.
- **Approval is the write gate**: Nothing touches the `expenses` table until the chef explicitly clicks "Approve." The AI is in the suggestion zone — the chef is the final authority on what becomes a business expense.
- **Category → expense category mapping**: AI categories (protein, produce, dairy, pantry) map to expense categories (groceries, alcohol, supplies) for the `createExpense` insert. `personal` items are skipped entirely.
- **Page reload on OCR**: After running OCR, the page is reloaded via `window.location.reload()` to show the newly extracted data. This is intentional — the server-side data fetch is the source of truth, and revalidatePath alone doesn't re-fetch nested relations in this component architecture.
