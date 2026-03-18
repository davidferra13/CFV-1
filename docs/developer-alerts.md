# Developer Alert System

Automated email notifications for system health, sent to `DFPrivateChef@gmail.com` via Resend.

## Two Channels

### 1. Immediate Alerts (real-time, rate-limited)

Triggered automatically when critical events occur. Each service is rate-limited to 1 email per 15 minutes to prevent spam.

| Trigger                      | Severity  | Rate-limit key                          | What fires it                                    |
| ---------------------------- | --------- | --------------------------------------- | ------------------------------------------------ |
| Circuit breaker opens        | `error`   | Service name (e.g., `stripe`, `resend`) | `lib/resilience/circuit-breaker.ts` transition() |
| Cron job fails               | `warning` | `cron-{cronName}`                       | `lib/cron/heartbeat.ts` recordCronError()        |
| Server action error captured | `warning` | `sentry-{action}` or `sentry-general`   | `lib/monitoring/sentry.ts` captureChefError()    |

Subject line format: `[ERROR] Circuit breaker OPEN: stripe` or `[WARNING] Cron job failed: lifecycle`

### 2. Daily Digest (7 AM EST)

A single summary email covering the last 24 hours:

- **Cron health**: which jobs ran, which are stale/missing/errored
- **Circuit breakers**: any that tripped (only shows non-CLOSED)
- **Recent errors**: last 24h of cron failures with error text
- **Ollama status**: online/offline with latency

Triggered by the cron route: `GET /api/cron/developer-digest`

Schedule: `0 12 * * *` (UTC) = 7 AM EST

If all systems are healthy, the email says so in one line. Sections with issues are expanded.

## Files

| File                                       | Purpose                                                       |
| ------------------------------------------ | ------------------------------------------------------------- |
| `lib/email/developer-alerts.ts`            | Core module: `sendDeveloperAlert()` + `sendDeveloperDigest()` |
| `lib/email/templates/developer-alert.tsx`  | Immediate alert email template (severity-coded)               |
| `lib/email/templates/developer-digest.tsx` | Daily digest email template                                   |
| `app/api/cron/developer-digest/route.ts`   | Cron route handler                                            |

## Integration Points

Three existing modules were modified to fire alerts:

1. **`lib/resilience/circuit-breaker.ts`** (line ~167): fires alert when any circuit transitions to `OPEN`
2. **`lib/cron/heartbeat.ts`** (line ~51): fires alert when `recordCronError()` is called
3. **`lib/monitoring/sentry.ts`** (line ~30): fires alert when `captureChefError()` is called

All hooks use `require()` (not `import`) inside `try/catch` to prevent circular imports and ensure the alert system never crashes the calling module.

## Rate Limiting

In-memory, per serverless instance. Each `system` key gets its own 15-minute window:

- `stripe` (circuit breaker for Stripe)
- `cron-lifecycle` (lifecycle cron failures)
- `sentry-createEvent` (errors from the createEvent action)
- `sentry-general` (errors without a specific action)

Resets on cold start. This is intentional: over-alerting is better than under-alerting.

## Resend Recursion Safety

If Resend itself is down (circuit breaker open), `sendEmail()` returns `false` without throwing. The alert for Resend's circuit opening would go through `sendEmail()` which would fail silently. No infinite loop.

## Testing

Manual test of immediate alert:

```bash
# In a Node REPL or test file:
const { sendDeveloperAlert } = require('./lib/email/developer-alerts')
await sendDeveloperAlert({
  severity: 'warning',
  system: 'test',
  title: 'Test alert',
  description: 'This is a test alert from the developer notification system.',
})
```

Manual test of daily digest:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3100/api/cron/developer-digest
```

## Monitoring

The digest cron is registered in `app/api/scheduled/monitor/route.ts` with a 2880-minute (48h) expected interval. The monitor will flag it as stale if it stops running.
