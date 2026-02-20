# ChefFlow E2E Testing System

## Overview

An automated end-to-end testing suite that acts as a "test user on a mission" — it logs into ChefFlow as both a chef and a client, seeds realistic mock data across every major table, and exercises every major user flow. Uses Playwright for browser automation and Supabase Admin API for data seeding.

---

## Architecture

```
npx playwright test
  │
  ├── globalSetup (once before all tests)
  │   ├── seeds remote Supabase with test data (idempotent)
  │   ├── logs in as test chef → saves .auth/chef.json
  │   └── logs in as test client → saves .auth/client.json
  │
  ├── Project: smoke   — tests/smoke/**    (no auth)
  ├── Project: chef    — tests/e2e/01-13   (chef storageState)
  ├── Project: client  — tests/e2e/14      (client storageState)
  └── Project: public  — tests/e2e/15      (no auth)
```

### Key Files

| File | Role |
|---|---|
| `tests/helpers/e2e-seed.ts` | Comprehensive seed logic — creates chef, clients, events, quotes, menus, recipes |
| `tests/helpers/global-setup.ts` | Playwright `globalSetup` — seeds data + saves auth state |
| `tests/helpers/fixtures.ts` | Extends `test` with `seedIds` fixture (IDs of seeded entities) |
| `scripts/seed-e2e-remote.ts` | CLI entry point: `npm run seed:e2e` |
| `scripts/cleanup-e2e-data.ts` | CLI cleanup: `npm run cleanup:e2e` |
| `playwright.config.ts` | Playwright config — projects, globalSetup, workers |
| `tests/helpers/test-utils.ts` | `ROUTES` constant, helper utilities |

---

## Test User Namespace

All test data uses a date-based suffix (YYYYMMDD) for isolation:

- Chef: `e2e.chef.20260219@chefflow.test`
- Client: `e2e.client.20260219@chefflow.test`

Re-running the seed on the same day is **idempotent** (upsert on conflict). The suffix changes each day, creating fresh test data. Previous day's data can be removed with `npm run cleanup:e2e`.

To force a specific suffix (e.g. for debugging):
```
E2E_ISOLATION_SUFFIX=20260215 npm run seed:e2e
```

---

## What the Seed Creates

| Entity | Count | Notes |
|---|---|---|
| Chef auth user | 1 | `e2e.chef.{suffix}@chefflow.test` |
| Chef profile | 1 | Slug: `e2e-chef-{suffix}`, name: `TEST - E2E Kitchen` |
| Clients | 4 | Alice (has auth), Bob, Carol (inactive), Dave |
| Inquiries | 2 | awaiting_chef, awaiting_client |
| Events | 5 | draft, proposed, paid, confirmed, completed |
| Quotes | 3 | draft ($740), sent ($930), accepted ($500) |
| Ledger entries | 2 | Deposit on paid event, final payment on completed |
| Expenses | 2 | Groceries + equipment on completed event |
| Menu | 1 | Template with 3 courses (dishes) |
| Recipe | 1 | Lemon Butter Pasta |

**Important:** The `paid` event is inserted directly with `status: 'paid'` using the service role key — this bypasses the Stripe webhook requirement, allowing full FSM testing from `paid → confirmed → in_progress → completed`.

---

## Running Tests

### Prerequisites

Add to `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard → Settings → API>
SUPABASE_E2E_ALLOW_REMOTE=true
```

Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must already be set.

### Commands

```bash
# Seed only (useful for verifying seed works before running tests)
npm run seed:e2e

# Run smoke tests (fastest — no auth needed, no seed dependency)
npm run test:e2e:smoke

# Run full suite (seeds + all 15 spec files)
npm run test:e2e:full

# Run only chef-facing tests
npm run test:e2e:chef

# Run only client portal tests
npm run test:e2e:client

# Open Playwright interactive UI (useful for debugging)
npm run test:e2e:ui

# View HTML report from last run
npm run test:e2e:report

# Delete all *@chefflow.test users from remote Supabase
npm run cleanup:e2e
```

