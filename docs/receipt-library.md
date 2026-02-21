# Receipt Library

**Date:** 2026-02-20
**Branch:** feature/scheduling-improvements
**Status:** Complete

---

## What Changed and Why

### The Problem

The existing receipt system was too restrictive for real-world chef usage:

1. **Receipts required an active event** — upload was blocked for events not in `confirmed` or `in_progress` state. A chef couldn't log a receipt from a past event, a draft event, or any purchase not tied to an event.
2. **`event_id` was NOT NULL** — receipts literally could not exist without an event. Annual equipment purchases, market runs, supply hauls — nowhere to put them.
3. **No chef-wide view** — the only view was per-event at `/events/[id]/receipts`. There was no way to see every receipt ever uploaded.
4. **Signed URLs expired in 24 hours** — the signed URL was the only URL stored. Old receipts would show broken images.

### The Solution

This build removes all those constraints and adds a proper receipt library.

---

## Database Changes

**Migration:** `supabase/migrations/20260313000005_receipt_library.sql`

All additive — no drops, no type changes, no data loss:

| Change                                    | What it enables                                |
| ----------------------------------------- | ---------------------------------------------- |
| `event_id` made nullable                  | Standalone receipts with no event              |
| `client_id UUID` column added             | Direct client association independent of event |
| `storage_path TEXT` column added          | Permanent path for signed URL regeneration     |
| `notes TEXT` column added                 | Chef context note on standalone receipts       |
| `idx_receipt_photos_client_id` index      | FK index for client joins                      |
| `idx_receipt_photos_tenant_created` index | Library query (newest first, per tenant)       |

---

## New Files

### `lib/receipts/library-actions.ts`

Server actions for the library (all `'use server'`):

- **`uploadStandaloneReceipt(formData, opts)`** — same validation as quick-capture but no event-state restriction. Accepts optional `eventId`, `clientId`, `notes`. Stores `storage_path` for URL regeneration.
- **`getAllReceiptsForChef(opts?)`** — fetches all receipts for the tenant. Joins events and clients for display labels. Regenerates fresh 1-hour signed URLs using `createSignedUrls` batch call for photos with a `storage_path`. Falls back to stored URL for legacy records.
- **`getEventOptionsForChef()`** — returns events for the selector dropdown (newest first).
- **`getClientOptionsForChef()`** — returns clients for the selector dropdown.

### `components/receipts/standalone-upload.tsx`

Upload widget for the library page:

- File picker with camera support (same as quick-receipt-capture)
- Optional event selector (defaults to provided `defaultEventId` if given)
- Optional client selector
- Optional notes field
- On success: shows link to Receipt Library

### `components/receipts/receipt-library-client.tsx`

Client component for the library page:

- Filter bar: event, client, status (pending/extracted/approved)
- Summary bar: total count, approved count, total business spend
- Per-receipt cards: store name, context label (event name or "Standalone"), client name, total, status badge, line items with inline editing
- "View in event receipts →" link for receipts tied to an event
- Graceful image fallback if legacy signed URL has expired

### `app/(chef)/receipts/page.tsx`

Server component at `/receipts`:

- Fetches all receipts + event options + client options in parallel
- Renders `StandaloneUpload` (at top) + `ReceiptLibraryClient`
- Accessible from nav under Finance → Receipt Library

---

## Modified Files

### `lib/receipts/quick-capture.ts`

- Removed `ALLOWED_EVENT_STATUSES` restriction — receipts can now be uploaded from any event state
- Now stores `storage_path` in `receipt_photos` on every upload (critical for URL longevity)

### `lib/receipts/actions.ts`

- `ReceiptPhoto.eventId` type changed from `string` to `string | null`
- `processReceiptOCR`: `revalidatePath('/receipts')` always called; `/events/[id]/receipts` only called if `event_id` is non-null
- `approveReceiptSummary`: expense insert uses `event_id ?? null` (expenses table already allows null via `ON DELETE SET NULL`); revalidates `/receipts` and only the event paths if event is set

### `components/navigation/nav-config.tsx`

Added `{ href: '/receipts', label: 'Receipt Library' }` in the Finance group under Financial Hub, at normal (non-advanced) visibility — right after "Add Expense".

---

## How It All Connects

```
/receipts page (server component)
  ↓ fetches
getAllReceiptsForChef()         ← all receipts, fresh signed URLs
getEventOptionsForChef()       ← for selector
getClientOptionsForChef()      ← for selector
  ↓ renders
StandaloneUpload               ← upload widget (any time, any context)
ReceiptLibraryClient           ← library grid with filters
  ↓ receipt approved
approveReceiptSummary()        ← writes business items to expenses (event_id optional)
  ↓ revalidates
/receipts                      ← library refreshes
/events/[id]/receipts          ← per-event page (if event_id set)
/financials                    ← P&L refreshes
```

---

## Chef Workflow

1. **Any time you buy something** → go to `/receipts`, snap a photo, optionally pick the event, tap Upload
2. **Review** → receipts appear in library with status `pending`
3. **Extract** → tap "Extract with AI" — AI reads line items
4. **Tag** → mark items as business or personal
5. **Approve** → business items flow to expenses (linked to event if one was selected, or as a tenant-level expense if standalone)
6. **History** → `/receipts` always shows every receipt ever uploaded, filterable by event, client, or status

---

## Legacy Records

Receipts uploaded before this build do not have `storage_path` set (column is nullable). For those records, the stored `photo_url` (24h signed URL) is used. If that URL has expired, the thumbnail will not load — this is expected and unavoidable for old records. All new uploads now store `storage_path` and will always have regeneratable URLs.
