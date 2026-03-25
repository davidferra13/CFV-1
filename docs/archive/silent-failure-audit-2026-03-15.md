# Silent Failure Audit - 2026-03-15

## Summary

Comprehensive audit of agent-orchestrated codebase for silent failures: errors that occur without surfacing to users, monitoring, or logs. Four parallel scans covered:

1. **Error swallowing in catch blocks** (server actions, components)
2. **Cron/scheduled task failure handling** (21 routes)
3. **Cache invalidation gaps** (6 unstable_cache tags)
4. **@ts-nocheck exports and no-op handlers**

## Tier 1 Fixes Applied (this commit)

| #   | File                                        | Fix                                                                                                                                                                   |
| --- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `lib/quotes/actions.ts`                     | Email/activity failures now surface via `warnings` array in return value. Callers can show toast.                                                                     |
| 2   | `app/api/webhooks/twilio/route.ts`          | Message insert now checks `{ error }` return and logs with context (from, sid, tenant).                                                                               |
| 3   | `app/api/scheduled/call-reminders/route.ts` | Both 24h and 1h `sent_at` DB updates now check error return. On failure: logs explicit warning about potential re-send, increments error count instead of sent count. |
| 4   | `app/api/scheduled/rsvp-reminders/route.ts` | Log status updates now check error return and log failures with context about potential duplicates.                                                                   |
| 5   | `app/api/demo/tier/route.ts`                | Added `revalidateTag('chef-layout-{id}')` after subscription_status update. Cache no longer serves stale tier for 60s.                                                |
| 6   | `lib/archetypes/actions.ts`                 | Added `revalidateTag('chef-archetype-{id}')` after archetype selection. Dashboard/documents update immediately.                                                       |
| 7   | `app/(chef)/cannabis/layout.tsx`            | Replaced `.catch(() => false)` with explicit try/catch that logs the actual error before denying access.                                                              |

## Remaining Tier 1 Items (verified as non-issues)

- **Stripe gift card idempotency**: Already has proper early return (line 259-264). Audit finding was incorrect.
- **Resend webhook**: Already has error handling with 500 return (lines 126-137). Audit finding was incorrect.

## Tier 2: Silent Failure Monitor (built in this commit)

### New files created

| File                                                           | Purpose                                                           |
| -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `database/migrations/20260401000064_side_effect_failures.sql`  | New table for structured failure capture                          |
| `lib/monitoring/non-blocking.ts`                               | `nonBlocking()` wrapper + `recordSideEffectFailure()` utility     |
| `lib/monitoring/failure-actions.ts`                            | Server actions for the admin dashboard (read, dismiss, summarize) |
| `app/(admin)/admin/silent-failures/page.tsx`                   | Admin dashboard page with severity cards + source breakdown       |
| `app/(admin)/admin/silent-failures/silent-failures-client.tsx` | Client component: failure table with dismiss buttons              |
| `app/(admin)/admin/silent-failures/loading.tsx`                | Skeleton loading state                                            |
| `components/admin/admin-sidebar.tsx`                           | Added "Silent Failures" nav item with ShieldAlert icon            |

### Retrofitted patterns (5 critical paths now write to side_effect_failures)

1. `lib/ledger/append.ts` - Financial activity log failures
2. `lib/aar/actions.ts` - AAR activity log failures
3. `lib/quotes/actions.ts` - Quote email delivery failures
4. `app/api/webhooks/twilio/route.ts` - Inbound message storage failures
5. `app/api/scheduled/lifecycle/route.ts` - Quote expiry notification failures

### Migration details

**Table:** `side_effect_failures` (additive only, no existing tables affected)

Columns: id, created_at, source, operation, severity, entity_type, entity_id, tenant_id, error_message, context (jsonb), dismissed_at, dismissed_by

Indexes: recent undismissed (for dashboard), per-tenant (for per-chef queries)

RLS: enabled, service role full access.

**Apply with:** `drizzle-kit push` (after backup)

## Tier 3 Recommendations (not yet built)

### 1. Side effect failure tracking table

Create a `side_effect_failures` table to replace console.error-only patterns. Schema:

```sql
CREATE TABLE side_effect_failures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  source text NOT NULL,        -- 'lifecycle-cron', 'quote-transition', etc.
  operation text NOT NULL,     -- 'send_email', 'update_sent_at', etc.
  entity_type text,            -- 'quote', 'call', 'rsvp', etc.
  entity_id text,
  error_message text,
  context jsonb DEFAULT '{}'
);
```

### 2. Cron routes: return 500 on total failure

Currently all cron routes return 200 even when every operation fails. The `monitor/route.ts` explicitly comments "Return 200 even if unhealthy." External monitors (Vercel cron, uptime checks) can't detect failures.

Fix: Return 500 when `errors.length > 0 && successCount === 0`.

### 3. Replace `.catch(() => [])` with error states

14+ admin/analytics pages use `.catch(() => [])` which makes fetch failures look like "no data." Each needs a proper error boundary or error state component.

### 4. Non-blocking side effect wrapper

Create a utility that wraps non-blocking operations with structured logging:

```ts
async function nonBlocking(label: string, fn: () => Promise<void>) {
  try {
    await fn()
  } catch (err) {
    console.error(`[non-blocking:${label}]`, err)
    await recordSideEffectFailure(label, err) // writes to side_effect_failures table
  }
}
```

## Tier 3 Recommendations (monitoring layer)

1. `/admin/silent-failures` dashboard reading from `side_effect_failures`
2. Cron health check that alerts on missed heartbeats (not just HTTP 200)
3. CI lint rule to flag new `.catch(() => {})` and `.catch(() => [])` patterns

## Full Findings

### Critical (6)

- Quote email fails silently, chef sees success (FIXED)
- Ledger activity log drops without trace
- Cron routes always return 200
- Lifecycle cron: notification sent, reschedule write unprotected
- Call reminders: email sent, sent_at update unprotected (FIXED)
- isAdmin() fails to false silently (FIXED)

### High (12)

- Kiosk session logs lost via `.catch(() => {})`
- Twilio inbound SMS insert unprotected (FIXED)
- Stripe partial state (ledger writes, notification fails)
- Demo tier cache stale for 60s (FIXED)
- Archetype cache stale for 60s (FIXED)
- Resend webhook tracking (verified as already handled)
- Simulation fire-and-forget
- Beta survey pages crash if tables missing
- Wix TOCTOU race condition
- Revenue goal snapshot empty catch
- Morning briefing alert insert failures silent
- AAR activity trail gaps

### Medium (14)

- 14+ analytics pages return [] on fetch failure
- Remy activity tracker returns null on error
- Weather/travel-time silent null fallback
- Follow-up email failures untracked in cron
- Wellbeing signals hardcode fallback
- Wix submission result shape unvalidated
- RSVP reminder log update unprotected (FIXED)
- Campaign recipient tracking silent
- Packing list confirmation empty .catch()
- Breadcrumb tracker fire-and-forget
- Kiosk config fetch null fallback
- 12+ server actions with console.error only
