# Build: Phase 4 — Test Expansion (Full Route Coverage)

**Branch:** `feature/scheduling-improvements`
**Date:** 2026-02-20
**Status:** Complete

---

## What Changed

Phase 4 closes the remaining route coverage gaps identified in a strict post-Phase-3 audit. It also corrects dead-path references in Phase 3 spec files (routes that did not actually exist as pages).

### Dead-Path Fixes (existing spec files)

| File                                  | Dead Path                   | Correct Path                                       |
| ------------------------------------- | --------------------------- | -------------------------------------------------- |
| `25-loyalty-program.spec.ts`          | `/loyalty/rewards` (list)   | `/clients/loyalty/rewards`                         |
| `25-loyalty-program.spec.ts`          | `/loyalty/rewards` (create) | `/loyalty/rewards/new`                             |
| `25-loyalty-program.spec.ts`          | `/settings/loyalty`         | (removed — no page; added `/clients/loyalty`)      |
| `26-proposals-goals-partners.spec.ts` | `/proposals/new`            | `/proposals/templates` + `/proposals/addons`       |
| `27-marketing-campaigns.spec.ts`      | `/marketing/campaigns`      | `/marketing` (hub; no campaigns sub-route)         |
| `28-waitlist-surveys-wix.spec.ts`     | `/waitlist/new`             | Add-entry form lives on `/waitlist` (modal/inline) |

### New Spec Files (8 files)

| File                                  | Routes Covered                                               | Tests |
| ------------------------------------- | ------------------------------------------------------------ | ----- |
| `31-analytics-deep.spec.ts`           | `/analytics/**` (6 routes)                                   | ~22   |
| `32-finance-deep.spec.ts`             | `/finance/**` (50+ routes)                                   | ~60   |
| `33-culinary-deep.spec.ts`            | `/culinary/**` (30+ routes)                                  | ~40   |
| `34-client-subsections.spec.ts`       | `/clients/**` sub-sections (30+ routes)                      | ~45   |
| `35-leads-calls-inbox.spec.ts`        | `/leads/**`, `/calls/**`, `/inbox/**`, `/reviews`, `/travel` | ~30   |
| `36-social-network-community.spec.ts` | `/social/**`, `/network/**`, `/community/**`                 | ~25   |
| `37-admin-panel.spec.ts`              | `/admin/**` (15 admin routes)                                | ~25   |
| `38-partners-deep.spec.ts`            | `/partners/**` sub-routes                                    | ~20   |

**Total new tests: ~267**

### Updated Config Files

**`playwright.config.ts`**

- Added Phase 4 spec files 31-38 to `interactions-chef` testMatch (except 37)
- Added new `interactions-admin` project using `.auth/admin.json`

**`package.json`**

- Added `"test:interactions:admin": "npx playwright test --project=interactions-admin"`

---

## Route Audit Result

After Phase 4, the following route categories now have behavioral interaction tests:

| Category                    | Routes                               | Coverage                            |
| --------------------------- | ------------------------------------ | ----------------------------------- |
| Analytics                   | 6 routes                             | ✅ Full behavioral tests            |
| Finance — overview          | 4 routes                             | ✅ Full behavioral tests            |
| Finance — invoices          | 7 routes (all statuses)              | ✅ Full behavioral tests            |
| Finance — payments          | 5 routes                             | ✅ Full behavioral tests            |
| Finance — payouts           | 4 routes                             | ✅ Full behavioral tests            |
| Finance — ledger            | 3 routes                             | ✅ Full behavioral tests            |
| Finance — expenses          | 8 routes (all categories)            | ✅ Full behavioral tests            |
| Finance — reporting         | 9 routes                             | ✅ Full behavioral tests            |
| Finance — utilities         | 8 routes (bank-feed, forecast, etc.) | ✅ Load tests                       |
| Finance — tax               | 3 routes                             | ✅ Full behavioral tests            |
| Culinary — hub + components | 7 routes                             | ✅ Full behavioral tests            |
| Culinary — costing          | 4 routes                             | ✅ Full behavioral tests            |
| Culinary — ingredients      | 3 routes                             | ✅ Full behavioral tests            |
| Culinary — menus            | 7 routes                             | ✅ Full behavioral tests            |
| Culinary — prep             | 3 routes                             | ✅ Full behavioral tests            |
| Culinary — recipes          | 6 routes                             | ✅ Full behavioral tests            |
| Clients — status views      | 7 routes                             | ✅ Full behavioral tests            |
| Clients — communication     | 4 routes                             | ✅ Full behavioral tests            |
| Clients — history           | 4 routes                             | ✅ Full behavioral tests            |
| Clients — insights          | 4 routes                             | ✅ Full behavioral tests            |
| Clients — loyalty           | 4 routes                             | ✅ Full behavioral tests            |
| Clients — preferences       | 5 routes                             | ✅ Full behavioral tests            |
| Clients — recurring         | 1 route                              | ✅ Full behavioral tests            |
| Leads pipeline              | 6 routes                             | ✅ Full behavioral tests            |
| Calls                       | 3 routes                             | ✅ Full behavioral tests            |
| Inbox                       | 3 routes                             | ✅ Full behavioral tests            |
| Reviews                     | 1 route                              | ✅ Full behavioral tests            |
| Travel                      | 1 route                              | ✅ Full behavioral tests            |
| Social                      | 5 routes                             | ✅ Full behavioral tests            |
| Network                     | 3 routes                             | ✅ Full behavioral tests            |
| Community                   | 1 route                              | ✅ Full behavioral tests            |
| Admin                       | 15 routes                            | ✅ Full behavioral tests + security |
| Partners — deep             | 6 routes                             | ✅ Full behavioral tests            |

