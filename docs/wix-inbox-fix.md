# Wix Inbox Fix — Submission Access & Processing Reliability

## What Was Broken

Wix form submissions were arriving and appearing in the inbox as "New Wix form submission", but clicking them navigated to the inquiries list rather than anything useful. The submission data was inaccessible.

## Root Causes Found

### 1. Cron job never registered
The `/api/scheduled/wix-process` route existed but was never added to `vercel.json`. On Vercel, serverless functions are frozen after a response is sent. The webhook's fire-and-forget async processing (`processWixSubmission(id).catch(...)`) is unreliable in this environment — the lambda may be frozen before it completes.

The cron fallback was designed to catch these failures, but since it wasn't registered, it never ran. Any submission where the async fire-and-forget failed would sit as `status='pending'` forever, with `inquiry_id = NULL`.

### 2. No inquiry → wrong fallback link
When `wix_submissions.inquiry_id` is NULL (submission not yet processed), the `InboxItemCard` component fell back to `/inquiries` — the full inquiries list. The user would see the list but couldn't identify the submission within it. The raw submission data was completely inaccessible.

### 3. No dedicated submission viewer
There was no page in the app to view the raw contents of a Wix submission. The system assumed submissions always get processed into inquiries immediately. When they don't (pending/failed state), there was no fallback UI.

## Changes Made

### `app/api/scheduled/wix-process/route.ts`
The route only exported `POST`. Vercel Cron Jobs send **GET** requests. This is the exact issue the `fix/cron-get-post-mismatch` branch was fixing for all other cron routes — `wix-process` was created after that fix was applied and missed it. The logic was refactored into `handleWixProcess()` and exported as both GET and POST, matching the established pattern across all other cron routes.

### `vercel.json`
Added `/api/scheduled/wix-process` to the crons array at `*/5 * * * *`. This matches the Gmail sync cadence. After deploying, pending submissions will be picked up within 5 minutes automatically, making the fire-and-forget failure mode a non-issue.

### `components/inbox/inbox-item-card.tsx`
Changed the wix source fallback in `getItemHref()` from `/inquiries` to `/wix-submissions/${item.id}`. Now:
- If inquiry was created → navigates to `/inquiries/${inquiry_id}` (existing behavior)
- If submission is pending/failed → navigates to `/wix-submissions/${item.id}` (new page)

### `lib/wix/submission-actions.ts` (new)
Two server actions:
- `getWixSubmission(id)` — fetches a single wix_submission scoped to the chef's tenant
- `retryWixSubmission(id)` — calls `processWixSubmission(id)` directly, with retry guard and tenant ownership check. On success, revalidates the submission page and inbox, and the caller can redirect to the new inquiry.

### `app/(chef)/wix-submissions/[id]/page.tsx` (new)
A server-rendered detail page that shows:
- Submission status with color coding
- Extracted submitter name, email, phone
- Link to the created inquiry (if `inquiry_id` is set)
- Processing error message (if `status='failed'`)
- "Process Now" / "Retry Processing" button (if retryable)
- Full raw payload formatted as JSON
- Breadcrumb back to inbox

## How It Connects to the System

The wix_submissions table is the staging layer between incoming Wix webhooks and the core inquiry pipeline. Submissions enter as `status='pending'`, get processed by `processWixSubmission()` into an inquiry + client record, then marked `status='completed'`. The cron job is the reliability safety net — now that it's registered, the end-to-end flow is complete.

The new submission viewer page doesn't replace or modify the existing processing pipeline. It's purely an observation and manual-trigger surface, fitting the AI Policy pattern of human-in-the-loop for any canonical mutations.

## Deployment Note

After deploying this change, Vercel will register the new cron job automatically on the next deploy. Any submissions currently stuck as `pending` in production will be picked up within 5 minutes of the cron first running.
