# Developer Alert System

Automated email notifications for system health, sent to `DFPrivateChef@gmail.com` via Resend.

Source of truth for cron monitoring: [docs/cron-monitoring-architecture.md](/c:/Users/david/Documents/CFv1/docs/cron-monitoring-architecture.md)

## Two Channels

### 1. Immediate Alerts (real-time, rate-limited)

Triggered automatically when critical events occur. Each `system` key is rate-limited to 1 email per 15 minutes to prevent spam.

| Trigger                         | Severity  | Rate-limit key                          | What fires it                                            |
| ------------------------------- | --------- | --------------------------------------- | -------------------------------------------------------- |
| Circuit breaker opens           | `error`   | Service name (e.g., `stripe`, `resend`) | `lib/resilience/circuit-breaker.ts` transition()         |
| Cron route throws hard failure  | `warning` | `cron-{cronName}`                       | `lib/cron/heartbeat.ts` `recordCronError()`              |
| Cron monitor detects bad health | varies    | `cron-monitor`                          | `app/api/scheduled/monitor` via `sendCronHealthAlerts()` |
| Server action error captured    | `warning` | `sentry-{action}` or `sentry-general`   | `lib/monitoring/sentry.ts` `captureChefError()`          |

Cron monitor alerts cover cases that do not necessarily throw, including stale or missing jobs, elevated 24-hour error rate, partial-failure issue rate, and latency anomalies on frequent jobs.

Subject line format: `[ERROR] Circuit breaker OPEN: stripe`, `[WARNING] Cron job failed: lifecycle`, or `Cron monitor unhealthy: 2 critical`

### 2. Daily Digest (7 AM EST)

A single summary email covering the last 24 hours:

- **Cron health**: which registered jobs ran, which are stale/missing, and which are trending badly
- **Circuit breakers**: any that tripped (only shows non-CLOSED)
- **Recent errors**: last 24h of cron failures with error text
- **Ollama status**: online/offline with latency

Triggered by the cron route: `GET /api/cron/developer-digest`

Schedule: `0 12 * * *` (UTC) = 7 AM EST

The digest reads from the same shared cron report used by the readiness background-job check and the monitor endpoint, so all three surfaces agree on which jobs are healthy.

If all systems are healthy, the email says so in one line. Sections with issues are expanded.

## Files

| File                                          | Purpose                                                               |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `lib/cron/definitions.ts`                     | Shared registry of critical monitored jobs                            |
| `lib/cron/monitor.ts`                         | Shared cron report, alert classification, and monitored wrapper       |
| `lib/email/developer-alerts.ts`               | Core module: `sendDeveloperAlert()` + `sendDeveloperDigest()`         |
| `lib/email/templates/developer-alert.tsx`     | Immediate alert email template (severity-coded)                       |
| `lib/email/templates/developer-digest.tsx`    | Daily digest email template                                           |
| `app/api/scheduled/monitor/route.ts`          | Authenticated cron health report and alert router                     |
| `app/api/cron/developer-digest/route.ts`      | Cron route handler for daily digest                                   |
| `tests/unit/cron-monitoring-coverage.test.ts` | Guard test that enforces route instrumentation and registry alignment |

## Integration Points

The alert system now has two cron-related integration paths:

1. **Per-route failure alerts**
   Routes call `recordCronError()` when execution fails. That sends an immediate warning for the specific job.

2. **Aggregate monitor alerts**
   `app/api/scheduled/monitor` calls `buildCronHealthReport()` and `sendCronHealthAlerts()`. That route evaluates the shared job registry and emits a summary alert when any job is stale, missing, throwing too often, surfacing issue payloads too often, or running unusually slowly.

Other integration points remain:

1. **`lib/resilience/circuit-breaker.ts`**: fires alert when any circuit transitions to `OPEN`
2. **`lib/cron/heartbeat.ts`**: fires alert when `recordCronError()` is called
3. **`lib/monitoring/sentry.ts`**: fires alert when `captureChefError()` is called

The cron monitor imports `sendDeveloperAlert()` dynamically to avoid circular imports between monitoring and email layers.

## Rate Limiting

In-memory, per serverless instance. Each `system` key gets its own 15-minute window:

- `stripe` (circuit breaker for Stripe)
- `cron-lifecycle` (lifecycle cron failures)
- `cron-monitor` (aggregate scheduler health)
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

Manual test of the aggregate cron monitor without sending email:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3100/api/scheduled/monitor?strict=1&notify=0"
```

Guard test for monitoring coverage:

```bash
node --test --import tsx tests/unit/cron-monitoring-coverage.test.ts
```

## Monitoring

Every critical scheduled job that should affect operator visibility must be present in `lib/cron/definitions.ts`. That shared registry drives:

- `GET /api/scheduled/monitor`
- `GET /api/health/readiness?strict=1` background-job health
- `GET /api/cron/developer-digest`

The monitor route also records its own heartbeat under `monitor`, but that self-check is intentionally not part of the shared public registry.
