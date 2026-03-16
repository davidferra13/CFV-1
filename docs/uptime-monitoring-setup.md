# Uptime Monitoring Setup

## Health Endpoint

ChefFlow exposes a public health endpoint at:

```
GET /api/health
```

**Response (200 OK):**

```json
{
  "status": "ok",
  "timestamp": "2026-03-15T12:00:00.000Z"
}
```

No authentication required. Also supports `HEAD` requests for lower-overhead checks.

## UptimeRobot Configuration

1. Create a free account at [uptimerobot.com](https://uptimerobot.com)
2. Add a new monitor with these settings:

| Setting             | Value                                  |
| ------------------- | -------------------------------------- |
| Monitor Type        | HTTP(s)                                |
| Friendly Name       | ChefFlow Production                    |
| URL                 | `https://app.cheflowhq.com/api/health` |
| Monitoring Interval | 5 minutes                              |
| Monitor Timeout     | 30 seconds                             |

3. For beta monitoring, add a second monitor:

| Setting             | Value                                   |
| ------------------- | --------------------------------------- |
| Monitor Type        | HTTP(s)                                 |
| Friendly Name       | ChefFlow Beta                           |
| URL                 | `https://beta.cheflowhq.com/api/health` |
| Monitoring Interval | 5 minutes                               |
| Monitor Timeout     | 30 seconds                              |

## Recommended Alert Thresholds

- **Down alert:** Trigger after 2 consecutive failures (10 minutes of downtime)
- **SSL expiry:** Alert 14 days before certificate expiration
- **Response time:** Alert if response exceeds 5 seconds consistently

## Notification Setup

Configure at least two alert contacts:

1. **Email** - Primary notification channel for all incidents
2. **Webhook** (optional) - POST to a Slack/Discord webhook for team visibility

## Alternative Services

If UptimeRobot doesn't fit your needs:

- **Better Uptime** (betteruptime.com) - Free tier with status pages
- **Uptime Kuma** - Self-hosted, open source
- **Pingdom** - More advanced, paid

## Status Page (Optional)

UptimeRobot offers a free public status page. If enabled, it can be linked from the ChefFlow footer or support docs to give users visibility into system health.
