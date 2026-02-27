# Daily Report + Real-Time Visitor Alerts

**Implemented:** 2026-02-26
**Status:** Complete

## Daily Report

### What It Does

- Generates a comprehensive daily business snapshot covering 13 metric categories
- Emailed every morning at 7 AM ET (11 UTC) via Vercel Cron
- Viewable as an app page at `/analytics/daily-report` with date navigation

### What's In The Report

1. **Today's Schedule** — events with client, time, guest count
2. **Revenue** — today's payments, MTD, month-over-month %, outstanding balance
3. **Pipeline** — new inquiries, unread, awaiting response, expiring quotes, stale follow-ups
4. **Operations** — avg response time, overdue responses, food cost trend, closure streak
5. **Client Activity** — yesterday's portal logins, high-intent visits (payment page, quote/proposal views)
6. **Schedule Conflicts** — multi-event days in the next 30 days
7. **Client Milestones** — upcoming birthdays/anniversaries (14-day lookahead)
8. **Dormant Clients** — clients quiet for 90+ days
9. **Action Items** — inquiries needing response
10. **Pipeline Forecast** — expected revenue from pending quotes

### Key Files

| File                                                   | Purpose                              |
| ------------------------------------------------------ | ------------------------------------ |
| `supabase/migrations/20260326000012_daily_reports.sql` | Table definition                     |
| `lib/reports/types.ts`                                 | TypeScript types                     |
| `lib/reports/compute-daily-report.ts`                  | Compute function (no `'use server'`) |
| `lib/reports/daily-report-actions.ts`                  | Server actions                       |
| `lib/email/templates/daily-report.tsx`                 | Email template                       |
| `app/api/scheduled/daily-report/route.ts`              | Cron endpoint                        |
| `app/(chef)/analytics/daily-report/page.tsx`           | App page                             |
| `components/reports/daily-report-view.tsx`             | UI component                         |

### Cron Schedule

- Path: `/api/scheduled/daily-report`
- Schedule: `0 11 * * *` (7 AM ET)
- Auth: `Bearer ${CRON_SECRET}`

---

## Real-Time Visitor Alerts

### What It Does

- Sends instant email + push notification when a client visits the portal
- Debounced: one alert per client per 30-minute session
- Only triggers on high-signal events: `portal_login`, `payment_page_visited`, `proposal_viewed`, `quote_viewed`
- High-intent events (payment page, quote/proposal views) are flagged with extra urgency

### How It Works

1. Client visits portal → `ActivityTracker` fires → `trackActivity()` records the event
2. `trackActivity()` calls `triggerVisitorAlert()` as a non-blocking side effect
3. `triggerVisitorAlert()` checks debounce (30-min window) and chef preference
4. If clear, dispatches via `sendNotification()` → channel router → email + push + in-app

### Key Files

| File                                                               | Purpose                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| `lib/activity/visitor-alert.ts`                                    | Debounce + dispatch logic                                     |
| `lib/activity/track.ts`                                            | Integration point (fires visitor alert after activity INSERT) |
| `lib/email/templates/client-visit-alert.tsx`                       | Email template                                                |
| `lib/notifications/types.ts`                                       | `client_portal_visit` action type                             |
| `supabase/migrations/20260326000013_visitor_alerts_preference.sql` | Chef preference column                                        |

### Disabling

- Chef can set `visitor_alerts_enabled = false` in `chef_preferences`
- Default: enabled (true)
- Also controlled by the notification category toggles (falls under "Clients" category)

### Tier

Both features are **Free tier** — they aggregate existing data that chefs already have access to.
