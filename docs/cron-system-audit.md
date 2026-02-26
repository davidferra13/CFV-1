# Cron System Audit & Improvement

**Date:** 2026-02-19
**Branch:** feature/packing-list-system
**Scope:** Full audit of all scheduled/cron jobs + gap closure

---

## Post-Implementation Grade: A-

Two defects found and corrected after initial implementation (see fixes below).

---

## What Was Audited

Every line of scheduling-related code in the project:

- All 16 files under `app/api/scheduled/` and `app/api/gmail/sync/`
- `vercel.json` cron registry
- `supabase/config.toml` (no cron section found)
- All SQL migrations (no `pg_cron` or `pg_net` usage)
- All `.ts`/`.tsx` references to `cron`, `schedule`, `setInterval`, and `CRON_SECRET`
- All imported functions from each scheduled route (verified to exist)

---

## Pre-Audit State

### Grade: B+

15 cron jobs registered in `vercel.json`, all fully implemented — zero stubs. All 39+ imported functions resolve to existing code. Consistent auth pattern (`CRON_SECRET` bearer token), tenant scoping, and failure isolation throughout.

---

## Bugs Found

### CRITICAL: `activity-cleanup` not scheduled

The route `app/api/scheduled/activity-cleanup/route.ts` was fully implemented but **missing from `vercel.json`**. It would never run. Without it, the `activity_events` table grows unbounded, degrading query performance over time.

**Fix:** Added to `vercel.json` at `0 2 * * *` (daily at 2 AM UTC).

### Defect: GET handler auth inconsistency in `activity-cleanup`

The `GET` handler used a weaker auth check (`if (cronSecret && ...)`) that allowed unauthenticated access if `CRON_SECRET` was missing from env. Fixed to match the `POST` handler pattern: fail with 500 if secret is missing, 401 if header is wrong.

### Defect: Unused variable in `waitlist-sweep`

The `occasion` variable was declared but not used in the notification body. Fixed to include the occasion in the message (e.g. "2026-07-04 for your birthday dinner appears to be open").

---

## Missing Cron Jobs Added

### 1. `loyalty-expiry` — Daily at 1 AM UTC

**File:** `app/api/scheduled/loyalty-expiry/route.ts`
**Schedule:** `0 1 * * *`

**What it does:**

- Sets `is_active = false` on `client_incentives` (vouchers + gift cards) where `expires_at < NOW()` and `is_active = true`
- Sets `status = 'expired'` on `waitlist_entries` where `expires_at < NOW()` and `status = 'waiting'`

**Why it matters:** Without this, expired vouchers remain redeemable past their expiry date. Clients could redeem a 3-month-old expired gift card. Chefs would have to honor it or manually hunt for and deactivate expired records.

**Tables touched:** `client_incentives`, `waitlist_entries`

---

### 2. `waitlist-sweep` — Daily at 8 AM UTC

**File:** `app/api/scheduled/waitlist-sweep/route.ts`
**Schedule:** `0 8 * * *`

**What it does:**

- Queries all `waitlist_entries` with `status = 'waiting'` and a future `requested_date`
- For each entry, checks if the requested date has an `is_event_auto = true` block in `chef_availability_blocks` (meaning a confirmed event occupies the date)
- If no block exists (date may be open): sends an in-app notification to the client and updates `status = 'contacted'`, `contacted_at = NOW()`
- Deduplication: only notifies if `contacted_at IS NULL` or `contacted_at < 7 days ago`
- Processes up to 200 entries per run

**Why it matters:** The waitlist feature is functionally dead without this. Clients sign up for a date and hear nothing. This makes the waitlist actually work — clients get notified the morning after a date opens up.

**Tables touched:** `waitlist_entries`, `chef_availability_blocks`, `user_roles` (read), `notifications` (insert via createNotification)

---

### 3. `push-cleanup` — Daily at 4 AM UTC

**File:** `app/api/scheduled/push-cleanup/route.ts`
**Schedule:** `0 4 * * *`

**What it does (two jobs):**

Push subscription hygiene:

- Deactivates `push_subscriptions` where `failed_count >= 5` and still `is_active = true` (ensures consistency with the send path which deactivates on 5 failures)
- Hard-deletes subscriptions where `is_active = false` and `updated_at < 90 days ago`

SMS send log cleanup:

- Deletes `sms_send_log` rows older than 48 hours (rate-limit windows that have expired)
- The migration comment on `sms_send_log` says "cleaned up by the activity-cleanup cron" but `activity-cleanup/route.ts` explicitly skips this. This cron now owns that cleanup.

**Why it matters:** Without push cleanup, dead subscriptions (from uninstalled browsers, revoked permissions) accumulate. Every push send attempts all active subscriptions, so dead ones add latency. Without SMS log cleanup, the rate-limit table grows unbounded.

**Tables touched:** `push_subscriptions`, `sms_send_log`

---

## Changes to `vercel.json`

Added 4 new cron entries after the existing 15:

