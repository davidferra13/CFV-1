# Alerting & Monitoring Setup — ChefFlow V1

## Overview

ChefFlow uses a layered monitoring approach:

| Layer | Tool | What it catches |
|-------|------|-----------------|
| Error tracking | Sentry | Uncaught exceptions, server-side errors, slow transactions |
| Health probes | `/api/health` + external uptime monitor | DB connectivity, env vars, Redis reachability |
| Cron health | `/api/scheduled/monitor` | Whether scheduled jobs are running successfully |
| Build health | GitHub Actions | TypeScript errors, ESLint failures, smoke test failures |

---

## 1. Sentry Setup (Error Tracking + Alerting)

### Create a Project

1. Go to [sentry.io](https://sentry.io) → New Project → Next.js
2. Copy your **DSN** from Settings → Client Keys
3. Add to Vercel environment variables:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxxx@oxxxx.ingest.sentry.io/xxxx
   SENTRY_DSN=https://xxxx@oxxxx.ingest.sentry.io/xxxx
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=chefflow
   SENTRY_AUTH_TOKEN=sntrys_...  (for source map uploads)
   ```
4. Redeploy to Vercel — Sentry will begin capturing errors

### Configure Alerts in Sentry

Go to **Alerts → Create Alert Rule**:

#### Alert 1: Any Unhandled Error
- **Condition:** A new issue is created
- **Filter:** Environment = production
- **Action:** Send email to team + Slack webhook
- **Threshold:** Immediately (0 occurrences)

#### Alert 2: Error Spike
- **Condition:** Number of events in an issue exceeds 10 in 1 hour
- **Filter:** Environment = production
- **Action:** Send email + Slack

#### Alert 3: High Error Rate
- **Condition:** Percentage of sessions with errors > 5%
- **Action:** Page/email immediately

#### Alert 4: Slow Transaction (Performance)
- **Condition:** P75 latency > 3000ms for any transaction
- **Action:** Slack notification

### Sentry Configuration Files

| File | Purpose |
|------|---------|
| `sentry.client.config.ts` | Browser-side error capture + Session Replay |
| `sentry.server.config.ts` | Server-side error capture (API routes, server actions) |
| `sentry.edge.config.ts` | Edge runtime (middleware) error capture |

### PII Protection

Sentry is configured with `sendDefaultPii: false`. Cookie headers and Authorization headers are stripped from every event in `beforeSend`. Session Replay masks all text content by default (`maskAllText: true`).

---

## 2. Uptime Monitoring — `/api/health`

The public health endpoint at `/api/health` (no auth required) returns:

```json
{
  "status": "ok",
  "timestamp": "2026-02-20T12:00:00.000Z",
  "version": "chefflow-build",
  "checks": {
    "env": "ok",
    "database": "ok",
    "redis": "ok"
  },
  "latencyMs": {
    "database": 12,
    "redis": 8
  }
}
```

**Status codes:**
- `200` → `status: "ok"` or `status: "degraded"` (non-critical service unavailable)
- `503` → `status: "error"` (database or required env vars unavailable)

### Register with an Uptime Monitor

**Free options:**

| Service | Free Tier | Setup |
|---------|-----------|-------|
| [UptimeRobot](https://uptimerobot.com) | 50 monitors, 5 min interval | HTTP monitor → `https://cheflowhq.com/api/health` |
| [Better Uptime](https://betteruptime.com) | 10 monitors | HTTP monitor, keyword match `"status":"ok"` |
| [Freshping](https://freshping.io) | 50 monitors, 1 min interval | HTTP(S) check |

**Setup (UptimeRobot):**

1. Add Monitor → HTTP(s)
2. URL: `https://cheflowhq.com/api/health`
3. Monitoring interval: 5 minutes
4. Alert contacts: email + optional Slack webhook
5. Keyword alert: alert if response does NOT contain `"status":"ok"`

---

## 3. Cron Health Monitor

The internal cron health endpoint at `/api/scheduled/monitor` aggregates the execution status of all 18 scheduled jobs. It is gated by `Authorization: Bearer ${CRON_SECRET}`.

To check cron health:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://cheflowhq.com/api/scheduled/monitor
```

### Add a Cron Health Alert

Create a Sentry Cron Monitor (or use an external tool) to alert if the monitor endpoint returns a non-2xx status or if cron_executions table shows no runs in the expected window.

---

## 4. Vercel Analytics + Function Logs

Vercel provides basic function execution logs under the **Logs** tab in the Vercel dashboard. These are retained for 1 day (Hobby) or longer (Pro).

For deeper logging, see `lib/logger.ts` — structured JSON logs will appear in Vercel's function logs and can be piped to a log aggregation service.

**Recommended log aggregators (free tiers available):**
- [Axiom](https://axiom.co) — Vercel integration, 500MB/day free
- [Logtail](https://logtail.com) — 1GB/day free, Vercel log drain support
- [Datadog](https://datadoghq.com) — 14 day trial, then paid

To integrate: add a Vercel Log Drain in the Vercel dashboard pointing to your aggregator's ingest endpoint.

---

## 5. Request Correlation IDs

Every request flowing through ChefFlow middleware receives an `X-Request-ID` header (16-character hex, generated if not already set by a proxy).

The header is:
- Set **inbound** on the request (available in server components via `headers()`)
- Propagated **outbound** on all responses
- Available for use in structured logs via `lib/logger.ts`

To include the request ID in Sentry events, call `Sentry.setTag('requestId', requestId)` at the start of any server action or API route handler.

---

## 6. On-Call Escalation

For a solo developer setup, configure:

1. **Email alerts** from Sentry (primary) and UptimeRobot (uptime)
2. **Slack webhook** for high-severity alerts (production down, data errors)
3. **Vercel status page** bookmark: [vercel-status.com](https://www.vercel-status.com)
4. **Supabase status page** bookmark: [status.supabase.com](https://status.supabase.com)

When the team grows, configure PagerDuty or OpsGenie with on-call rotations.

---

## 7. SLO Targets

See [`docs/slo-uptime-targets.md`](./slo-uptime-targets.md) for defined uptime targets and error budgets.

---

*Last updated: 2026-02-20*
