# Receipt Scanning via OCR.space — Implementation Doc

**Date:** 2026-02-26
**Branch:** `feature/risk-gap-closure`
**Status:** Complete

---

## What Changed

Added OCR.space receipt scanning to ChefFlow's expense tracking system. Chefs can now photograph a receipt, upload the image, and have the text automatically extracted and parsed into expense fields. The scanned data is a **suggestion** — the chef reviews and confirms before saving.

This supplements (does not replace) the existing Gemini-based receipt upload in the expense form. The OCR.space scanner is a lighter-weight, free-tier option that runs text extraction through OCR.space's API and parses the result with deterministic regex (Formula > AI principle).

---

## Architecture

```
Receipt Image (JPEG/PNG/WebP)
        |
        v
[Server Action: scanAndParseReceipt]
        |
        v
[OCR.space API] --> raw text
        |
        v
[Receipt Parser (regex)] --> structured data
        |
        v
[Client: ReceiptScanner] --> chef reviews/edits --> createExpense()
```

### Key Decisions

1. **Formula > AI**: Receipt text parsing uses regex, not LLM. Deterministic, free, offline-capable, same result every time.
2. **OCR.space free tier**: 500 requests/day, no credit card. Engine 2 (better for receipts). API key via `OCR_SPACE_API_KEY` env var.
3. **Graceful degradation**: If `OCR_SPACE_API_KEY` is not set, the utility returns null and the UI shows a message to add the key.
4. **Chef confirms**: Scanned data pre-fills the form but is never auto-saved. The chef reviews and clicks "Create Expense."
5. **All amounts in cents**: Standard ChefFlow pattern. The parser converts dollar strings to integer cents.

---

## New Files

| File                                             | Purpose                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `lib/ocr/ocr-space.ts`                           | OCR.space API utility — `scanReceipt(url)` and `scanReceiptFromBuffer(buffer, filename)` |
| `lib/ocr/receipt-parser.ts`                      | Deterministic receipt text parser — `parseReceiptText(rawText)` returns `ParsedReceipt`  |
| `lib/expenses/receipt-actions.ts`                | Server action — `scanAndParseReceipt(formData)` orchestrates OCR + parsing               |
| `components/expenses/receipt-scanner.tsx`        | Client component — drag & drop upload, OCR scan, parsed data review, expense creation    |
| `app/(chef)/expenses/new/new-expense-client.tsx` | Client wrapper — mode switcher between Manual/Receipt Upload and OCR Scan                |

## Modified Files

| File                               | Change                                                      |
| ---------------------------------- | ----------------------------------------------------------- |
| `app/(chef)/expenses/new/page.tsx` | Updated to use `NewExpenseClient` wrapper with mode support |
| `app/(chef)/expenses/page.tsx`     | Added "Scan Receipt" button in header next to "Add Expense" |

---

## Receipt Parser Details

The parser (`lib/ocr/receipt-parser.ts`) extracts:

- **Store name**: Checks first 8 lines against ~60 known US grocery/retail chains, falls back to first plausible-looking text line
- **Date**: Supports MM/DD/YYYY, YYYY-MM-DD, "Month DD, YYYY", "DD Month YYYY" formats
- **Total/Subtotal/Tax**: Looks for labeled amounts (e.g., "TOTAL $23.45", "TAX 1.87")
- **Line items**: Pattern `ITEM NAME    $X.XX` with skip list for header/footer lines (TOTAL, TAX, CHANGE, etc.)

### Limitations

- Handwritten receipts will not parse well
- Very blurry or rotated images may produce poor OCR text
- Non-English receipts are not supported
- Extremely long receipts may exceed OCR.space free tier limits (1 MB for Engine 2)
- The regex parser handles common US receipt formats; unusual layouts may miss fields

---

## Environment Variables

| Variable            | Required | Default | Description                                                                                 |
| ------------------- | -------- | ------- | ------------------------------------------------------------------------------------------- |
| `OCR_SPACE_API_KEY` | No       | none    | Free API key from [ocr.space](https://ocr.space). If not set, receipt scanning is disabled. |

Get a free key at: https://ocr.space/ocrapi/freekey

---

## User Flow

1. Chef navigates to `/expenses` and clicks "Scan Receipt" (or goes to `/expenses/new?mode=scan`)
2. Drags and drops (or clicks to select) a receipt image
3. Clicks "Scan Receipt" button
4. OCR.space extracts text, regex parser structures it
5. Left panel shows: store name, date, subtotal/tax/total, line items, and raw OCR text toggle
6. Right panel shows: editable expense form pre-filled with scanned data
7. Chef reviews, corrects any fields, assigns event/category, and clicks "Create Expense"
8. Expense is saved via the existing `createExpense()` action

---

## Testing

1. **Without API key**: Set no `OCR_SPACE_API_KEY` — scanning should return error: "OCR.space API key is not configured..."
2. **With API key**: Upload a clear receipt photo — should extract store, date, total, and line items
3. **Bad image**: Upload a non-receipt image — should show "Could not extract text" or partial results with manual entry fallback
4. **Large file**: Upload >10MB — should reject with "File too large" error
5. **Wrong format**: Upload a PDF — should reject with "Invalid file type" error

---

## Future Improvements

- Add receipt image storage to Supabase (link scanned receipt to expense record)
- Batch scanning (multiple receipts at once)
- Receipt history / re-scan capability
- Enhanced parser for non-US receipt formats
- Auto-categorization based on store name (e.g., Whole Foods -> groceries)
