# Spec: OpenClaw Playwright Sentinel

> **Status:** draft
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-29
> **Built by:** not started

---

## What This Does (Plain English)

Turns the Raspberry Pi into an always-on QA sentinel that automatically tests ChefFlow on a schedule. The Pi runs Playwright against the live production site (`app.cheflowhq.com`), verifies critical user flows work, confirms OpenClaw data sync landed correctly, and notifies you via Discord when something breaks. You wake up to either silence (all good) or a Discord ping telling you exactly what failed.

---

## Why It Matters

ChefFlow is nearly feature-complete with ~295 pages, but has zero automated monitoring. The Pi already runs 24/7 for price scraping and has unused capacity (Cloudflare tunnel routing to nothing, Docker containers with Discord integration). This spec closes the loop: the system that feeds data to ChefFlow also verifies ChefFlow consumed it correctly. No human in the loop.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│  Raspberry Pi (10.0.0.177)                                     │
│                                                                 │
│  ~/chefflow-sentinel/              (NEW - test runner home)    │
│  ├── tests/                        (test specs, copied from PC)│
│  ├── results/                      (JSON reports, screenshots) │
│  ├── scripts/                                                   │
│  │   ├── run-smoke.sh              (smoke suite runner)        │
│  │   ├── run-full.sh               (full suite runner)         │
│  │   ├── run-post-sync.sh          (data verification runner)  │
│  │   ├── notify-discord.sh         (failure → Discord webhook) │
│  │   └── auth-bootstrap.mjs        (sign in, save cookie)     │
│  ├── .auth/                        (saved auth state)          │
│  └── playwright.sentinel.config.ts                              │
│                                                                 │
│  CRON:                                                          │
│  ├── Every 4h: run-smoke.sh        (site alive?)               │
│  ├── 6:00 AM:  run-full.sh         (full regression)           │
│  ├── 11:15 PM: run-post-sync.sh    (data landed?)              │
│  └── On failure: notify-discord.sh (ping you)                  │
│                                                                 │
│  Target: https://app.cheflowhq.com (via Cloudflare Tunnel)     │
│  Auth: Normal sign-in flow (not /api/e2e/auth - blocked in prod)│
└────────────────────────────────────────────────────────────────┘
```

---

## The Four Phases

### Phase 1: Test Surface Map (PC-side, ChefFlow repo)

Organize the existing 140+ test files into a clear test map. Create a new `tests/sentinel/` directory with lightweight, fast-running specs designed for remote execution. These are NOT duplicates of existing tests; they are purpose-built for the Pi's constraints (ARM64, limited RAM, network latency to prod).

**Test tiers:**

| Tier | Name              | What it tests                                                                           | Run time target | Schedule              |
| ---- | ----------------- | --------------------------------------------------------------------------------------- | --------------- | --------------------- |
| T0   | Smoke             | Site loads, sign-in works, dashboard renders, public pages respond                      | < 60s           | Every 4 hours         |
| T1   | Critical Paths    | Inquiry pipeline, event creation, recipe CRUD, client portal, financial pages           | < 5 min         | Daily 6 AM            |
| T2   | Data Verification | Price sync landed, ingredients updated, price catalog populated, /discover has listings | < 2 min         | 11:15 PM (after sync) |
| T3   | Full Regression   | All T0 + T1 + T2 + edge cases (error states, empty states, auth boundaries)             | < 15 min        | Weekly Sunday 3 AM    |

### Phase 2: Pi Setup and Auth (Pi-side)

Install Playwright on the Pi, configure auth, and verify it can run tests against `app.cheflowhq.com`.

**Auth strategy:** The `/api/e2e/auth` endpoint returns 403 in production mode (`app/api/e2e/auth/route.ts:19`). The Pi must authenticate via the normal Auth.js sign-in form flow:

1. `auth-bootstrap.mjs` launches headless Chromium
2. Navigates to `https://app.cheflowhq.com/auth/signin`
3. Fills email/password from a local `.env` file (agent credentials)
4. Submits the form, waits for redirect to `/dashboard`
5. Saves `storageState` to `.auth/sentinel.json`
6. Subsequent test runs reuse the saved state (JWT lasts 30 days per `app/api/e2e/auth/route.ts:123`)
7. If a test gets 401, re-run bootstrap automatically

