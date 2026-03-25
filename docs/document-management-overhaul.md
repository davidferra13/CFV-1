# Document Management Overhaul

**Date:** 2026-03-18
**Branch:** feature/external-directory

## Summary

Comprehensive enhancement of ChefFlow's document management system across three phases: batch upload with image quality checks, auto-organization with universal entity linking, and unified cross-table search with audit trail.

## What Changed

### Phase 1: Batch Upload + Image Quality

**New files:**

- `lib/receipts/batch-upload-actions.ts` - Server action for concurrent batch upload (3 files at a time via Promise.allSettled, max 20 per batch)
- `lib/receipts/image-quality-check.ts` - Client-side image validation (dimensions, file size, type) before upload
- `components/receipts/batch-upload.tsx` - Batch upload UI with per-file status indicators, quality warnings, and progress tracking

**Modified files:**

- `lib/receipts/actions.ts` - Added `needs_review` status when OCR confidence < 0.5. Added auto-organize on approval. Added activity logging.
- `lib/receipts/library-actions.ts` - Updated `AllReceiptPhoto` type to include `needs_review` status
- `components/receipts/receipt-library-client.tsx` - Added `needs_review` badge, filter option, and manual review hint UI

**How it works:**

1. Chef selects up to 20 receipt photos (phone camera, file picker, or batch selection)
2. Client-side quality check validates each file (type, size, dimensions)
3. Files upload 3 at a time via `Promise.allSettled` (individual failures don't block others)
4. Each file creates a `receipt_photos` record and triggers background OCR
5. If OCR confidence is below 0.5, status is set to `needs_review` instead of `extracted`
6. Chef sees orange "needs review" badge and a prompt to verify data before approving

### Phase 2: Auto-Organization + Universal Entity Linking

**New files:**

- `lib/documents/auto-organize.ts` - Creates `Receipts / {year} / {MM} - {MonthName}` folder hierarchy on receipt approval (idempotent, reuses existing auto-folders)
- `lib/documents/link-actions.ts` - Unified document linking: attach/detach any `chef_document` to events, clients, or inquiries. Retrieval functions for each entity type.
- `lib/documents/intelligence-router.ts` - Routes classified `document_intelligence_items` to their destination (receipt -> receipt_photos, document -> chef_documents, recipe -> recipes, client_info -> clients)
- `components/documents/related-documents-panel.tsx` - Reusable panel showing all linked documents for an event, client, or inquiry

**Database migration (`20260401000082`):**

- `chef_folders.is_auto` (boolean) - distinguishes auto-generated folders from manual ones
- `chef_documents.inquiry_id` (uuid FK) - enables linking documents to inquiries
- `expenses.receipt_photo_id` (uuid FK) - direct link from expense to source receipt
- Updated `receipt_photos.upload_status` comment to document `needs_review` as valid status

### Phase 3: Unified Search + Audit Trail

**New files:**

- `lib/documents/search-actions.ts` - Cross-table search across `receipt_photos`, `chef_documents`, and `expenses` with text, date range, amount range, event, and client filters
- `components/documents/document-search-client.tsx` - Interactive search UI with filters and paginated results
- `components/documents/document-timeline.tsx` - Visual lifecycle timeline for receipts (uploaded -> OCR -> review -> approved -> expenses created)
- `lib/documents/activity-logging.ts` - Non-blocking activity logger for all document operations

**Modified files:**

- `app/(chef)/documents/page.tsx` - Added Document Search section at the top of the existing documents page

## Architecture Decisions

1. **Batch state is client-side** - no new table needed for tracking batch upload progress
2. **Auto-folders use `is_auto` flag** - prevents confusion with manually created folders
3. **Cross-table search via server action** (not SQL view) - avoids migration, allows flexible filtering in application code
4. **Activity logging is non-blocking** - wrapped in try/catch, failures logged to console, never disrupts main operations
5. **Image quality checks are client-side** - no server dependency, instant feedback, zero cost
6. **All AI processing unchanged** - Gemini for vision (receipts), Ollama for text (documents), privacy boundary preserved

## Files Created

| File                                                                      | Purpose                               |
| ------------------------------------------------------------------------- | ------------------------------------- |
| `database/migrations/20260401000082_document_management_enhancements.sql` | Schema changes                        |
| `lib/receipts/batch-upload-actions.ts`                                    | Concurrent batch upload server action |
| `lib/receipts/image-quality-check.ts`                                     | Client-side image validation          |
| `lib/documents/auto-organize.ts`                                          | Year/month folder auto-creation       |
| `lib/documents/link-actions.ts`                                           | Universal entity linking              |
| `lib/documents/intelligence-router.ts`                                    | Document intelligence auto-routing    |
| `lib/documents/search-actions.ts`                                         | Cross-table unified search            |
| `lib/documents/activity-logging.ts`                                       | Non-blocking audit trail logging      |
| `components/receipts/batch-upload.tsx`                                    | Batch upload UI component             |
| `components/documents/related-documents-panel.tsx`                        | Entity-linked documents panel         |
| `components/documents/document-search-client.tsx`                         | Unified search UI                     |
| `components/documents/document-timeline.tsx`                              | Receipt lifecycle timeline            |

## Files Modified

| File                                             | Change                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `lib/receipts/actions.ts`                        | needs_review status, auto-organize on approval, activity logging |
| `lib/receipts/library-actions.ts`                | Updated type to include needs_review                             |
| `components/receipts/receipt-library-client.tsx` | needs_review badge, filter, hint UI                              |
| `app/(chef)/documents/page.tsx`                  | Added search section with DocumentSearchClient                   |

## How to Use

### Batch Upload

Navigate to `/receipts` and use the Batch Receipt Upload widget. Select multiple files, optionally link to an event/client, and upload all at once.

### Document Search

Navigate to `/documents` and use the Document Search card at the top of the page. Filter by source type, date range, event, or client.

### Related Documents Panel

Import `RelatedDocumentsPanel` from `components/documents/related-documents-panel.tsx` and pass `entityType` ("event", "client", or "inquiry") and `entityId`.

### Document Timeline

Import `DocumentTimeline` and `buildReceiptTimeline` from `components/documents/document-timeline.tsx` to render a lifecycle timeline for any receipt.
