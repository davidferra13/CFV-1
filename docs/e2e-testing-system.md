# E2E Testing System

## What This Is

A self-running automated test mission that logs in as a test user, seeds realistic mock data across every major table, and exercises every major user flow — then reports what passed and what failed. Zero manual clicking required.

---

## How to Run

```bash
# Full suite (globalSetup seeds + all 15 spec files)
npm run test:e2e:full

# Chef portal only (fastest feedback loop)
npm run test:e2e:chef

# Client portal only
npm run test:e2e:client

# Smoke tests (no auth — fastest, 6 tests)
npm run test:e2e:smoke

# Interactive UI mode (watch + re-run, great for debugging)
npm run test:e2e:ui

# View last HTML report (opens in browser)
npm run test:e2e:report

# Seed only (without running tests)
npm run seed:e2e

# Clean up test users from remote Supabase
npm run cleanup:e2e
```

---

## Architecture

### Test Users

All test data is namespaced to date-based email addresses:
- Chef: `e2e.chef.YYYYMMDD@chefflow.test`
- Client: `e2e.client.YYYYMMDD@chefflow.test`

Re-running the seed on the same day is idempotent (upsert on conflict). Each new calendar day creates fresh test users. Running `npm run cleanup:e2e` removes all `*@chefflow.test` users.

### Auth Strategy

`tests/helpers/global-setup.ts` runs once before all tests. It seeds data, then POSTs to `/api/e2e/auth` (bypassing the rate-limited signIn server action) to establish sessions, saving `.auth/chef.json` and `.auth/client.json`.

The `/api/e2e/auth` endpoint is guarded by `SUPABASE_E2E_ALLOW_REMOTE=true`. Never set this in production.

### Playwright Projects

| Project | Tests | Auth |
|---------|-------|------|
| smoke | tests/smoke/** | None |
| chef | tests/e2e/01-13 | .auth/chef.json |
| client | tests/e2e/14 | .auth/client.json |
| public | tests/e2e/15 | None |

### Seed Data

1 chef, 4 clients, 5 events (one per FSM state), 3 quotes, 2 inquiries, 1 menu (3 courses), 1 recipe, 2 expenses, 2 ledger entries.

---

## Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://luefkpakzvxcsqroxyhz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_E2E_ALLOW_REMOTE=true
NEXT_PUBLIC_SITE_URL=http://localhost:3100
```

---

## Spec Files (117 tests across 15 files)

| File | What It Tests |
|------|--------------|
| 01-auth | Session persistence, role routing, sign-out |
| 02-dashboard | Dashboard load, navigation, New Event button |
| 03-clients | Client list, detail pages, create form |
| 04-inquiries | Inquiry list, detail, status pipeline |
| 05-quotes | Quote list, detail, amount display |
| 06-events-crud | Event list, status filters, create form |
| 07-events-fsm | FSM transition buttons |
| 08-events-detail-panels | Pack, financial, debrief, invoice, travel sub-pages |
| 09-events-documents | PDF generation API smoke tests |
| 10-financials | Financials dashboard, expense list |
| 11-menus | Menu list, detail, course structure |
| 12-recipes | Recipe list, detail, scaling widget, create form |
| 13-settings | All settings pages load, profile prefill |
| 14-client-portal | Client my-events, my-quotes, my-chat, my-profile |
| 15-public-pages | Landing page, pricing, contact, chef public profile |

---

## Application Bugs Discovered by the Suite

These are real bugs — the tests are correctly failing.

### 1. Events RLS Infinite Recursion (Critical)
Code: `42P17 — infinite recursion detected in policy for relation "events"`
Affects: Dashboard stats, events list, event detail, financials, AAR, client events
Likely cause: The collaboration system migration (`20260304000008_chef_collaboration_system.sql`) added an RLS policy that checks events membership from within an events policy — creating a circular reference.
Fix: Review RLS policies for the events table in Supabase dashboard, removing the circular reference.

### 2. Recipe Shares Ambiguous FK (Minor)
Code: `PGRST201`
Affects: Dashboard recipe shares widget
Fix: Use explicit FK hint in the query: `recipes!recipe_shares_original_recipe_id_fkey(...)`

### 3. Stale Webpack Chunk (Transient / Dev Only)
Error: `Cannot find module './38948.js'`
Affects: First visit to home page after a stale .next build
Fix: Delete `.next` and restart the dev server. Resolves automatically.

---

## How to Add a New Spec

1. Create `tests/e2e/NN-feature.spec.ts`
2. Import from `../helpers/fixtures` (not @playwright/test directly)
3. Use `seedIds` fixture for entity UUIDs:
   ```typescript
   import { test, expect } from '../helpers/fixtures'
   test('event detail loads', async ({ page, seedIds }) => {
     await page.goto(`/events/${seedIds.eventIds.confirmed}`)
     await expect(page).toHaveURL(/\/events\//)
   })
   ```

---

## Security Notes

- `/api/e2e/auth` is gated behind `SUPABASE_E2E_ALLOW_REMOTE=true`
- Must NEVER be set on production (Vercel deployment)
- `/api/e2e` is whitelisted in `middleware.ts` for unauthenticated access
- `.auth/` is in `.gitignore` — session tokens never commit to git
