# PDF Generation — PDFKit Integration

## Summary

ChefFlow now has two PDF generation engines:

1. **jsPDF** (existing) — used by all document generators via `lib/documents/pdf-layout.ts`
2. **PDFKit** (new) — wired in for invoice PDF generation via `lib/documents/pdf-generator.ts`

PDFKit produces higher-quality vector PDF output with better font handling, precise layout control, and cleaner output for professional documents. The jsPDF-based system continues to work for all existing document types (prep sheets, grocery lists, checklists, etc.).

## Architecture

```
Invoice data flow:
  lib/events/invoice-actions.ts    → getInvoiceData() / getInvoiceDataForClient()
  lib/documents/pdf-generator.ts   → generateInvoicePdf(data) → Buffer (PDFKit)
  app/api/documents/invoice-pdf/   → GET /api/documents/invoice-pdf/[eventId]

Legacy (still active):
  lib/documents/generate-invoice.ts → generateInvoicePDF(data) → Buffer (jsPDF)
  app/api/documents/invoice/        → GET /api/documents/invoice/[eventId]
```

## Key Files

| File                                               | Purpose                                            |
| -------------------------------------------------- | -------------------------------------------------- |
| `lib/documents/pdf-generator.ts`                   | PDFKit invoice PDF generator                       |
| `app/api/documents/invoice-pdf/[eventId]/route.ts` | API route serving PDFKit invoices                  |
| `lib/documents/generate-invoice.ts`                | Legacy jsPDF invoice generator (still works)       |
| `app/api/documents/invoice/[eventId]/route.ts`     | Legacy jsPDF API route (still works)               |
| `lib/documents/pdf-layout.ts`                      | jsPDF layout wrapper (used by all other documents) |
| `lib/events/invoice-actions.ts`                    | Invoice data fetching and computation              |

## API Endpoints

### New: PDFKit Invoice

```
GET /api/documents/invoice-pdf/{eventId}
```

- Auth: requires authenticated user (chef or client)
- Returns: `application/pdf` with inline disposition
- Generator: PDFKit

### Legacy: jsPDF Invoice

```
GET /api/documents/invoice/{eventId}
```

- Auth: requires authenticated user (chef or client)
- Returns: `application/pdf` with inline disposition
- Generator: jsPDF

## Invoice PDF Features

- Brand header: terracotta orange `#e88f47` accent bars (top and bottom)
- Chef business name and contact info
- Invoice number and issue date
- Client name and email
- Event details (occasion, date, location, guest count)
- Services table with line items
- Per-person pricing breakdown (when applicable)
- Deposit required line
- Sales tax with rate and ZIP code
- Gratuity line
- Payment history table (date, type, method, amount)
- Transaction references in muted text
- Balance summary box with service total, tax, paid, refunded
- Balance due or "PAID IN FULL" indicator
- Professional footer with invoice reference

## Design Decisions

### Why PDFKit alongside jsPDF?

- PDFKit produces true vector PDFs with precise positioning
- Better font metrics and text wrapping
- Streaming buffer output (memory-efficient for large documents)
- jsPDF system kept intact for backward compatibility and the ~10 other document types

### Why async?

- PDFKit uses a streaming API (writable stream). The generator returns a Promise that resolves when the stream finishes.
- The API route `await`s the buffer before sending the response.

### Monetary amounts

- All amounts stored in cents (integers) per project convention
- `formatCents()` divides by 100 and formats with 2 decimal places
- Refunds display in parentheses with red color

### Authentication

- Route uses `requireAuth()` to allow both chef and client roles
- Chef path: `getInvoiceData()` scoped by tenant ID from session
- Client path: `getInvoiceDataForClient()` scoped by client entity ID

## Dependencies

- `pdfkit@^0.17.2` (runtime)
- `@types/pdfkit` (dev, TypeScript types)
- `date-fns` (date formatting)

## UI Integration

Both invoice pages now link to the PDFKit route:

- Chef: `app/(chef)/events/[id]/invoice/page.tsx` — "Download PDF" button
- Client: `app/(client)/my-events/[id]/invoice/page.tsx` — "Download PDF" button

## Future Considerations

- Other document types (quotes, receipts, contracts) could be migrated to PDFKit for consistent quality
- PDF attachments for email (invoice emails could include the PDF as an attachment)
- Batch PDF generation for monthly statements