```json
{ "path": "/api/scheduled/activity-cleanup", "schedule": "0 2 * * *" },
{ "path": "/api/scheduled/loyalty-expiry",   "schedule": "0 1 * * *" },
{ "path": "/api/scheduled/waitlist-sweep",   "schedule": "0 8 * * *" },
{ "path": "/api/scheduled/push-cleanup",     "schedule": "0 4 * * *" }
```

**Total crons after this change: 19**

---

## Final Cron Schedule (All 19)

| Schedule       | Path                                | Purpose                                            |
| -------------- | ----------------------------------- | -------------------------------------------------- |
| `*/5 * * * *`  | `/api/gmail/sync`                   | Gmail inbox sync                                   |
| `*/5 * * * *`  | `/api/scheduled/integrations/pull`  | Process pending integration events                 |
| `*/5 * * * *`  | `/api/scheduled/wix-process`        | Retry failed Wix submissions                       |
| `*/5 * * * *`  | `/api/scheduled/social-publish`     | Fire queued social posts                           |
| `*/15 * * * *` | `/api/scheduled/automations`        | Evaluate time-based automation rules               |
| `*/15 * * * *` | `/api/scheduled/copilot`            | Ops copilot per tenant                             |
| `*/15 * * * *` | `/api/scheduled/email-history-scan` | Historical Gmail scan batch                        |
| `*/30 * * * *` | `/api/scheduled/call-reminders`     | 24h and 1h call reminder emails                    |
| `0 * * * *`    | `/api/scheduled/integrations/retry` | Retry failed integration events                    |
| `0 * * * *`    | `/api/scheduled/campaigns`          | Fire scheduled marketing campaigns                 |
| `0 1 * * *`    | `/api/scheduled/loyalty-expiry`     | NEW — Expire overdue vouchers + waitlist entries   |
| `0 2 * * *`    | `/api/scheduled/activity-cleanup`   | WAS MISSING — Clean aged activity_events           |
| `0 3 * * *`    | `/api/scheduled/lifecycle`          | Expire inquiries/quotes, event/payment reminders   |
| `0 4 * * *`    | `/api/scheduled/push-cleanup`       | NEW — Clean dead push subscriptions + SMS log      |
| `0 6 * * *`    | `/api/scheduled/sequences`          | Process marketing sequences + birthday enrollments |
| `0 8 * * *`    | `/api/scheduled/waitlist-sweep`     | NEW — Notify waitlist clients when dates open      |
| `0 */6 * * *`  | `/api/scheduled/revenue-goals`      | Goal snapshots + nudge notifications               |
| `0 */6 * * *`  | `/api/scheduled/follow-ups`         | Overdue inquiry follow-up reminders                |
| `0 */6 * * *`  | `/api/scheduled/reviews-sync`       | Sync external review sources                       |

---

## What Was NOT Added (and why)

| Idea                            | Reason Deferred                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notification delivery retry     | `notification_delivery_log` is immutable by design; email channel not routed through it; push retries handled inline; no practical retry layer exists without a job queue |
| Recurring services auto-booking | Requires careful schema review + financial logic before automating event creation                                                                                         |
| Calendar sync (external)        | Complex OAuth flow; partial implementation carries risk                                                                                                                   |
| Staff shift conflict detection  | Low urgency; no active staff booking conflicts today                                                                                                                      |
| Equipment health tracking       | Nice-to-have; no chef-reported pain around it                                                                                                                             |
| Professional dev cert reminders | Low urgency; quarterly/annual check sufficient                                                                                                                            |
| Tax checkpoints                 | Low urgency; already visible in tax workflow UI                                                                                                                           |
| Social feed ranking             | Feed is functional without it; pure enhancement                                                                                                                           |

---

## Verification

After deploying:

1. **Vercel dashboard** → Settings → Crons → confirm 19 entries visible
2. **Manual trigger test** for each new route:

```sh
curl -X POST https://your-domain.com/api/scheduled/activity-cleanup \
  -H "Authorization: Bearer <CRON_SECRET>"
curl -X POST https://your-domain.com/api/scheduled/loyalty-expiry \
  -H "Authorization: Bearer <CRON_SECRET>"
curl -X POST https://your-domain.com/api/scheduled/waitlist-sweep \
  -H "Authorization: Bearer <CRON_SECRET>"
curl -X POST https://your-domain.com/api/scheduled/push-cleanup \
  -H "Authorization: Bearer <CRON_SECRET>"
```

1. **Loyalty expiry test:** Set a `client_incentives` row's `expires_at` to yesterday, run the cron, confirm `is_active` flips to `false`
1. **Waitlist sweep test:** Create a `waitlist_entries` row for a future date with no event on that date, run the cron, confirm `status = 'contacted'` and an in-app notification exists
1. **Push cleanup test:** Set a `push_subscriptions` row to `is_active = false` with `updated_at > 90 days`, run the cron, confirm the row is deleted
