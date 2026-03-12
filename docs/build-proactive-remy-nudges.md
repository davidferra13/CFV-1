# Build: Proactive Remy Nudges (#43)

**Date:** 2026-03-12
**Branch:** `feature/risk-gap-closure`
**Roadmap Item:** #43 Proactive Chef Nudges (build order #16)

## What Changed

Wired up the Remy proactive alert engine to a scheduled cron and merged persistent alerts into the nudge UI. Added client anniversary nudges and persistent dismiss.

### What Already Existed

- `lib/ai/remy-proactive-alerts.ts` - 7-rule alert engine (prep, grocery, overdue invoices, stale inquiries, payments, birthdays, weather) with `runAlertRules()` that persists to `remy_alerts` table with 24h deduplication
- `lib/ai/reminder-actions.ts` - Ephemeral nudge generator with 4 types (stale inquiries, prep reminders, follow-ups, dormant clients)
- `lib/hooks/use-remy-proactive-alerts.ts` - Client-side hook, refreshes every 3 min, sessionStorage dismiss
- `components/ai/remy-drawer.tsx` - Already renders up to 3 nudge cards with dismiss + action buttons
- `vercel.json` - Already had `/api/cron/remy-alerts` registered at `0 * * * *` (hourly) but route file was missing

### New Files

1. **`app/api/cron/remy-alerts/route.ts`** - Hourly cron that runs `runAlertRules()` for every active chef. Iterates all chefs, persists alerts to `remy_alerts` table, records heartbeat. Standard cron pattern (verifyCronAuth, recordCronHeartbeat/Error).

### Modified Files

2. **`lib/ai/reminder-actions.ts`** (enhanced):
   - Added **client anniversary nudges** (step 5): finds events from exactly 1 year ago this week, nudges chef to celebrate the milestone
   - Added **persistent alert merge** (step 6): reads undismissed `remy_alerts` rows and converts them into `RemyNudge` objects with proper action links. Deduplicates against ephemeral nudges by entity ID.
   - Fixed **`dismissNudge()`**: now persists dismissals to `remy_alerts.dismissed_at` for alerts that came from the cron engine (identified by `alert-` prefix). Ephemeral nudges still use sessionStorage.
   - Expanded `RemyNudge.type` union to include all persistent alert types
   - Added `persistentAlertId` field so the UI can identify persistent vs ephemeral nudges
   - Fixed em dashes in message text

3. **`app/api/scheduled/monitor/route.ts`** - Added `'remy-alerts': 120` to monitor intervals (hourly cron, alert if stale > 2h)

## How It Works

```
Cron (hourly)                    User opens Remy drawer
    |                                    |
    v                                    v
runAlertRules()              getProactiveNudges()
    |                                    |
    v                           ┌--------┴--------┐
remy_alerts table          Ephemeral checks    Read remy_alerts
(7 rule types,             (stale inquiries,   (undismissed rows)
 24h dedup)                 prep, follow-up,        |
                            dormant, anniv.)        |
                                    |               |
                                    v               v
                                 Merge + deduplicate
                                         |
                                         v
                                  Sort by priority
                                         |
                                         v
                              Display up to 3 cards
                              (dismiss persists for
                               cron-generated alerts)
```

## Nudge Types (Complete List)

| Source    | Type                    | Trigger                           | Priority           |
| --------- | ----------------------- | --------------------------------- | ------------------ |
| Ephemeral | stale_inquiry           | Inquiry >48h no response          | High               |
| Ephemeral | prep_reminder           | Event in <3 days                  | High/Medium        |
| Ephemeral | follow_up               | Event completed in last 7 days    | Medium             |
| Ephemeral | re_engagement           | Client dormant 90+ days           | Low                |
| Ephemeral | follow_up (anniversary) | First event 1 year ago this week  | Medium             |
| Cron      | missing_prep_list       | Event <48h, no prep list          | Urgent/High        |
| Cron      | missing_grocery_list    | Event tomorrow, no grocery list   | Urgent             |
| Cron      | overdue_invoice         | Invoice 7+ days past due          | High/Urgent        |
| Cron      | stale_inquiry           | Inquiry 2+ days no response       | Normal/High        |
| Cron      | payment_received        | Payment in last hour              | Normal             |
| Cron      | client_birthday         | Birthday within 7 days            | High/Low           |
| Cron      | weather_warning         | Severe weather for upcoming event | Urgent/High/Normal |

## Design Decisions

- **No new migration**: `remy_alerts` table already existed, just needed the cron to populate it
- **Merged two systems**: Rather than rebuilding, enhanced the ephemeral nudge system to also read persistent alerts. Both coexist without conflict.
- **Deduplication at two levels**: Cron deduplicates at write time (24h window per alert type + entity). UI deduplicates at read time (skips persistent alerts if ephemeral nudge already covers same entity).
- **Dismiss persistence**: Only persistent (cron-generated) alerts get server-side dismissal. Ephemeral nudges reset on new sessions, which is correct since conditions may change.
- **Formula > AI**: Entire system is pure SQL queries + conditional logic. Zero LLM involvement.
