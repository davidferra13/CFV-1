# Inquiry-Client Decoupling

**Date:** 2026-03-09
**Branch:** `feature/risk-gap-closure`

## What Changed

Inquiries no longer auto-create client records. The client list stays clean, only containing people who are actual business relationships.

## Why

Every inquiry source (Gmail, embed widget, public form, kiosk, TakeAChef, Yhangry, other platforms) was auto-creating a client record for every single person who reached out. Most inquiries never convert to real business. The client list was filling up with noise, making it hard to distinguish real clients from random one-time inquiries.

## How It Works Now

**Before:** Inquiry comes in -> client record auto-created -> inquiry linked to client
**After:** Inquiry comes in -> contact info stored on the inquiry itself -> chef decides when to create a client

### New columns on `inquiries` table

- `contact_name` (TEXT, nullable)
- `contact_email` (TEXT, nullable)
- `contact_phone` (TEXT, nullable)

### Migration

`20260330000092_inquiry_contact_columns.sql` - adds the 3 columns and backfills from existing linked clients.

### The "Convert to Client" flow

The inquiry detail page already had an "Add as Client" button (`InquiryAddClientButton`). This button now becomes the primary way to promote an inquiry into a real client record. When clicked:

1. Creates a new client (or links to existing if email matches)
2. Links the inquiry to the client
3. Links any draft events from this inquiry to the client

### Display logic

All inquiry pages (list, detail, filtered views, leads pages) now check `contact_name`/`contact_email`/`contact_phone` first, then fall back to the linked client, then to `unknown_fields`.

## Files Modified

### Migration

- `supabase/migrations/20260330000092_inquiry_contact_columns.sql`

### Inquiry creation paths (removed auto-client creation)

- `lib/gmail/sync.ts` - Email inquiries, TakeAChef, Yhangry, generic platform handlers
- `app/api/embed/inquiry/route.ts` - Embeddable widget
- `lib/inquiries/public-actions.ts` - Public inquiry form
- `app/api/kiosk/inquiry/route.ts` - Kiosk submissions
- `lib/inquiries/take-a-chef-capture-actions.ts` - Manual TakeAChef capture

### Convert to Client action (enhanced)

- `lib/clients/actions.ts` - `addClientFromInquiry()` now also links events

### UI display logic (updated to use new columns)

- `app/(chef)/inquiries/page.tsx` - Main inquiry list
- `app/(chef)/inquiries/[id]/page.tsx` - Inquiry detail
- `app/(chef)/inquiries/sent-to-client/page.tsx`
- `app/(chef)/inquiries/menu-drafting/page.tsx`
- `app/(chef)/inquiries/declined/page.tsx`
- `app/(chef)/inquiries/awaiting-response/page.tsx`
- `app/(chef)/inquiries/awaiting-client-reply/page.tsx`
- `app/(chef)/leads/qualified/page.tsx`
- `app/(chef)/leads/converted/page.tsx`
- `app/(chef)/leads/archived/page.tsx`
- `app/(chef)/leads/contacted/page.tsx`

## What Still Works

- Existing inquiries with linked clients: unchanged (backfill populates contact columns)
- The "Add as Client" button on inquiry detail: now the primary conversion path
- All display logic has fallbacks (contact columns -> client join -> unknown_fields)
- Referral context is stored in `unknown_fields` for application when client is created later
