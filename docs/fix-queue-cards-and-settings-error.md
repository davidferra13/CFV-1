# Fix: Queue Cards Showing Identical Info + Settings Page Crash

**Date:** 2026-02-24
**Branch:** `feature/risk-gap-closure`

## Problems

### 1. Settings Page — Server Component Render Error

The Gmail Integration section on `/settings` showed "An error occurred in the Server Components render." This happened because several `Promise.all` data-fetching calls (`getGoogleConnection`, `getWixConnection`, `getNetworkDiscoverable`, etc.) had no `.catch()` handlers. If any one failed (network issue, RLS policy, missing column), the entire settings page crashed.

### 2. Dashboard Queue Cards — All Looked Identical

The Priority Queue on the dashboard showed every inquiry as:

- **Title:** "Respond to new inquiry"
- **Description:** "Dikshita reached out via email. First response sets the tone."

Even though each inquiry had unique details (different dates, locations, occasions), the queue card template was generic and showed no distinguishing information. For Yhangry inquiries (where the platform gates client details), this made every card look like a duplicate.

### 3. TakeAChef Dedup — Missing `channel` Parameter

Three `findPlatformInquiryByContext()` calls in the TakeAChef handlers were missing the required `channel` parameter. Since `sync.ts` has `@ts-nocheck`, TypeScript didn't catch this. The missing channel caused dedup lookups to match against all channels instead of just `take_a_chef`, potentially causing false positive matches or missed dedup.

## Fixes

### Settings Page (app/(chef)/settings/page.tsx)

- Added `.catch()` handlers to all fragile data-fetching calls in `Promise.all`
- Each catch returns a safe default (empty array, null, false, disconnected status)
- The page now renders even if Gmail, Wix, Calendar, or other integration APIs fail
- Errors are logged server-side for debugging

### Queue Card Display (lib/queue/providers/inquiry.ts)

- Added `inquirySummary()` helper that builds a short summary from confirmed facts: occasion, date (formatted), location, guest count
- Added `channelLabel()` helper for friendly channel names (Yhangry, TakeAChef vs raw enum values)
- **New inquiry cards** now show:
  - **Yhangry:** `"Yhangry: private event · Feb 20 · Middlesex"` instead of generic text
  - **Regular email:** `"Dikshita: private event · Feb 20 · Middlesex"` instead of "Respond to new inquiry"
  - **No confirmed facts:** `"New inquiry from Dikshita"` (graceful fallback)
- **Awaiting-chef cards** now include the summary in the title
- **Follow-up cards** now include the summary in the title
- Yhangry inquiries get the same priority boost as TakeAChef (platform expectations)
- Select query now includes `confirmed_date`, `confirmed_location`, `confirmed_guest_count`

### TakeAChef Dedup (lib/gmail/sync.ts)

- Added `channel: 'take_a_chef'` to three `findPlatformInquiryByContext()` calls:
  - `handleTacClientMessage` (line ~821)
  - `handleTacBookingConfirmed` (line ~904)
  - `handleTacCustomerInfo` (line ~1053)

## Yhangry Platform Notes

Yhangry emails gate client information — the initial notification doesn't include the client's real name. The platform rep name (e.g., "Dikshita") appears as the sender. The actual client details are only visible after accepting the quote on yhangry.com. This means:

- All Yhangry inquiries from the same rep will have the same client name
- The queue cards now differentiate by occasion, date, and location instead
- This is expected behavior, not a bug

## Files Changed

- `app/(chef)/settings/page.tsx` — Error-resilient data fetching
- `lib/queue/providers/inquiry.ts` — Descriptive queue cards with confirmed facts
- `lib/gmail/sync.ts` — Missing channel parameter in 3 TakeAChef dedup calls
