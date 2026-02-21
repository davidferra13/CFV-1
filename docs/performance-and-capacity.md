# Performance, Pagination, Load Testing & Capacity Planning — ChefFlow V1

**Last reviewed:** 2026-02-20
**Owner:** Platform engineer / founder

This document covers four related topics:
1. Pagination and filtering standards (#68)
2. Performance budget per endpoint (#75)
3. Load testing strategy (#76)
4. Capacity planning (#77)

---

## Part 1 — Pagination, Sorting, and Filtering Standards (#68)

### Standard Response Envelope (All List Endpoints)

All paginated list endpoints must return this shape:

```json
{
  "data": [...],
  "meta": {
    "total": 847,
    "page": 1,
    "limit": 25,
    "pages": 34,
    "has_more": true
  }
}
```

For cursor-based pagination (activity feed):
```json
{
  "data": [...],
  "meta": {
    "limit": 25,
    "has_more": true,
    "next_cursor": "2026-02-15T10:30:00Z"
  }
}
```

### Pagination Strategy

| Endpoint Type | Strategy | Why |
|--------------|----------|-----|
| Activity feed (`chef_activity_log`) | **Cursor-based** (ISO date cursor) | Append-only table; offset pagination drifts with new inserts |
| Events, clients, inquiries | **Offset-based** (page + limit) | Manageable dataset sizes; filter-heavy queries benefit from simplicity |
| API v1 (`/api/v1/events`, `/api/v1/clients`) | **Offset-based** | Consistent with external consumer expectations |
| Admin lists | **Offset-based** | Small-scale, infrequent queries |

### Standard Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | — | 1-indexed page number |
| `limit` | integer | 25 | 200 | Items per page |
| `sort` | string | `created_at` | — | Column to sort by |
| `order` | `asc` \| `desc` | `desc` | — | Sort direction |
| `search` | string | — | 200 chars | Full-text search (if supported) |
| `status` | string | — | — | Entity-specific status filter |
| `from_date` | YYYY-MM-DD | — | — | Date range start |
| `to_date` | YYYY-MM-DD | — | — | Date range end |

### Limits per Entity

| Entity | Default limit | Max limit | Notes |
|--------|--------------|-----------|-------|
| Events | 25 | 200 | Filter by status, date range |
| Clients | 25 | 500 | Search by name/email |
| Inquiries | 25 | 100 | Filter by status |
| Ledger entries | 25 | 500 | Date range required for large ranges |
| Activity log | 25 | 100 | Cursor-based only |
| Messages | 25 | 100 | Cursor-based (newest first) |

### Filtering Standards

All filterable columns must use exact match unless noted:

```typescript
// Standard filter application pattern in server actions:
let query = supabase.from('events').select('*').eq('tenant_id', tenantId)

if (filters.status) query = query.eq('status', filters.status)
if (filters.from_date) query = query.gte('event_date', filters.from_date)
if (filters.to_date) query = query.lte('event_date', filters.to_date)
if (filters.search) query = query.ilike('occasion', `%${filters.search}%`)

query = query.order(sort, { ascending: order === 'asc' })
query = query.range(offset, offset + limit - 1)
```

**Never** use `.maybeSingle()` on a list — it silently truncates to 1 result. Always use `.range()` + `.select('*, count')`.

---

## Part 2 — Performance Budget (#75)

A performance budget defines the maximum acceptable cost for each type of operation. Exceeding the budget triggers investigation.

### Page Load Budget (Core Chef Workflows)

| Page | Server Render Budget | Target LCP | Target TTFB |
|------|---------------------|-----------|-------------|
| `/dashboard` | < 800ms | < 2.5s | < 500ms |
| `/events` | < 600ms | < 2.5s | < 400ms |
| `/events/[id]` | < 800ms | < 2.5s | < 500ms |
| `/clients` | < 500ms | < 2.5s | < 300ms |
| `/financials` | < 1000ms | < 3.0s | < 600ms |
| `/culinary/recipes` | < 600ms | < 2.5s | < 400ms |

### API Response Budget

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| `GET /api/v1/events` | < 300ms | < 800ms | < 2000ms |
| `GET /api/v1/clients` | < 300ms | < 800ms | < 2000ms |
| `POST /api/webhooks/stripe` | < 500ms | < 2000ms | < 5000ms |
| `GET /api/health` | < 100ms | < 300ms | < 800ms |

### Server Action Budget

| Action type | Target | Max acceptable |
|-------------|--------|----------------|
| Simple CRUD (create/update) | < 200ms | < 800ms |
| FSM transition | < 500ms | < 2000ms |
| PDF generation | < 2000ms | < 8000ms |
| AI generation (Gemini) | < 5000ms | < 20000ms |
| Grocery price lookup | < 3000ms | < 10000ms |
| Email send (Resend) | < 1000ms | < 4000ms |

### Bundle Size Budget

| Asset | Current target | Max |
|-------|---------------|-----|
| First load JS (shared) | < 150 kB | 200 kB |
| Per-route JS | < 50 kB | 100 kB |
| Total page weight (gzip) | < 500 kB | 1 MB |

Monitor with: `npx next build` output (shows route sizes in KB).

### Database Query Budget

| Query type | Target | Max | Action if exceeded |
|-----------|--------|-----|-------------------|
| Single record fetch | < 10ms | 50ms | Add index |
| List query (25 rows) | < 30ms | 100ms | Add index, optimize filters |
| Aggregate (sum, count) | < 50ms | 200ms | Add materialized view |
| Full-text search | < 100ms | 500ms | Add GIN index |

---

## Part 3 — Load Testing Strategy (#76)

### Current Baseline (Estimated, Not Measured)

| Metric | Estimate |
|--------|----------|
| Active chefs | < 50 |
| Peak concurrent users | < 20 |
| Events per chef per month | ~10–30 |
| DB rows (total) | ~100K |
| API calls per minute (peak) | < 200 |

ChefFlow is in early growth phase. Load testing is forward-looking, not for current traffic.

### Load Test Targets (6-Month Horizon)

| Scenario | Target |
|----------|--------|
| Concurrent active chefs | 200 |
| API requests per minute | 2,000 |
| Webhook events per minute | 500 |
| Concurrent E2E test users | 50 |
| Database concurrent connections | 80 |

### Recommended Tool: k6

```bash
npm install -g k6  # or brew install k6
```

**Basic load test script** (`tests/load/chef-dashboard.js`):

```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 50,           // 50 virtual users
  duration: '5m',    // Run for 5 minutes
  thresholds: {
    http_req_duration: ['p(95) < 2000'],  // 95% under 2s
    http_req_failed: ['rate < 0.01'],     // < 1% failure rate
  },
}

export default function () {
  // Test the health endpoint (representative of app responsiveness)
  const res = http.get('https://cheflowhq.com/api/health')
  check(res, { 'status is 200': (r) => r.status === 200 })
  sleep(1)
}
```

Run: `k6 run tests/load/chef-dashboard.js`

### Load Test Scenarios to Write

| Test | Description | Target |
|------|-------------|--------|
| `smoke` | 1 VU, 1 min — baseline sanity | All checks pass |
| `load` | 50 VU, 5 min — typical traffic | p95 < 2s, error rate < 1% |
| `stress` | Ramp 10→200 VU over 10 min | Find breaking point |
| `spike` | 200 VU sudden burst for 1 min | Error rate < 5%, recovery < 2 min |
| `webhook-flood` | POST /api/webhooks/stripe at 200/min | All process within 5s |

### Load Test Schedule

- **Before major releases:** Run `load` scenario to confirm no regression
- **Quarterly:** Run `stress` scenario to verify capacity headroom
- **After infrastructure changes** (Supabase plan upgrade, Vercel region change): Full suite

---

## Part 4 — Capacity Planning (#77)

### Supabase Free Tier Limits

| Resource | Limit | Current Usage (est.) | Headroom |
|----------|-------|---------------------|----------|
| Database size | 500 MB | ~50 MB | ~90% |
| Storage | 1 GB | ~200 MB (receipts/photos) | ~80% |
| Monthly active users (auth) | 50,000 | ~200 | Ample |
| Realtime connections | 200 concurrent | ~10 | Ample |
| Edge Function invocations | 500K/month | Not used | N/A |
| Database connections | 60 concurrent | ~15 | ~75% |

**Trigger for upgrade to Supabase Pro ($25/mo):**
- DB approaching 400 MB (80% of 500 MB limit)
- Storage approaching 800 MB
- Concurrent connections approaching 50

### Vercel Hobby Tier Limits

| Resource | Limit | Current Usage (est.) | Headroom |
|----------|-------|---------------------|----------|
| Function invocations/month | 100K | ~5K | Ample |
| Function execution time | 10s max | ~500ms avg | Ample |
| Bandwidth | 100 GB/month | ~2 GB | Ample |
| Cron jobs | 2 per project | 9 currently | ❌ OVER LIMIT |
| Deployments/month | Unlimited | ~10 | Ample |

> ⚠️ **Critical:** Vercel Hobby allows only 2 cron jobs. ChefFlow has 9 cron endpoints. This works only on Pro plan. The `vercel.json` crons require **Vercel Pro ($20/mo)**.

**Trigger for upgrade to Vercel Pro ($20/mo):**
- Already required (9 crons > 2 Hobby limit)
- Or: any function approaching 10s timeout

### Database Row Growth Estimates

| Table | Rows today (est.) | Monthly growth | At 12 months |
|-------|------------------|---------------|--------------|
| `events` | 500 | +200/month | ~2,900 |
| `clients` | 1,000 | +400/month | ~5,800 |
| `ledger_entries` | 2,000 | +500/month | ~8,000 |
| `chef_activity_log` | 5,000 | +2,000/month | ~29,000 |
| `messages` | 10,000 | +3,000/month | ~46,000 |
| `event_state_transitions` | 3,000 | +800/month | ~12,600 |

At 12 months with 50 chefs: ~100,000 rows total, ~50 MB data — well within Free tier.

**Upgrade trigger:** 50+ active chefs generating 10,000+ events/month → ~200 MB DB, may need Pro.

### Cost Scaling Model

| Stage | Chefs | Monthly Cost |
|-------|-------|-------------|
| Early (now) | 1–20 | ~$20/mo (Vercel Pro) |
| Growth | 20–100 | ~$45/mo (+ Supabase Pro) |
| Scale | 100–500 | ~$100–200/mo (+ Redis, Sentry paid) |
| Enterprise | 500+ | Evaluate custom Supabase enterprise pricing |

### Connection Pool Sizing

Supabase uses PgBouncer. Free tier: 60 connections. With Vercel serverless (stateless, short-lived):
- Each function invocation opens ~1 connection
- At 60 concurrent invocations, we hit the limit
- Mitigation: use `pgbouncer=true` in the connection string (Supabase transaction mode)
- Long-term: upgrade to Pro (200 connections) or use Supabase connection pooler

---

## Monitoring Setup

Until dedicated APM is integrated, use these manual checks:

```bash
# Check DB size
# In Supabase dashboard: Settings > Database > Database size

# Check Vercel function usage
# Vercel dashboard: Analytics > Functions

# Check route bundle sizes
npx next build --no-lint 2>&1 | grep "Route (app)"

# Run a basic latency test
curl -w "@-" -o /dev/null -s https://cheflowhq.com/api/health <<'EOF'
    time_namelookup:  %{time_namelookup}s\n
       time_connect:  %{time_connect}s\n
    time_appconnect:  %{time_appconnect}s\n
   time_pretransfer:  %{time_pretransfer}s\n
      time_redirect:  %{time_redirect}s\n
 time_starttransfer:  %{time_starttransfer}s\n
                     ----------\n
         time_total:  %{time_total}s\n
EOF
```

---

*Last updated: 2026-02-20*
