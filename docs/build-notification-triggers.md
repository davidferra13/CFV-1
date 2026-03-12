# Build: Operations Notification Triggers (#36)

**Date:** 2026-03-12
**Branch:** `feature/risk-gap-closure`
**Roadmap Item:** #36 Notification Triggers (build order #10)

## What Changed

Built a proactive operations alert system that fires deterministic notifications for equipment maintenance, dietary accommodations, and stale data cleanup.

### New Files

1. **`lib/operations/proactive-alerts.ts`** - Three check functions:
   - `checkEquipmentMaintenance()` - Scans `equipment_items` table for items approaching or past their maintenance schedule (7-day warning). Compares `last_maintained_at + maintenance_interval_days` against today.
   - `checkDietaryAccommodations()` - Finds events in the next 7 days with dietary restrictions or allergies. Reminds chefs to confirm menu accommodations.
   - `checkStaleData()` - Weekly digest (Mondays only) flagging: clients missing email, past events stuck in draft, inquiries unanswered 14+ days.

2. **`app/api/scheduled/operations-check/route.ts`** - Daily cron (7 AM UTC):
   - Runs all three checks in parallel
   - Deduplicates via `ops_dedupe_key` in notification metadata (24h for equipment/dietary, 7d for stale digest)
   - Records heartbeat via `recordCronHeartbeat`
   - Follows existing cron patterns (verifyCronAuth, admin client, recipient cache)

### Modified Files

- **`lib/notifications/types.ts`** - Added 3 notification actions: `equipment_maintenance_due`, `dietary_accommodation_check`, `stale_data_digest` with config entries
- **`vercel.json`** - Added daily cron schedule at `0 7 * * *`
- **`app/api/scheduled/monitor/route.ts`** - Added `operations-check` to health monitor (2880 min max interval)

## Design Decisions

- **No AI** - Pure database queries and date math. Formula > AI.
- **Non-blocking** - Each check is wrapped in `.catch()` so a single failure doesn't block others.
- **Deduplication** - Uses `metadata.ops_dedupe_key` in notifications table to prevent spam. Equipment/dietary: 24h window. Stale digest: 7-day window.
- **Monday-only digest** - Stale data check runs only on Mondays to avoid notification fatigue.
- **Admin client** - Uses `SUPABASE_SERVICE_ROLE_KEY` directly (not session-based) since this is a cron job scanning all tenants.

## Architecture

```
vercel.json cron (daily 7 AM)
  → /api/scheduled/operations-check
    → checkEquipmentMaintenance() → equipment_items table
    → checkDietaryAccommodations() → events + clients tables
    → checkStaleData() (Mon only) → clients, events, inquiries tables
    → deduplicate via notifications metadata
    → createNotification() → in-app + email/push routing
    → recordCronHeartbeat()
```

## Existing Infrastructure Leveraged

- `lib/notifications/actions.ts` createNotification + channel routing
- `lib/auth/cron-auth.ts` verifyCronAuth
- `lib/cron/heartbeat.ts` recordCronHeartbeat
- `app/api/scheduled/monitor/route.ts` health monitoring
- Existing cert/insurance renewal alerts in `app/api/cron/renewal-reminders/route.ts` (similar pattern)