### Development Server

Playwright auto-starts the Next.js dev server on port 3100. If it's already running, it reuses the existing server. The seed always runs against the remote Supabase configured in `.env.local`.

---

## Spec Files

| File | What it tests | Project |
|---|---|---|
| `smoke/auth.spec.ts` | Sign-in page renders, unauthenticated redirects | smoke |
| `e2e/01-auth.spec.ts` | Chef session, role routing, sign-out | chef |
| `e2e/02-dashboard.spec.ts` | Dashboard loads, key elements visible | chef |
| `e2e/03-clients.spec.ts` | Client list, detail, create form | chef |
| `e2e/04-inquiries.spec.ts` | Inquiry list, detail, status filters | chef |
| `e2e/05-quotes.spec.ts` | Quote list, detail, amounts, new form | chef |
| `e2e/06-events-crud.spec.ts` | Event list, CRUD, status display | chef |
| `e2e/07-events-fsm.spec.ts` | Correct transition buttons per FSM state | chef |
| `e2e/08-events-detail-panels.spec.ts` | Pack, financial, debrief, invoice sub-pages | chef |
| `e2e/09-events-documents.spec.ts` | PDF generation API smoke tests | chef |
| `e2e/10-financials.spec.ts` | Financial dashboard, expenses list | chef |
| `e2e/11-menus.spec.ts` | Menu list, detail, course structure | chef |
| `e2e/12-recipes.spec.ts` | Recipe list, detail, create form | chef |
| `e2e/13-settings.spec.ts` | All settings pages load without 500 | chef |
| `e2e/14-client-portal.spec.ts` | Client events, quotes, profile, rewards | client |
| `e2e/15-public-pages.spec.ts` | Home, pricing, contact, chef profile, inquiry | public |

---

## Adding New Tests

1. Create a spec file in `tests/e2e/` with a number prefix matching its execution order
2. Import from fixtures: `import { test, expect } from '../helpers/fixtures'`
3. Use `seedIds` fixture for dynamic entity IDs
4. Use `ROUTES` from `test-utils.ts` for navigation
5. Follow the pattern: navigate → wait for networkidle → assert visibility

```typescript
import { test, expect } from '../helpers/fixtures'
import { ROUTES } from '../helpers/test-utils'

test.describe('New Feature', () => {
  test('feature page loads', async ({ page, seedIds }) => {
    await page.goto(`/some-page/${seedIds.eventIds.confirmed}`)
    await expect(page.getByText('Expected Content')).toBeVisible({ timeout: 10_000 })
  })
})
```

---

## Troubleshooting

**globalSetup fails with "seed refused"**
→ Add `SUPABASE_E2E_ALLOW_REMOTE=true` to `.env.local`

**globalSetup fails with "Chef login did not redirect to /dashboard"**
→ The seed ran but the sign-in UI has a different redirect or form structure. Check `tests/helpers/global-setup.ts` login selectors.

**Tests fail with "Could not read .auth/seed-ids.json"**
→ Run `npm run test:e2e:full` (not individual spec files) — globalSetup must run first.

**Test data looks stale (wrong date suffix)**
→ Set `E2E_ISOLATION_SUFFIX=YYYYMMDD` to today's date explicitly, or run `npm run cleanup:e2e` then re-seed.

**Document PDF tests return 404**
→ The document type may not be implemented for that event state. Check `/api/documents/[eventId]/route.ts`.

---

## Refresh Cadence

- **Daily CI:** Run `npm run cleanup:e2e` (previous day's data) → `npm run test:e2e:full` (fresh seed)
- **Manual dev:** Run `npm run seed:e2e` once per day. The seed is idempotent — re-running is always safe.
- **After schema changes:** Re-run `npm run seed:e2e` to verify seed still works against new schema.
