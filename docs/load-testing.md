# Load Testing (k6)

HTTP-level load testing for ChefFlow. Simulates concurrent users hitting pages and API endpoints to find bottlenecks, slow queries, and breaking points.

## Prerequisites

- **k6 binary** at `node_modules/.bin/k6.exe` (already installed)
- **Dev server** running on port 3100 (`npm run dev`)
- **SUPABASE_E2E_ALLOW_REMOTE=true** in `.env.local` (for authenticated page route tests)
- **Ollama running** (only needed for `test:load:remy`)

## Quick Start

```bash
# Sanity check (2 VUs, 30 seconds)
npm run test:load:smoke

# Full mixed traffic simulation (50 VUs, 10 minutes)
npm run test:load

# Find the breaking point (ramp to 200 VUs)
npm run test:load:stress

# Sudden traffic burst (10 -> 200 -> 10 VUs)
npm run test:load:spike
```

## Available Commands

| Command            | What it tests             | VUs       | Duration |
| ------------------ | ------------------------- | --------- | -------- |
| `test:load:smoke`  | Health + auth check       | 2         | 30s      |
| `test:load`        | Full traffic mix          | 5-50      | ~10 min  |
| `test:load:stress` | Breaking point            | 50-200    | ~13 min  |
| `test:load:spike`  | Burst recovery            | 10-200-10 | ~8 min   |
| `test:load:public` | Public pages (no auth)    | 10-100    | ~10 min  |
| `test:load:health` | Health endpoints baseline | 100       | 2 min    |
| `test:load:chef`   | Chef portal pages         | 5-50      | ~13 min  |
| `test:load:api`    | API v2 GET endpoints      | 5-10      | ~7 min   |
| `test:load:writes` | API v2 POST/PUT mutations | 1-5       | ~5 min   |
| `test:load:remy`   | Remy AI concierge         | 5-10      | ~7 min   |

## Scenarios

### 00-smoke.js

Validates the test setup works. Hits `/api/health/ping` and `/dashboard` with auth. Gate for larger tests.

### 01-public-routes.js

Unauthenticated pages: landing, pricing, about, contact, FAQ. Measures Next.js SSR throughput without auth overhead. Weighted by expected real traffic.

### 02-health-endpoints.js

Pure API baseline. `/api/health/ping` should be under 50ms p95 (no DB). `/api/health` includes DB check. Establishes the throughput ceiling.

### 03-chef-portal.js

Authenticated chef pages with realistic weights: dashboard (40%), events (20%), clients (15%), calendar (10%), analytics (10%), settings (5%). Per-route latency metrics. 2-5 second think time between pages.

### 04-api-v2-reads.js

REST API GET endpoints with API key or Supabase token auth. Tests events list, clients list, and financial summary. Respects 100 req/min rate limit. The financial summary endpoint is the most expensive (multiple DB queries).

### 05-api-v2-writes.js

POST/PUT mutations at low VU count. Creates records prefixed with `[LOAD-TEST]` for identification. Teardown prints cleanup query. Measures write latency and connection contention.

### 06-remy-public.js

Concurrent AI requests to the public Remy endpoint. Uses 30-second timeout (AI is slow). Measures Ollama queue saturation. Requires Ollama to be running.

### 07-full-mix.js

Combined realistic simulation: 30% public browsing, 50% chef portal, 15% API integrations, 5% AI requests. All four scenarios run in parallel using k6's scenarios feature.

## Reading the Output

k6 prints a summary table after each run:

```
     http_req_duration..............: avg=245ms  min=12ms  med=180ms  max=2.1s   p(90)=450ms  p(95)=680ms
     http_req_failed................: 0.42%  12 out of 2847
     http_reqs......................: 2847   47.45/s
```

Key metrics:

- **p(95)**: 95% of requests completed within this time. This is your primary latency indicator.
- **http_req_failed**: Error rate. Under 1% is good. Over 5% means something is breaking.
- **http_reqs rate**: Throughput (requests per second).

Custom per-route metrics (e.g., `dashboard_duration`, `events_list_duration`) show which specific endpoints are slow.

## Thresholds

| Profile | p95 Latency | Error Rate | Purpose                |
| ------- | ----------- | ---------- | ---------------------- |
| Default | < 500ms     | < 1%       | Normal operation       |
| Stress  | < 2000ms    | < 5%       | Finding breaking point |
| AI      | < 10s       | < 5%       | Ollama responses       |

## Environment Variables

Override defaults when running:

```bash
# Test against beta server
node_modules/.bin/k6 run tests/load/scenarios/03-chef-portal.js -e BASE_URL=http://localhost:3200

# Use API key for v2 endpoints
node_modules/.bin/k6 run tests/load/scenarios/04-api-v2-reads.js -e API_KEY=cf_live_xxx

# Run stress profile on any scenario
node_modules/.bin/k6 run tests/load/scenarios/01-public-routes.js -e PROFILE=stress
```

## Architecture Notes

- **k6 is Go-based**: Low overhead, won't compete much with Node.js for RAM. But at 200 VUs on a single PC, both processes share CPU.
- **Rate limiting**: API v2 has 100 req/min per tenant (in-memory). Tests space requests accordingly. If you see mostly 429 responses, reduce VU count or increase rate limit temporarily.
- **Auth**: Page routes use Supabase SSR cookies (set via `/api/e2e/auth`). API v2 routes use Bearer token. Both methods are in `tests/load/helpers/auth.js`.
- **Shared database**: All environments share the same Supabase instance. Write tests create real records. Clean up after.

## File Structure

```
tests/load/
  config.js              # Base URLs, thresholds, stage definitions
  helpers/
    auth.js              # Supabase JWT + E2E auth helpers
    checks.js            # Response validation helpers
  scenarios/
    00-smoke.js          # Setup validation
    01-public-routes.js  # Public SSR pages
    02-health-endpoints.js  # Health API baseline
    03-chef-portal.js    # Auth'd chef pages
    04-api-v2-reads.js   # REST API reads
    05-api-v2-writes.js  # REST API mutations
    06-remy-public.js    # AI concierge load
    07-full-mix.js       # Combined traffic
  reports/               # Generated reports (gitignored)
```
