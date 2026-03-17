# Uptime Monitoring Setup

## Monitor Targets

Use two endpoints for different purposes.

| Purpose              | Endpoint                         | Healthy response                           | Why it exists                                                                                     |
| -------------------- | -------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Liveness             | `/api/health/ping`               | `200 OK`                                   | Fast process and edge check with no dependency inspection.                                        |
| Readiness and paging | `/api/health/readiness?strict=1` | `200 OK` when healthy, `503` when degraded | Checks required env, circuit breakers, and background job health. Use this for external alerting. |

Do not use `/api/health` for external paging. It is not the strict release-health signal.

## Readiness Contract

`GET /api/health/readiness?strict=1`

Expected headers:

- `X-Health-Status: ok` or `degraded`
- `X-Health-Scope: readiness`
- `X-Request-ID: <uuid>`

Expected body shape:

```json
{
  "status": "ok",
  "checks": {
    "env": "ok",
    "circuitBreakers": "ok",
    "backgroundJobs": "ok"
  },
  "details": {},
  "build": {}
}
```

## UptimeRobot Configuration

Primary production monitor:

| Setting             | Value                                                     |
| ------------------- | --------------------------------------------------------- |
| Monitor Type        | HTTP(s)                                                   |
| Friendly Name       | ChefFlow Production Readiness                             |
| URL                 | `https://app.cheflowhq.com/api/health/readiness?strict=1` |
| Monitoring Interval | 5 minutes                                                 |
| Monitor Timeout     | 30 seconds                                                |

Beta monitor:

| Setting             | Value                                                      |
| ------------------- | ---------------------------------------------------------- |
| Monitor Type        | HTTP(s)                                                    |
| Friendly Name       | ChefFlow Beta Readiness                                    |
| URL                 | `https://beta.cheflowhq.com/api/health/readiness?strict=1` |
| Monitoring Interval | 5 minutes                                                  |
| Monitor Timeout     | 30 seconds                                                 |

Optional low-noise liveness monitor:

| Setting             | Value                                        |
| ------------------- | -------------------------------------------- |
| Monitor Type        | HTTP(s)                                      |
| Friendly Name       | ChefFlow Beta Ping                           |
| URL                 | `https://beta.cheflowhq.com/api/health/ping` |
| Monitoring Interval | 5 minutes                                    |
| Monitor Timeout     | 10 seconds                                   |

## Recommended Alert Thresholds

- Down alert after 2 consecutive failures.
- SSL expiry alert 14 days before expiration.
- Response-time alert if readiness exceeds 5 seconds consistently.

## Notification Setup

Configure at least two alert paths:

1. Email for all incidents.
2. Webhook to Slack or Discord for team visibility.

## Manual Verification

Run these checks after every beta deployment:

```bash
curl -I https://beta.cheflowhq.com/api/health/readiness?strict=1
curl https://beta.cheflowhq.com/api/health/readiness?strict=1
curl -I https://beta.cheflowhq.com/api/health/ping
```

Confirm that readiness returns `200` only when the beta environment is actually healthy.
