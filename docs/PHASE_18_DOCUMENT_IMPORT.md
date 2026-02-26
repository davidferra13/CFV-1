# Phase 18: Document Import

## What Changed

Added three new import capabilities to the Smart Import Hub, expanding it from 3 tabs to 6.

### New Tabs

| Tab                 | Input                        | Output                                              | Parser                                         |
| ------------------- | ---------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| **Import Receipt**  | Photo upload (JPEG/PNG/WebP) | Expense record                                      | `parseReceiptImage()` (existing, now wired in) |
| **Import Document** | Pasted text                  | `chef_documents` record                             | `parseDocumentFromText()` (new)                |
| **Upload File**     | Image or PDF upload          | Auto-detected type (client/recipe/receipt/document) | `parseDocumentWithVision()` (new)              |

### New Database Table

`chef_documents` — stores imported contracts, templates, policies, checklists, notes, and general documents.

- Tenant-scoped with RLS
- Fields: title, document_type, content_text, summary, key_terms (JSONB), tags, source_type
- Optional links to events and clients
- Migration: `20260216000004_chef_documents.sql`

## Files Created

| File                                                    | Purpose                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `lib/ai/import-receipt-action.ts`                       | Server action: receipt extraction to expense via `createExpense()`       |
| `lib/ai/parse-document-text.ts`                         | AI parser: text to structured document (title, type, summary, key terms) |
| `lib/ai/parse-document-vision.ts`                       | AI vision parser: image/PDF to auto-detected data type                   |
| `lib/documents/import-actions.ts`                       | Server action: save parsed document to `chef_documents` table            |
| `supabase/migrations/20260216000004_chef_documents.sql` | Database migration                                                       |

## Files Modified

| File                                     | Changes                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `components/import/smart-import-hub.tsx` | Added 3 tabs, file upload zone, receipt review card, document review card, vision routing |
| `app/(chef)/import/page.tsx`             | Fetches events list for receipt-to-expense attachment                                     |
| `types/database.ts`                      | Regenerated with `chef_documents` table                                                   |

## How It Works

### Receipt Import

1. Chef uploads receipt photo
2. Existing `parseReceiptImage()` extracts store, date, line items, totals via Claude vision
3. Review card shows extracted data with line item table
4. Chef selects expense category, payment method, and optional event
5. Save calls `createExpense()` — same path as manual expense entry

### Document Import

1. Chef pastes contract, policy, or template text
2. `parseDocumentFromText()` sends to Claude with Zod-validated schema
3. AI extracts: title, document_type, summary, key_terms, tags
4. Review card shows structure with collapsible full content
5. Save inserts into `chef_documents` table

### File Upload (Multi-Type Detection)

1. Chef uploads any image or PDF
2. `parseDocumentWithVision()` sends to Claude vision
3. AI classifies content as: client_info, recipe, receipt, or document
4. Hub routes to the appropriate review card (reuses existing cards)
5. Save routes to the matching import action

## Design Decisions

- **Reuse over duplication**: Receipt import reuses the existing `parseReceiptImage()` and `createExpense()` — no new parsing or saving logic needed for that path.
- **Dynamic imports**: New parsers are loaded with `await import()` to keep the initial bundle lean. Only the active tab's parser code is loaded.
- **File upload via base64**: Same pattern as the expense form — `arrayBuffer()` + `btoa()` — no FormData complexity since we're sending to AI, not storing files.
- **Vision for PDFs**: Uses Anthropic's `document` content block type for PDFs, avoiding any third-party PDF parsing dependency.
- **Discriminated routing**: The file upload tab detects content type first, then routes to the exact same review cards and save actions used by the dedicated tabs.

## Connection to System

- Receipt import flows into the existing expense/financial system (expenses table, event profit calculations, budget guardrails)
- Document import creates a new data layer for business documents, scoped to the chef tenant
- File upload is a catch-all that makes the import hub work for any file a chef might have
- All three follow the existing import pattern: parse with AI, review with confidence badges, save with chef approval
