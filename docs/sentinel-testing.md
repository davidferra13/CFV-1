# Sentinel Testing Framework

Always-on Playwright QA system designed to run on the Raspberry Pi against production.

## Architecture

```
Pi (cron) --> Playwright --> app.cheflowhq.com --> Discord webhook (alerts)
```

**4 test tiers, 40 tests total:**

| Tier | Name              | Tests | Schedule         | What it tests                                          |
| ---- | ----------------- | ----- | ---------------- | ------------------------------------------------------ |
| T0   | Smoke             | 11    | Every 4h         | SSL, health, response times, sign-in, public pages     |
| T1   | Critical Paths    | 13    | Daily 6AM        | Full CRUD flows (events, clients, recipes, financials) |
| T2   | Data Verification | 6     | Daily 11:15PM    | Schema integrity, price data, sync status              |
| T3   | Regression        | 9     | Weekly (Sun 3AM) | Auth boundaries, error states, deep page navigation    |

## File Locations

| What            | Where                                        |
| --------------- | -------------------------------------------- |
| Config          | `playwright.sentinel.config.ts`              |
| Test specs      | `tests/sentinel/*.spec.ts`                   |
| Helpers         | `tests/sentinel/helpers/sentinel-utils.ts`   |
| Health API      | `app/api/sentinel/health/route.ts`           |
| Auth API        | `app/api/sentinel/auth/route.ts`             |
| Sync Status API | `app/api/sentinel/sync-status/route.ts`      |
| Discord notify  | `scripts/sentinel/notify-discord.sh`         |
| Pi setup        | `scripts/sentinel/setup-pi.sh`               |
| Pi deploy       | `scripts/sentinel/deploy-to-pi.sh`           |
| Spec            | `docs/specs/openclaw-playwright-sentinel.md` |

## Running Locally

```bash
# Against production (fast, recommended)
SENTINEL_BASE_URL=https://app.cheflowhq.com npm run test:sentinel:smoke

# Against dev server (slow, pages compile on demand)
npm run test:sentinel:smoke

# Individual tiers
npm run test:sentinel:critical
npm run test:sentinel:data
npm run test:sentinel:regression

# All tiers
npm run test:sentinel:full
```

## Authentication Strategy

Two-layer sign-in with automatic fallback:

1. **API auth (fast)**: `POST /api/sentinel/auth` with `x-sentinel-secret` header. Sets an Auth.js session cookie directly. ~50ms, no browser rendering needed.
2. **UI auth (fallback)**: Full browser sign-in form with `pressSequentially()` (React controlled inputs need real key events). Includes a 5-attempt hydration retry loop. ~4s.

The API endpoint is gated by `SENTINEL_SECRET` (not `NODE_ENV`), so it works in production. If the secret is missing or the endpoint fails, tests automatically fall back to UI sign-in.

## Environment Variables

| Variable                   | Where       | Purpose                                    |
| -------------------------- | ----------- | ------------------------------------------ |
| `SENTINEL_SECRET`          | Server + Pi | Gates `/api/sentinel/auth` endpoint        |
| `SENTINEL_EMAIL`           | Pi only     | Agent email (alternative to agent.json)    |
| `SENTINEL_PASSWORD`        | Pi only     | Agent password (alternative to agent.json) |
| `SENTINEL_BASE_URL`        | Pi + local  | Target URL (default: localhost:3100)       |
| `DISCORD_SENTINEL_WEBHOOK` | Pi only     | Discord webhook URL for alerts             |

## Response Time Budgets

T0 smoke tests enforce response time budgets:

| Category      | Budget | Examples                          |
| ------------- | ------ | --------------------------------- |
| API endpoints | 2s     | Health, sync status               |
| Public pages  | 5s     | Homepage, discover, book          |
| Auth pages    | 8s     | Dashboard, events (includes data) |

Tests fail if any page exceeds its budget, catching performance regressions early.

## Discord Notifications

`scripts/sentinel/notify-discord.sh` posts test results as Discord embeds:

- Green embed for passing tiers
- Red embed with failed test names for failures
- Automatic via cron on the Pi

## Pi Deployment

```bash
# Deploy test files to Pi
npm run sentinel:deploy

# First-time Pi setup
ssh pi@10.0.0.177
cd ~/sentinel && bash scripts/sentinel/setup-pi.sh
```

## Known Constraints

- Dev server: pages take 60-100s to compile on first request. Tests designed for prod.
- `waitUntil: 'load'` is too slow for dev server. Uses `domcontentloaded` + hydration retries.
- Route policy: `/api/sentinel` is in the auth skip list (`lib/auth/route-policy.ts`).
- Prod server must be rebuilt after code changes for tests to reflect latest code.
- SSL cert test uses hardcoded `app.cheflowhq.com` (not baseURL) to verify HTTPS specifically.
