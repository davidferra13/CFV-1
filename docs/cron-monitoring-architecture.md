# Cron Monitoring Architecture

This document is the operational handoff for ChefFlow's scheduler monitoring contract.

## Source Of Truth

The monitoring system is intentionally centralized so the same job inventory and health logic drives every public and internal surface.

| File                                          | Responsibility                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `lib/cron/definitions.ts`                     | Canonical registry of critical jobs that must affect health, alerts, and digest output                          |
| `lib/cron/monitor.ts`                         | Builds the shared report from `cron_executions`, classifies alert severity, and exposes `runMonitoredCronJob()` |
| `app/api/scheduled/monitor/route.ts`          | Authenticated monitor endpoint, optional alert router, and self-heartbeat                                       |
| `lib/health/public-health.ts`                 | Readiness `backgroundJobs` summary derived from the shared report                                               |
| `lib/email/developer-alerts.ts`               | Developer digest built from the same report                                                                     |
| `tests/unit/cron-monitoring-coverage.test.ts` | Prevents uninstrumented routes or unregistered monitored jobs from shipping                                     |

## What Gets Measured

For each registered job, the shared report tracks:

- Last run time and current freshness against `maxExpectedMinutes`
- Last success and last error timestamps
- 24-hour run count, success count, error count, and error rate
- 24-hour issue count and issue rate for partial-failure payloads
- Average and p95 duration in the last 24 hours
- Latest error text and a human-readable message used in alerts and digest output

Partial-failure issue detection reads common payload fields such as `success: false`, `failed`, `failures`, `errorCount`, and `errors`.

## Public And Internal Surfaces

| Surface                                        | Purpose                          | Notes                                                               |
| ---------------------------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| `GET /api/scheduled/monitor?strict=1`          | Internal scheduler health report | Requires cron auth. Returns `503` when unhealthy in strict mode.    |
| `GET /api/scheduled/monitor?strict=1&notify=0` | Safe manual inspection           | Same report, no alert email side effect.                            |
| `GET /api/health/readiness?strict=1`           | External paging endpoint         | Uses the shared report only as a summarized `backgroundJobs` check. |
| `GET /api/cron/developer-digest`               | Daily system-health digest       | Reads the same cron report as the monitor endpoint.                 |

External uptime tools should page on readiness, not on the monitor route. The monitor route is the deeper authenticated diagnostic surface.

## Instrumentation Contract

Every scheduled route under `app/api/scheduled/*`, `app/api/cron/*`, and `app/api/gmail/sync/route.ts` must do one of the following:

1. Wrap execution with `runMonitoredCronJob(cronName, job)`.
2. Or call both `recordCronHeartbeat(cronName, ...)` and `recordCronError(cronName, ...)`.

Rules:

- Success telemetry must be emitted on every real success path, including no-op branches.
- Failure telemetry must be emitted on thrown or handled failures.
- If the job should affect readiness, digest, or aggregate alerting, register it in `CRON_MONITOR_DEFINITIONS`.

## Alerting Model

There are two cron-related alert paths:

1. Route-level failure alerts
   `recordCronError()` sends an immediate warning for a specific job failure.

2. Aggregate monitor alerts
   `sendCronHealthAlerts()` sends a summary alert when the shared report shows stale jobs, missing jobs, elevated 24-hour error rate, elevated issue rate, or slow frequent jobs.

The developer digest uses the same report to avoid disagreement between individual alerts, readiness, and the daily summary.

## Known Exceptions

- `monitor` records its own heartbeat and failures, but is intentionally excluded from the shared public registry.
- `simulation` is locally instrumented and explicitly allowed by the coverage test, but is not part of the shared registry because the route is fire-and-forget and not part of the public readiness contract.

## Adding A New Critical Job

1. Implement the route.
2. Instrument it with `runMonitoredCronJob()` or both heartbeat and error recording.
3. Add the job to `lib/cron/definitions.ts` if it should affect readiness, digest, or aggregate alerting.
4. Run the coverage test and typecheck.
5. Verify `GET /api/scheduled/monitor?strict=1&notify=0` shows the new job after it runs.

## Verification Commands

```bash
node --test --import tsx tests/unit/cron-monitoring-coverage.test.ts
npm run typecheck:app
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3100/api/scheduled/monitor?strict=1&notify=0"
curl -I http://localhost:3100/api/health/readiness?strict=1
```
