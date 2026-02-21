# Holiday Monetization — Gap Closure

**Date:** 2026-02-21
**Branch:** feature/scheduling-improvements
**Commit:** feat(holiday): close all 6 monetization gaps

---

## What Changed and Why

The holiday intelligence system was already built (35-holiday calendar, 3-tier surge pricing, outreach panel, seasonality analytics) but had 6 specific gaps where money was being left on the table. This build closes all 6.

---

## Gap 1 — Holiday Lead Score Boost (was unwired)

**File:** [lib/leads/scoring.ts](../lib/leads/scoring.ts)

`holidayLeadScoreBoost()` existed in `lib/holidays/upcoming.ts` but was never called anywhere. Inquiries landing near Thanksgiving, Valentine's Day, or Mother's Day were scored the same as a random Tuesday.

**Fix:** Import and call `holidayLeadScoreBoost(new Date(inquiry.confirmed_date))` in `scoreInquiry()`. Adds 0–20 points to the lead score based on holiday tier and proximity (within 3 days = full boost, within 21 days = 25% boost).

**Impact:** Hot leads near premium holidays now surface at the top of the inquiry list. No DB changes.

---

## Gap 2 — One-Click Outreach Send (was copy-paste only)

**Files:**

- [lib/holidays/outreach-actions.ts](../lib/holidays/outreach-actions.ts) — new `sendHolidayOutreachToClient()` action
- [components/dashboard/holiday-outreach-panel.tsx](../components/dashboard/holiday-outreach-panel.tsx) — Send button per client

Each past client in the holiday outreach panel now has a **Send** button that opens an inline form:

- Channel toggle: Email / SMS
- Editable message (pre-filled with the holiday outreach hook)
- Submit → calls `sendDirectOutreach` → logs to `direct_outreach_log` → shows "Sent" confirmation

The friction went from: copy message → open email → find client → paste → send
To: click Send → confirm → done.

---

## Gap 3 — Promo Code Quick-Create (was missing entirely)

**Files:**

- [lib/holidays/outreach-actions.ts](../lib/holidays/outreach-actions.ts) — new `createHolidayPromoCode()` action
- [components/dashboard/holiday-outreach-panel.tsx](../components/dashboard/holiday-outreach-panel.tsx) — inline promo form per holiday

Each expanded holiday now has a **Create Promo Code** section with:

- Auto-generated code (e.g., `THANKSGIVING26`) — editable
- Discount % field (default 10%)
- Expiry date (defaults to day after holiday)
- Creates via the existing `client_incentives` table with `target_client_id = null` (open to any client)
- Displays the created code for sharing

No new DB migrations — uses the existing voucher/incentive infrastructure.

---

## Gap 4 — Automated Post-Event Review Requests

**Files:**

- [supabase/migrations/20260321000002_review_request_tracking.sql](../supabase/migrations/20260321000002_review_request_tracking.sql) — additive migration
- [app/api/scheduled/lifecycle/route.ts](../app/api/scheduled/lifecycle/route.ts) — Section 7 added

**Migration:** Adds `review_request_sent_at TIMESTAMPTZ` column to `events` (nullable, defaults to NULL). Purely additive, zero data risk.

**Cron logic (Section 7):** Runs on every lifecycle cron tick. Finds events where:

- `status = 'completed'`
- `event_date` between 3 and 10 days ago
- `review_request_sent_at IS NULL`
- Chef hasn't disabled client emails
- Client hasn't opted out

Sends a warm, personal template email (no AI — the cron has no chef auth context). Marks `review_request_sent_at` to prevent duplicates.

Chefs can still trigger the AI-crafted version manually from any event detail page. Automated = simple and fast; manual = personalized and polished.

---

## Gap 5 — Year-Over-Year Holiday Analytics

**Files:**

- [lib/analytics/seasonality.ts](../lib/analytics/seasonality.ts) — new `getHolidayYearOverYear()` function
- [components/analytics/holiday-yoy-table.tsx](../components/analytics/holiday-yoy-table.tsx) — new component
- [app/(chef)/analytics/demand/page.tsx](<../app/(chef)/analytics/demand/page.tsx>) — wired in below the heatmap

For each high-relevance holiday (Thanksgiving, Valentine's Day, Mother's Day, Christmas, NYE, etc.), shows 3 years of data side-by-side:

- Event count per year
- Total revenue per year
- Trend icon: up ↑ / down ↓ / new ✦ / flat —

Window: ±21 days around each holiday. Sorted by total lifetime revenue (most valuable holidays first).

Visible at: `/analytics/demand` (scroll below the heatmap).

---

## Gap 6 — Automated Holiday Campaign Drafts

**Files:**

- [lib/marketing/holiday-campaign-actions.ts](../lib/marketing/holiday-campaign-actions.ts) — new file
- [app/api/scheduled/sequences/route.ts](../app/api/scheduled/sequences/route.ts) — wired into daily sequences cron

**What it does:** Every day when the sequences cron fires, it checks all upcoming holidays entering their outreach window (high-relevance only, within 45 days). For each chef who:

- Has subscribed clients
- Doesn't already have a campaign for that holiday this season

It creates a **draft campaign** using the "Holiday Availability" system template, pre-targeting all subscribed clients. Then sends the chef a system notification: "Thanksgiving outreach draft ready — waiting in your Marketing tab."

The chef opens Marketing, reviews the draft, edits if they want, and hits Send. The system does the prep; the chef makes the final call.

**AI Policy compliance:** This is fully compliant — system drafts, chef approves, nothing auto-sends.

---

## Architecture Notes

- `sendHolidayOutreachToClient` wraps `sendDirectOutreach` (reuses all existing email/SMS/logging infrastructure)
- `createHolidayPromoCode` wraps `createVoucherOrGiftCard` (reuses existing incentive system)
- Holiday campaign drafts use the existing `marketing_campaigns` table with `status: 'draft'`
- Review request dedup uses the same pattern as `payment_reminder_*d_sent_at` columns (established in migration 20260228000006)
- `getHolidayYearOverYear()` is a pure read — no DB writes, no external calls

---

## What's Still Fully Manual (by design)

- Review platform choice (Google, Yelp, Instagram) — AI can suggest, chef decides
- Campaign edits before send — chef owns the final message
- Promo code % and expiry — chef's call
- 1:1 outreach message editing — chef can always change the hook before sending