### Phase 3: Cron Scheduling (Pi-side)

Add cron jobs to the Pi's existing crontab (alongside the 17 price-intel jobs).

### Phase 4: Closed-Loop Data Verification (both sides)

The T2 tests run 15 minutes after the nightly price sync (11 PM). They verify:

1. **Price sync succeeded** - query `/api/cron/price-sync` response or check `ingredient_price_history` timestamps via a lightweight API endpoint
2. **Ingredients updated** - navigate to `/culinary/ingredients`, verify price columns show today's date
3. **Price catalog populated** - navigate to `/culinary/price-catalog`, verify store data loads
4. **Directory has listings** - navigate to `/discover`, verify listing count > 0 and search works
5. **Dashboard widgets reflect data** - check Weekly Price Briefing and Price Intelligence widgets render

---

## Files to Create

### On ChefFlow (PC repo)

| File                                       | Purpose                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `tests/sentinel/smoke.spec.ts`             | T0: Site alive, sign-in, dashboard renders, public pages                            |
| `tests/sentinel/critical-paths.spec.ts`    | T1: Inquiry, event, recipe, client, financial flows                                 |
| `tests/sentinel/data-verification.spec.ts` | T2: Price sync, ingredients, catalog, directory                                     |
| `tests/sentinel/regression.spec.ts`        | T3: Full regression (imports T0+T1+T2 + edge cases)                                 |
| `tests/sentinel/helpers/sentinel-utils.ts` | Auth bootstrap, result reporting, screenshot helpers                                |
| `playwright.sentinel.config.ts`            | Sentinel-specific Playwright config (targets prod URL)                              |
| `scripts/sentinel/deploy-to-pi.sh`         | SCP test files + config to Pi                                                       |
| `scripts/sentinel/setup-pi.sh`             | Install Playwright + deps on Pi (one-time)                                          |
| `app/api/sentinel/health/route.ts`         | Lightweight health endpoint for smoke tests (no auth, returns build ID + timestamp) |
| `app/api/sentinel/sync-status/route.ts`    | Returns last sync timestamp + counts (cron-auth gated)                              |

### On Pi (deployed via script)

| File                                             | Purpose                                      |
| ------------------------------------------------ | -------------------------------------------- |
| `~/chefflow-sentinel/scripts/run-smoke.sh`       | Runs T0, reports result, notifies on failure |
| `~/chefflow-sentinel/scripts/run-full.sh`        | Runs T0+T1, reports result                   |
| `~/chefflow-sentinel/scripts/run-post-sync.sh`   | Runs T2, reports result                      |
| `~/chefflow-sentinel/scripts/run-regression.sh`  | Runs T3 (weekly)                             |
| `~/chefflow-sentinel/scripts/notify-discord.sh`  | Posts failure details to Discord webhook     |
| `~/chefflow-sentinel/scripts/auth-bootstrap.mjs` | Sign in via form, save storageState          |

---

## Files to Modify

| File                       | What to Change                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `package.json`             | Add `test:sentinel:smoke`, `test:sentinel:full`, `test:sentinel:data`, `test:sentinel:deploy` scripts |
| `.github/workflows/ci.yml` | No changes (sentinel runs on Pi, not GitHub Actions)                                                  |

---

## Database Changes

None. Test results stored as JSON files on the Pi, not in PostgreSQL.

---

## Server Actions

### New API Routes (lightweight, no UI)

| Route                           | Auth                     | Purpose                  | Response                                                                     |
| ------------------------------- | ------------------------ | ------------------------ | ---------------------------------------------------------------------------- |
| `GET /api/sentinel/health`      | None (public)            | Smoke test target        | `{ ok: true, buildId: string, upSince: string, timestamp: string }`          |
| `GET /api/sentinel/sync-status` | Cron auth (Bearer token) | Data verification target | `{ lastSync: string, ingredientsUpdated: number, priceHistoryRows: number }` |