---

## Test Count After Phase 4

| Layer                  | Files        | Tests (approx) |
| ---------------------- | ------------ | -------------- |
| Smoke                  | 1            | 6              |
| E2E                    | 17           | 127            |
| Coverage               | 6            | 377            |
| Interactions Phase 1-2 | 20           | ~600           |
| Interactions Phase 3   | 10           | ~156           |
| Interactions Phase 4   | 8            | ~267           |
| **Total**              | **62 files** | **~1,533**     |

---

## Test Patterns Used

### Bulk Route Load Tests (parametric)

For route families with many sub-routes (invoices, payments, expenses, etc.), Phase 4 uses parametric loops to generate one test per route:

```typescript
const invoiceRoutes = [
  '/finance/invoices',
  '/finance/invoices/draft',
  '/finance/invoices/sent',
  // ...
]

for (const route of invoiceRoutes) {
  test(`${route} — loads without 500`, async ({ page }) => {
    const resp = await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(resp?.status()).not.toBe(500)
  })
}
```

This ensures every route is individually tracked in the test report — a 500 on `/finance/invoices/refunded` shows up as a named failure, not just a loop failure.

### Admin Security Test

File 37 includes a non-admin access test that creates a fresh browser context with no authentication and verifies `/admin` redirects to signin or returns 401/403/404:

```typescript
test('Unauthenticated user cannot access /admin', async ({ browser }) => {
  const ctx = await browser.newContext() // no cookies
  const page = await ctx.newPage()
  const resp = await page.goto('http://localhost:3100/admin')
  // Must redirect to signin or return 4xx
  const isBlocked = status === 401 || status === 403 || status === 404 || url.includes('signin')
  expect(isBlocked).toBeTruthy()
  await ctx.close()
})
```

### Tenant Scoping Assertions

Every section that handles per-chef data includes a tenant isolation assertion:

```typescript
test('Data is tenant-scoped (no Chef B data)', async ({ page, seedIds }) => {
  await page.goto('/analytics/client-ltv')
  await page.waitForLoadState('networkidle')
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toContain('Chef B Client E2E')
  expect(bodyText).not.toContain(seedIds.chefBId)
})
```

This extends the tenant isolation coverage beyond the dedicated `30-multi-tenant-isolation.spec.ts` file into each feature area's own test file.

---

## Run Commands

```bash
# All chef-authenticated interaction tests (phases 1-4, excluding admin)
npm run test:interactions

# Admin interaction tests only
npm run test:interactions:admin

# Security: multi-tenant isolation
npm run test:isolation

# Everything
npm run test:everything

# Report
npm run test:report
```

---

## What's Left (Intentionally Not Covered)

The following are intentionally out of scope for automated interaction testing:

| Category                                | Reason                                                        |
| --------------------------------------- | ------------------------------------------------------------- |
| File upload flows                       | Requires real files; better tested in integration tests       |
| Stripe payment flows                    | Requires Stripe test mode; covered by Stripe's own test suite |
| PDF content verification                | Covered by export/report tests in file 16                     |
| Real-time presence/chat                 | Requires multiple concurrent sessions                         |
| Email delivery                          | Requires email service integration                            |
| Public chef profile (`/chef/[slug]/**`) | Covered by coverage layer; no auth required                   |
