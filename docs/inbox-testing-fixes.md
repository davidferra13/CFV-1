# Inbox Testing & Fixes — March 2026

Session testing the inbox with the developer's real Gmail account (`davidferra13@gmail.com`). Found and fixed 3 bugs.

## Fixes Applied

### 1. Smart Default Tab (inbox page)

**Problem:** Inbox defaulted to "Action Required" tab (0 items), showing "All caught up" even though 81 threads existed in the "Unassigned" tab.

**Fix:** `app/(chef)/inbox/page.tsx` — Added smart default logic that checks if `needs_attention` has 0 items and `unlinked` has items, and defaults to `unlinked` in that case.

### 2. Tab Count Optimistic Updates (inbox client)

**Problem:** After performing triage actions (Mark Done, Snooze, Unsnooze, Reopen), tab counts stayed frozen until a full page reload. The `stats` prop was static from the server and `router.refresh()` was too slow for responsive UX.

**Fix:** `components/communication/communication-inbox-client.tsx` — Added `localStats` state that initializes from server `stats` prop and syncs on refresh, but gets updated optimistically when actions run. All action handlers (`executeAction`, `runAction`, keyboard shortcuts, inline buttons, bulk actions) now pass stats deltas that are applied instantly. On action failure, stats roll back to the previous values.

### 3. Spam/Marketing Emails Flooding Inbox

**Problem:** All synced emails — including IFTTT notifications, TurboTax, Rocket Money, Credit Karma, Cloudflare notifications, etc. — were ingested into the communication triage inbox. The root cause: `ingestCommunicationEvent()` was called BEFORE `classifyEmail()`, so classification results had no effect on whether an email entered the triage system.

**Fix (two-part):**

1. **`lib/gmail/sync.ts`** — Moved `classifyEmail()` to run BEFORE the communication ingestion call. Emails classified as `spam` or `marketing` are now excluded from `ingestCommunicationEvent()` entirely.

2. **`lib/gmail/classify.ts`** — Added `isObviousMarketingOrNotification()` heuristic that catches known marketing/notification domains (TurboTax, Rocket Money, Credit Karma, Cloudflare, IFTTT, etc.) without needing Ollama. This is faster, more reliable, and works even when Ollama is offline.

**Note:** Existing spam emails already in the inbox (~70 of the 78 items) will need to be bulk-triaged manually. The fix prevents future spam from entering.

## Test Results

All inbox features verified working:

- Thread detail page loads with breadcrumb navigation
- Tab switching works (Unassigned, Action Required, Snoozed, Done)
- Star toggle present on all items
- Checkbox selection with bulk actions bar (Bulk Mark Done, Bulk Snooze, Bulk Unassign)
- Add Note modal opens with textarea
- Log New Message modal opens with form fields
- Create Inquiry buttons present on all items
- Source filters and response turn filters functional
- Keyboard shortcuts accessible

## Files Changed

- `app/(chef)/inbox/page.tsx` — Smart default tab
- `components/communication/communication-inbox-client.tsx` — Optimistic tab count updates
- `lib/gmail/sync.ts` — Classification before ingestion
- `lib/gmail/classify.ts` — Marketing domain heuristic
- `app/(chef)/layout.tsx` — Re-enabled overlays (FeedbackNudge, MilestoneOverlay)
- `app/layout.tsx` — Re-enabled CookieConsent