---

## Test Specs (What Each Test Does)

### T0: Smoke (`tests/sentinel/smoke.spec.ts`)

```
1. GET /api/sentinel/health → 200, has buildId
2. GET / → 200, page has "ChefFlow" text
3. GET /discover → 200, has listing cards
4. GET /auth/signin → 200, has sign-in form
5. Sign in with agent credentials → redirected to /dashboard
6. Dashboard loads, has "Dashboard" heading
7. Navigate to /events → page loads
8. Navigate to /clients → page loads
9. Navigate to /inquiries → page loads
10. Sign out → redirected to public page
```

### T1: Critical Paths (`tests/sentinel/critical-paths.spec.ts`)

```
INQUIRY PIPELINE:
1. Navigate to /inquiries/new
2. Fill minimum fields (client name, occasion, date)
3. Submit → inquiry created, redirected to detail
4. Verify inquiry appears in /inquiries list

EVENT LIFECYCLE:
5. Navigate to /events
6. Verify event list loads (existing test data)
7. Click into an event → 4 tabs render (Overview, Money, Ops, Wrap-Up)

RECIPES:
8. Navigate to /recipes
9. Verify recipe list loads
10. Click into a recipe → detail page renders

CLIENT PORTAL:
11. Sign out, sign in as client
12. Navigate to /my-events → list renders
13. Click an event → detail loads

FINANCIALS:
14. Sign back in as chef
15. Navigate to /financials → summary cards render
16. Navigate to /finance → hub links render
```

### T2: Data Verification (`tests/sentinel/data-verification.spec.ts`)

```
PRICE SYNC:
1. GET /api/sentinel/sync-status (with cron auth) → lastSync within 24h
2. Navigate to /culinary/ingredients → at least 1 ingredient has a price
3. Verify PriceAttribution component renders (store name, confidence dot)

PRICE CATALOG:
4. Navigate to /culinary/price-catalog → stats bar shows >0 ingredients
5. Search for "chicken" → results appear
6. Expand a result → per-store prices visible

DIRECTORY:
7. Navigate to /discover → stats show >0 listings
8. Search for "restaurant" → results appear
9. Click a listing → detail loads

DASHBOARD WIDGETS:
10. Navigate to /dashboard
11. Verify Price Intelligence widget renders (or gracefully shows empty)
12. Verify Weekly Briefing widget renders (or gracefully shows empty)
```

### T3: Full Regression (`tests/sentinel/regression.spec.ts`)

Runs all T0 + T1 + T2 specs, plus:

```
AUTH BOUNDARIES:
1. Unauthenticated access to /dashboard → redirected to sign-in
2. Client cannot access /admin/* → redirected
3. Staff can access /staff-dashboard

ERROR STATES:
4. Navigate to a non-existent route → 404 page renders
5. Invalid event ID → error state (not blank screen)

EMPTY STATES:
6. Verify pages handle zero-data gracefully (no blank screens, no fake zeros)

CROSS-PORTAL:
7. Chef creates data, client sees it (or appropriate subset)
```

---

## Pi Configuration (Setup Script)

### `scripts/sentinel/setup-pi.sh`

```bash
#!/bin/bash
# One-time setup on the Pi

# 1. Install Playwright and Chromium (ARM64)
cd ~/chefflow-sentinel
npm init -y
npm install @playwright/test
npx playwright install --with-deps chromium

# 2. Create .env with credentials
cat > .env << 'EOF'
SENTINEL_EMAIL=agent@local.chefflow
SENTINEL_PASSWORD=CHEF.jdgyuegf9924092.FLOW
SENTINEL_BASE_URL=https://app.cheflowhq.com
CRON_SECRET=<matching secret from ChefFlow .env.local>
DISCORD_WEBHOOK_URL=<webhook URL from claw-swarm Discord>
EOF

# 3. Bootstrap auth (first run)
node scripts/auth-bootstrap.mjs

# 4. Add cron jobs
(crontab -l 2>/dev/null; cat << 'CRON'
# ChefFlow Sentinel - Playwright monitoring
0 */4 * * * cd ~/chefflow-sentinel && bash scripts/run-smoke.sh >> logs/smoke.log 2>&1
0 6 * * * cd ~/chefflow-sentinel && bash scripts/run-full.sh >> logs/full.log 2>&1
15 23 * * * cd ~/chefflow-sentinel && bash scripts/run-post-sync.sh >> logs/post-sync.log 2>&1
0 3 * * 0 cd ~/chefflow-sentinel && bash scripts/run-regression.sh >> logs/regression.log 2>&1
CRON
) | crontab -

# 5. Create log directory
mkdir -p ~/chefflow-sentinel/logs ~/chefflow-sentinel/results ~/chefflow-sentinel/.auth
```

