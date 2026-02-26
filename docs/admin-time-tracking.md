# Admin Time Tracking

## What Changed

Extended the time tracking system beyond the 5 on-site event phases (shopping / prep / travel / service / reset) to include administrative overhead — the emails, calls, planning sessions, and bookkeeping that are real labor but previously invisible to the system.

## Why

The existing effective hourly rate calculation (`profit ÷ on-site hours`) was systematically overstating the chef's true hourly rate by ignoring all the business time surrounding events. A chef doing $1,000 for 5 on-site hours looks like $200/hr — but if they spent 3 hours sourcing, 2 hours planning, and 1 hour on emails for that event, the true rate is closer to $91/hr. Without this data, pricing decisions are made on false signals.

## What Was Built

### Database

**Migration:** `supabase/migrations/20260303000007_admin_time_tracking.sql`

**`admin_time_logs`**

- `category` enum: `email | calls | planning | bookkeeping | marketing | sourcing | travel_admin | other`
- `log_date` + `minutes` (not hours — finer granularity)
- `notes` — optional description
- `event_id` — optional FK; when set, this admin time is included in event-level total time calculations

### Server Actions

**File:** `lib/admin-time/actions.ts`

| Action                                    | What                                           |
| ----------------------------------------- | ---------------------------------------------- |
| `logAdminTime(input)`                     | Create a time log entry                        |
| `deleteAdminTimeLog(id)`                  | Remove an entry                                |
| `getAdminTimeForPeriod(start, end)`       | Range query with category breakdown            |
| `getAdminTimeThisWeek()`                  | Convenience: Mon–Sun current week              |
| `getAdminTimeForEvent(eventId)`           | Total admin minutes linked to a specific event |
| `getMonthlyAdminTimeSummary(year, month)` | Monthly aggregate for insights                 |

### UI

- **`app/(chef)/insights/time-analysis/page.tsx`** — Weekly and monthly admin time totals, category breakdown bar chart, recent log list, and a quick-add form.
- **`app/(chef)/insights/time-analysis/admin-time-log-form.tsx`** — Hours + minutes entry (separate fields to avoid decimal confusion).

## Event Linkage

Entries with an `event_id` can be aggregated with `getAdminTimeForEvent()` to produce a true total time for an event:

```
True event time = shopping_minutes + prep_minutes + travel_minutes
                + service_minutes + reset_minutes + admin_minutes_linked
```

Dividing event profit by true total hours gives the real effective hourly rate.

## Future Considerations

- Dashboard widget: "Admin hours this week" next to "Event hours this week"
- Timer mode: start/stop button for real-time admin time capture (like the existing event phase timer)
- Trend chart: admin overhead as % of total time per month — a rising % signals the business is becoming harder to run
- Integrate with the existing `time-tracking.ts` module for a unified "all time" view
