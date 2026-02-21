# Service Level Objectives (SLOs) — ChefFlow V1

**Last reviewed:** 2026-02-20
**Owner:** Platform engineer / founder

---

## Overview

An SLO defines the target reliability for a service. When the SLO is met, the system is "healthy." When it is missed, it's an incident. Error budgets define how much unreliability is acceptable per period.

---

## Tier 1 — Critical Path (Payment + Event FSM)

These are the paths where downtime directly causes chef revenue loss or client booking failures.

| SLO | Target | Measurement |
|-----|--------|-------------|
| `/api/webhooks/stripe` availability | **99.9%** (43.8 min/month downtime budget) | % of Stripe webhook POSTs that return 2xx within 10s |
| Event FSM transition (`transitionEvent`) | **99.9%** | % of `PUT /events/[id]/status` that succeed |
| Client portal access | **99.5%** | % of `/portal/*` requests that render without error |
| Payment intent creation | **99.9%** | % of Stripe `payment_intent.create` calls that succeed |

**Error budget (Tier 1):** 43.8 minutes of downtime per month (for 99.9%).

---

## Tier 2 — Core Chef Workflow

These paths are used daily by chefs. Downtime is disruptive but doesn't immediately lose revenue.

| SLO | Target | Measurement |
|-----|--------|-------------|
| Dashboard page load | **99.5%** | `/dashboard` returns 200 within 3s |
| Event list load | **99.5%** | `/events` returns 200 within 3s |
| Client list load | **99.5%** | `/clients` returns 200 within 3s |
| Email delivery (Resend) | **99%** | % of transactional emails sent without bounce |
| PDF generation (quotes, menus) | **99%** | % of PDF generate calls that succeed |

---

## Tier 3 — Supporting Features

These features are valuable but not blocking chef operations.

| SLO | Target | Measurement |
|-----|--------|-------------|
| Grocery pricing lookup | **95%** | % of Spoonacular/Kroger/MealMe calls that succeed |
| Google Calendar sync | **95%** | % of sync operations that complete |
| AI menu suggestions (Gemini) | **90%** | % of generation calls that return a result |
| Cron job execution | **99%** | % of scheduled cron runs that complete without error |
| Push notifications | **95%** | % of push sends that succeed |

---

## Latency SLOs

| Endpoint | p50 target | p95 target | p99 target |
|----------|-----------|-----------|-----------|
| `GET /api/health` | < 200ms | < 500ms | < 1000ms |
| `GET /api/v1/events` | < 500ms | < 1500ms | < 3000ms |
| `GET /dashboard` (server render) | < 800ms | < 2000ms | < 5000ms |
| `POST /api/webhooks/stripe` | < 3000ms | < 8000ms | < 15000ms |
| PDF generation | < 3000ms | < 8000ms | < 15000ms |
| AI generation (Gemini) | < 5000ms | < 15000ms | < 30000ms |

---

## Uptime Targets by Component

| Component | Target | Provider | How Monitored |
|-----------|--------|----------|---------------|
| ChefFlow app (Vercel) | 99.9% | Vercel | UptimeRobot on `/api/health` |
| Supabase PostgreSQL | 99.9% | Supabase | Supabase status page + `/api/health` DB check |
| Supabase Auth | 99.9% | Supabase | Auth flow smoke test |
| Stripe | 99.99% | Stripe | Stripe status page |
| Resend | 99.9% | Resend | Resend status page |
| Cloudflare DNS | 99.99% | Cloudflare | External DNS monitor |

---

## Error Budget Policy

Error budget = `(1 - SLO) × time_period`

For a 99.9% SLO over 30 days = `0.001 × 30 × 24 × 60 = 43.2 minutes` of acceptable downtime.

**When the error budget is exhausted:**
1. Halt new feature deployments until the budget recovers
2. Prioritize reliability fixes (retries, circuit breakers, better error handling) over features
3. Post an incident report within 24 hours
4. Conduct a retrospective within 1 week

---

## How to Measure

### Availability
Availability is measured by UptimeRobot or Better Uptime pinging `/api/health` every 1 minute:
- `200 ok/degraded` = available
- `503 error` or timeout = unavailable

For Stripe webhook availability, check Supabase logs for `POST /api/webhooks/stripe` success rate.

### Latency
Vercel Analytics provides p50/p95/p99 page render times (Web Vitals). For API latency:
- Enable Vercel Speed Insights
- Review Sentry Performance for server action traces

---

## Incident Thresholds

| Condition | Severity | Response |
|-----------|----------|----------|
| `/api/health` returns 503 for > 5 min | P1 — Critical | Immediate response |
| Stripe webhook failing > 10% | P1 | Immediate response |
| Dashboard load > 5s for > 5 min | P2 | Response within 1 hour |
| Email delivery failing > 10% | P2 | Response within 1 hour |
| Cron job missing > 2 consecutive runs | P3 | Response within 4 hours |
| AI generation failing > 50% | P4 | Next business day |

---

## SLO Dashboard Setup

Until a dedicated monitoring dashboard exists, use these manual checks:

1. **Uptime:** UptimeRobot free tier → monitor `https://cheflowhq.com/api/health` every 1 minute
2. **Error rate:** Sentry → Issues dashboard → filter by `level:error`, review weekly
3. **Cron health:** `GET https://cheflowhq.com/api/scheduled/monitor` (with CRON_SECRET) → check `results` array
4. **Circuit breakers:** `GET /api/health` → check `circuit_breakers` object for any OPEN circuits

---

## SLO Review Schedule

SLOs must be reviewed:
- **Monthly**: Compare actual uptime against targets using UptimeRobot report
- **After every P1/P2 incident**: Tighten the SLO target or add a new SLO if the incident revealed a new failure mode
- **Quarterly**: Reassess targets as traffic grows and architecture evolves

---

## Current SLO Status

| Period | Tier 1 Achieved | Tier 2 Achieved | Notes |
|--------|----------------|-----------------|-------|
| 2026-02 | (first tracked month) | (first tracked month) | SLO tracking begins |

*Last updated: 2026-02-20*