### Cron Schedule (merged with existing Pi cron)

| Time                      | Existing Job           | New Sentinel Job          |
| ------------------------- | ---------------------- | ------------------------- |
| 2:00 AM Mon               | Government data scrape | -                         |
| 3:00 AM daily             | Flipp API              | -                         |
| 3:00 AM Sunday            | -                      | **T3: Full regression**   |
| 4:00 AM daily             | Cross-match round 1    | -                         |
| 5:00 AM daily             | Whole Foods scrape     | -                         |
| 6:00 AM daily             | Target scrape          | **T1: Critical paths**    |
| Every 4h (0,4,8,12,16,20) | -                      | **T0: Smoke**             |
| 7:30 AM alternating       | Instacart bulk         | -                         |
| 9:00 AM daily             | Cross-match round 2    | -                         |
| 10:00 AM daily            | Aggregator             | -                         |
| 11:00 PM daily            | Price sync to ChefFlow | -                         |
| 11:15 PM daily            | -                      | **T2: Data verification** |

### Discord Notification Format

```
🔴 ChefFlow Sentinel FAILED
Suite: T0 Smoke
Time: 2026-03-29 08:00:05 EDT
Duration: 47s
Failed: 2/10 tests

❌ Dashboard loads → Timeout waiting for heading
❌ Events page loads → 500 Internal Server Error

Last success: 2026-03-29 04:00:03 EDT
Report: ~/chefflow-sentinel/results/smoke-20260329-0800.json
```

---

## Edge Cases and Error Handling

| Scenario                                    | Correct Behavior                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| Pi can't reach `app.cheflowhq.com`          | Smoke fails, Discord notification says "site unreachable", does not retry (Anti-Loop) |
| Auth state expired (30-day JWT)             | `auth-bootstrap.mjs` re-runs automatically before test suite                          |
| Auth state expired AND sign-in page changed | Notify Discord "auth bootstrap failed", skip test run                                 |
| Pi runs out of disk (screenshots)           | Results older than 7 days auto-pruned by weekly cron                                  |
| Chromium OOM on Pi (8GB RAM)                | Each test suite runs with `--workers=1` and closes browser between suites             |
| Price sync didn't run (dev server was off)  | T2 detects stale `lastSync` timestamp, reports as data failure (not site failure)     |
| Test flake (network timeout)                | Each test gets 1 retry (`retries: 1` in sentinel config). Flake = pass on retry       |
| Discord webhook is down                     | Failure logged to `logs/` only. No retry on Discord (non-blocking side effect)        |
| Multiple failures in one run                | Single Discord message with all failures (not one message per test)                   |

---

## Verification Steps

1. **PC-side:** Run `npm run test:sentinel:smoke` against `localhost:3100` (dev server) to verify specs work
2. **PC-side:** Run `bash scripts/sentinel/deploy-to-pi.sh` to SCP files to Pi
3. **Pi-side:** SSH in, run `bash scripts/setup-pi.sh` to install Playwright
4. **Pi-side:** Run `node scripts/auth-bootstrap.mjs` to verify sign-in works against prod
5. **Pi-side:** Run `bash scripts/run-smoke.sh` manually, verify all 10 tests pass
6. **Pi-side:** Run `bash scripts/run-post-sync.sh` manually after a price sync, verify data checks pass
7. **Pi-side:** Trigger a test failure (stop the prod server), verify Discord notification arrives
8. **Pi-side:** Verify cron jobs are installed with `crontab -l`
9. **Wait 4 hours:** Verify smoke ran automatically (check `logs/smoke.log`)
10. **Wait for 11:15 PM:** Verify post-sync ran automatically after price sync

