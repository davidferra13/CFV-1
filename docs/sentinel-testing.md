# Sentinel Testing Framework

Always-on Playwright QA system designed to run on the Raspberry Pi against production.

## Architecture

```
Pi (cron) --> Playwright --> app.cheflowhq.com --> Discord webhook (alerts)
```

**4 test tiers:**

| Tier | Name              | Schedule         | What it tests                                    |
| ---- | ----------------- | ---------------- | ------------------------------------------------ |
| T0   | Smoke             | Every 4h         | Site alive, sign-in, dashboard, public pages     |
| T1   | Critical Paths    | Daily 6AM        | Full CRUD flows (events, clients, recipes)       |
| T2   | Data Verification | Daily 11:15PM    | Schema integrity, financial consistency          |
| T3   | Regression        | Weekly (Sun 3AM) | Edge cases, concurrent sessions, deep navigation |

## File Locations

| What            | Where                                        |
| --------------- | -------------------------------------------- |
| Config          | `playwright.sentinel.config.ts`              |
| Test specs      | `tests/sentinel/*.spec.ts`                   |
| Helpers         | `tests/sentinel/helpers/sentinel-utils.ts`   |
| Health API      | `app/api/sentinel/health/route.ts`           |
| Sync Status API | `app/api/sentinel/sync-status/route.ts`      |
| Pi setup        | `scripts/sentinel/setup-pi.sh`               |
| Pi deploy       | `scripts/sentinel/deploy-to-pi.sh`           |
| Spec            | `docs/specs/openclaw-playwright-sentinel.md` |

## Running Locally

```bash
# Against dev server (slow, pages compile on demand)
npm run test:sentinel:smoke

# Against production (fast, recommended)
SENTINEL_BASE_URL=https://app.cheflowhq.com npm run test:sentinel:smoke

# Individual tiers
npm run test:sentinel:critical
npm run test:sentinel:data
npm run test:sentinel:regression

# All tiers
npm run test:sentinel:full
```

## Agent Credentials

Tests use the agent account from `.auth/agent.json` or env vars `SENTINEL_EMAIL`/`SENTINEL_PASSWORD`.

## Sign-In Strategy

React controlled inputs require `pressSequentially()` (not `fill()`) to trigger `onChange`. The sign-in helper includes a hydration retry loop because Next.js dev server delays React hydration significantly.

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
