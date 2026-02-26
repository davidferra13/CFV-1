# Cron Monitoring System

## What Was Added

| File                                                     | Purpose                                                     |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| `supabase/migrations/20260306000002_cron_executions.sql` | `cron_executions` table                                     |
| `lib/cron/heartbeat.ts`                                  | `recordCronHeartbeat()` utility                             |
| `app/api/scheduled/monitor/route.ts`                     | Monitor endpoint                                            |
| `vercel.json`                                            | Added monitor to cron schedule (every 30 min past the hour) |

## The Problem

18 scheduled cron jobs run on Vercel. Before this change, there was no way to know if any of them were failing silently. A cron that:

- Hits a Vercel function timeout (25s limit)
- Swallows an exception in a try/catch
- Fails to connect to the database
- Is misconfigured in vercel.json

...would simply not run, with no alert, no log, and no way to detect it from outside.

## How It Works

**Step 1 — Heartbeat:** Each cron calls `recordCronHeartbeat('cron-name', result)` at the end of its handler, just before returning. This inserts a row into `cron_executions`:

```
id           | uuid
cron_name    | 'lifecycle'
executed_at  | 2026-03-06T03:00:15Z
status       | 'success'
duration_ms  | 4231
result       | { inquiriesExpired: 2, quotesExpired: 0, ... }
```

**Step 2 — Monitor:** The monitor route (`/api/scheduled/monitor`) runs every 30 minutes. It queries `cron_executions` for the latest heartbeat per cron name, then compares it to the expected interval × 2.

Example: `lifecycle` runs at 3 AM daily. Expected interval = 1440 minutes. Alert threshold = 2880 minutes (48 hours). If the last heartbeat is older than 48 hours, the cron is flagged as `stale`.

**Step 3 — Response:** The monitor returns a JSON summary. If any cron is `stale` or `missing`, it logs to `console.error` which can be surfaced in Vercel logs or an observability tool.

## Cron Names (match monitor config)

| Cron                | Name Used in Heartbeat                            |
| ------------------- | ------------------------------------------------- |
| Lifecycle reminders | `lifecycle`                                       |
| Follow-ups          | `follow-ups`                                      |
| Revenue goals       | `revenue-goals`                                   |
| Loyalty expiry      | `loyalty-expiry`                                  |
| Activity cleanup    | `activity-cleanup`                                |
| Push cleanup        | (not yet wired — add following the pattern below) |
| Gmail sync          | (not yet wired)                                   |
| ...and 11 more      | (not yet wired)                                   |

## Adding Heartbeat to Remaining Crons

All 5 critical crons have heartbeats. The remaining 13 can be wired following this pattern:

```typescript
// 1. Import at top of route file
import { recordCronHeartbeat } from '@/lib/cron/heartbeat'

// 2. Build result object
const result = { processed: 5, skipped: 1, errors: [] }

// 3. Call before return (replace the existing return)
await recordCronHeartbeat('cron-name', result)
return NextResponse.json(result)
```

The cron name must match a key in `CRON_EXPECTED_INTERVALS` in `app/api/scheduled/monitor/route.ts`. If the name is missing from that map, the monitor will show it as `missing`.

## Auto-Cleanup

The `cron_executions` table auto-purges rows older than 30 days via an INSERT trigger. No separate cleanup cron is needed.

## Testing

1. Manually call a cron route with the correct `Authorization: Bearer <CRON_SECRET>` header
2. Query `SELECT * FROM cron_executions ORDER BY executed_at DESC LIMIT 10`
3. Manually call `/api/scheduled/monitor` — verify the cron appears as `ok`
4. To test stale detection: temporarily set `executed_at` on a row to an old timestamp and re-run the monitor