---

## Out of Scope

- **Not rewriting existing tests** - Sentinel tests are new, purpose-built for remote execution. Existing 140+ tests stay as-is for local development
- **Not adding CI/CD integration** - Sentinel runs on the Pi via cron, not GitHub Actions
- **Not building a test dashboard UI** - Results are JSON files on the Pi + Discord notifications. A dashboard is a future spec
- **Not testing Ollama/AI features from Pi** - AI features require local Ollama which only runs on the PC. Pi tests skip AI-dependent paths
- **Not testing mobile viewports from Pi** - Mobile tests stay local (existing `tests/mobile/`)
- **Not modifying the Cloudflare tunnel** - `beta.cheflowhq.com` stays as-is. Sentinel hits `app.cheflowhq.com` directly

---

## Notes for Builder Agent

### Pi Hardware Constraints

- **RAM:** 8GB. Chromium headless uses ~300-500MB. Leave headroom for price scrapers + Docker containers
- **CPU:** 4-core ARM Cortex-A76 @ 2.4GHz. Tests will be slower than PC. Budget 2-3x the time targets
- **Disk:** ~78GB free. Playwright install is ~400MB. Screenshots/results: budget 1GB rotating
- **Architecture:** ARM64 (aarch64). Playwright supports this via `npx playwright install --with-deps chromium`

### Auth Gotcha

`/api/e2e/auth` returns 403 in production (`app/api/e2e/auth/route.ts:19`). The soak tests already solve this by authenticating against the dev server (`soak-global-setup.ts:16`), but the Pi can't reach the dev server (it's on localhost:3100 on the PC). The Pi must use the normal sign-in form flow via `https://app.cheflowhq.com/auth/signin`.

### Existing Patterns to Follow

- `tests/helpers/fixtures.ts` - custom Playwright fixture pattern (use for sentinel too)
- `tests/experiential/helpers/experiential-utils.ts` - screenshot checkpoint pattern
- `tests/soak/soak-utils.ts` - report generation pattern
- `playwright.soak.config.ts` - example of a specialized config targeting a different port/server

### Discord Integration

The claw-swarm profile on the Pi already has Discord bot infrastructure. Check `~/.openclaw/openclaw.json` for the Discord webhook URL, or create a dedicated webhook for the `#sentinel` channel.

### Deploy Script Pattern

The deploy script (`scripts/sentinel/deploy-to-pi.sh`) should:

1. `rsync` or `scp` the `tests/sentinel/` directory to `pi:~/chefflow-sentinel/tests/`
2. Copy `playwright.sentinel.config.ts` to `pi:~/chefflow-sentinel/`
3. Copy runner scripts to `pi:~/chefflow-sentinel/scripts/`
4. Run `npm install` on the Pi (only if `package.json` changed)
5. NOT copy `.env` or `.auth/` (credentials stay on the Pi, set once during setup)

### Test Data

Sentinel tests should be **read-only where possible**. T0 (smoke) and T2 (data verification) are purely read-only. T1 (critical paths) creates an inquiry but this is safe since the agent account is a test account. T3 (regression) may create test data; it should clean up after itself.

### Result Retention

- JSON reports: keep 30 days
- Screenshots: keep 7 days
- Logs: rotate weekly (already in Pi's existing log rotation cron)

---

## Spec Validation

### 1. What exists today that this touches?

**Test infrastructure (PC):**

- `playwright.config.ts` (main, 11 projects) - NOT modified, sentinel has its own config
- `tests/helpers/` (global-setup.ts, fixtures.ts, e2e-seed.ts) - reuse patterns, not modified
- `tests/soak/soak-global-setup.ts:12-16` - documents the auth-on-dev-test-on-prod pattern we'll follow
- `tests/experiential/helpers/experiential-utils.ts` - screenshot/checkpoint pattern to reuse
- `package.json:43-222` - add 4 new scripts

**OpenClaw infrastructure (Pi):**

- `~/openclaw-prices/` - price scraper codebase, NOT modified
- Pi crontab (17 existing jobs) - 4 new jobs ADDED, nothing modified
- `~/.openclaw/openclaw.json` - read for Discord webhook config

**ChefFlow API routes:**

- `app/api/e2e/auth/route.ts:19` - confirms we CANNOT use this endpoint from Pi
- `app/api/cron/price-sync/route.ts` - existing, NOT modified
- `lib/auth/cron-auth.ts` - existing cron auth pattern, reused for sync-status endpoint

### 2. What exactly changes?

**Add (ChefFlow repo):**

- 4 new test spec files in `tests/sentinel/`
- 1 helper file in `tests/sentinel/helpers/`
- 1 new Playwright config (`playwright.sentinel.config.ts`)
- 2 new API routes (`/api/sentinel/health`, `/api/sentinel/sync-status`)
- 2 deploy/setup scripts in `scripts/sentinel/`
- 4 package.json scripts

**Add (Pi):**

- `~/chefflow-sentinel/` directory (entire new deployment)
- 6 shell/Node scripts
- 4 cron jobs

**Modify:**

- `package.json` (add scripts only)

### 3. What assumptions am I making?

| Assumption                                   | Verified?      | Evidence                                                                      |
| -------------------------------------------- | -------------- | ----------------------------------------------------------------------------- |
| Playwright runs on ARM64 Debian Bookworm     | Verified       | Playwright docs confirm ARM64 Linux support since v1.30                       |
| Pi has enough RAM (8GB) for Chromium         | Verified       | `reference_raspberry_pi.md` confirms 8GB; Chromium headless uses ~300-500MB   |
| Pi has enough disk (~78GB free)              | Verified       | `reference_raspberry_pi.md` confirms ~78GB free                               |
| Pi has Node 22                               | Verified       | `reference_raspberry_pi.md:9`                                                 |
| `/api/e2e/auth` blocked in prod              | Verified       | `app/api/e2e/auth/route.ts:19` - hard gate on NODE_ENV                        |
| JWT cookie lasts 30 days                     | Verified       | `app/api/e2e/auth/route.ts:123` - `maxAge: 30 * 24 * 60 * 60`                 |
| Normal sign-in form exists at `/auth/signin` | Verified       | `middleware.ts` + Auth.js v5 config                                           |
| Discord webhook exists on Pi                 | **Unverified** | Claw-swarm has Discord integration but exact webhook URL needs checking       |
| `app.cheflowhq.com` reachable from Pi        | **Unverified** | Pi has internet access for scraping; should work but untested for this domain |
| Agent account exists on prod database        | **Unverified** | Agent account setup via `npm run agent:setup` may only target dev DB          |

### 4. Where will this most likely break?

1. **Chromium on ARM64 Pi** - ARM Chromium can be flaky with certain GPU/rendering features. Mitigation: `--disable-gpu`, `--no-sandbox` flags
2. **Auth bootstrap via sign-in form** - If the sign-in form changes (field names, flow), the bootstrap script breaks silently. Mitigation: bootstrap script has explicit assertions on each step
3. **Network latency** - Pi to `app.cheflowhq.com` goes through the internet (not LAN). Tests need generous timeouts

### 5. What is underspecified?

- Discord webhook URL (needs to be looked up on the Pi)
- Whether agent account exists in prod database (needs verification)
- Exact Chromium launch flags for ARM64 stability

### 6. What dependencies or prerequisites exist?

- Dev server must be running on PC for price sync (already a known issue: `reference_raspberry_pi.md:71`)
- Prod server must be running on PC for `app.cheflowhq.com` to resolve
- Agent account must exist in the database the prod server connects to

### 7. What existing logic could this conflict with?

- **Cron timing:** T2 runs at 11:15 PM, price sync runs at 11:00 PM. If sync takes >15 min, T2 could run before sync completes. Mitigation: T2 checks `lastSync` timestamp, reports stale data instead of false failure
- **Pi resource contention:** Playwright tests running during Instacart scrape (7:30 AM) or Flipp scrape (3 AM) could cause OOM. Mitigation: smoke at 0,4,8,12,16,20 avoids 3 AM and 8 AM slots

### 8. What is the end-to-end data flow?

```
Cron triggers → Shell script → Playwright runs tests → JSON report saved
                                                      ↓
                                              If failures: notify-discord.sh
                                                      ↓
                                              Discord webhook → Your phone
```

### 9. What is the correct implementation order?

1. Create `tests/sentinel/` specs and `playwright.sentinel.config.ts` on PC
2. Create API routes (`/api/sentinel/health`, `/api/sentinel/sync-status`)
3. Verify specs pass locally (`npm run test:sentinel:smoke` against dev server)
4. Create deploy script and setup script
5. SSH to Pi, run setup script (install Playwright)
6. Deploy test files to Pi
7. Run auth bootstrap on Pi
8. Run smoke manually on Pi, verify it works
9. Add cron jobs
10. Verify Discord notifications work

### 10. What are the exact success criteria?

- [ ] `npm run test:sentinel:smoke` passes on PC against dev server
- [ ] `playwright install chromium` succeeds on Pi (ARM64)
- [ ] `auth-bootstrap.mjs` signs in to `app.cheflowhq.com` from Pi
- [ ] `run-smoke.sh` passes on Pi against prod
- [ ] `run-post-sync.sh` passes on Pi after a real price sync
- [ ] Intentional failure triggers Discord notification
- [ ] Cron jobs execute on schedule (verified via logs)
- [ ] No OOM or crashes on Pi during test execution

### 11. What are the non-negotiable constraints?

- **No client data leaves the PC** - Sentinel tests use the agent test account only
- **No mutations on prod from Pi** - T0 and T2 are read-only. T1 creates test inquiries under agent tenant only
- **Cron auth required** - `/api/sentinel/sync-status` uses the same `CRON_SECRET` pattern as price sync
- **Pi stability** - Sentinel must not interfere with existing price scraping cron jobs

### 12. What should NOT be touched?

- Existing `playwright.config.ts` and its 11 projects
- Existing `tests/e2e/`, `tests/experiential/`, `tests/soak/`, etc.
- Pi's `~/openclaw-prices/` directory
- Pi's existing cron jobs (add only, never modify)
- The Cloudflare tunnel configuration

### 13. Is this the simplest complete version?

Yes. The temptation is to build a web dashboard for test results, add Slack integration, build a test-on-PR workflow, etc. This spec delivers the core value (automated monitoring with notifications) with the minimum infrastructure. Dashboard and advanced features are future specs.

### 14. If implemented exactly as written, what would still be wrong?

1. **Agent account on prod** - If the agent account doesn't exist in the prod database, auth bootstrap will fail. This needs manual verification before Phase 2
2. **Flaky tests** - Remote tests over the internet will be flakier than local tests. The `retries: 1` setting helps but some tests may need longer timeouts than specified
3. **No historical trend tracking** - JSON files on the Pi give point-in-time results but no dashboard showing "test pass rate over the last 30 days." That's a future spec
4. **Discord-only notifications** - If you're not checking Discord, you miss failures. A future spec could add email or SMS

---

## Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

**Ready with 3 items to verify before Phase 2 (Pi deployment):**

1. Does the agent account exist in the production database? Run `npm run agent:setup` against the prod DB if needed
2. Can the Pi reach `app.cheflowhq.com` over the internet? Quick test: `ssh pi 'curl -s -o /dev/null -w "%{http_code}" https://app.cheflowhq.com'`
3. What is the Discord webhook URL? Check `~/.openclaw/openclaw.json` on the Pi or create a new webhook

These are runtime verifications, not spec gaps. The builder can resolve them during Phase 2 setup. The spec itself is complete.
