# Build: Phase 6 — Remaining Routes

**Branch:** `feature/scheduling-improvements`
**Date:** 2026-02-20
**Status:** Complete

---

## What Changed

Phase 6 closes the final route coverage gaps discovered after a strict post-Phase-5 audit. Every route listed below had zero tests across all 40 prior spec files.

### New Spec File

**`tests/interactions/41-remaining-routes.spec.ts`**

| Route Group                | Routes                                                                | Tests |
| -------------------------- | --------------------------------------------------------------------- | ----- |
| Queue                      | `/queue`                                                              | 3     |
| Import                     | `/import`                                                             | 3     |
| Help                       | `/help`, `/help/[slug]`                                               | 4     |
| Insights                   | `/insights`, `/insights/time-analysis`                                | 5     |
| Schedule (top-level)       | `/schedule`                                                           | 3     |
| Activity                   | `/activity`                                                           | 4     |
| Financials (chef view)     | `/financials`                                                         | 4     |
| Operations                 | `/operations`, `/operations/kitchen-rentals`, `/operations/equipment` | 7     |
| Expenses (standalone tree) | `/expenses`, `/expenses/new`                                          | 7     |
| Expense mutation           | `/expenses/new` → `/expenses` list                                    | 1     |
| Events — schedule sub-page | `/events/[id]/schedule`                                               | 3     |

**Total new tests: ~44**

### Why These Were Missed

These routes fall into three categories:

1. **Parallel route trees**: `/expenses` and `/finance/expenses` are separate route trees. Phase 3/4 covered `/finance/expenses/**` exhaustively but never tested the top-level `/expenses` tree. Same pattern applies to `/financials` vs `/finance` and `/schedule` vs `/staff/schedule`.

2. **Utility/support routes**: `/queue`, `/import`, `/help`, `/activity` are standalone chef utilities that don't fit cleanly into any feature group — they were skipped during feature-group-focused passes.

3. **Cross-cutting sub-pages**: `/events/[id]/schedule` is an event sub-page that wasn't picked up by either the event tests (files 01-02, which focused on FSM transitions and detail) or the schedule tests (which targeted `/staff/schedule`).

### Config Update

**`playwright.config.ts`** — added Phase 6 entry to `interactions-chef` testMatch:

```typescript
// Phase 6 — remaining routes not yet reached by files 01-40
'**/interactions/41-remaining-routes.spec.ts',
```

---

## Test Patterns Used

### Parallel Route Tree Disambiguation

Each test group includes a comment clarifying which route tree it covers and which it does NOT:

```typescript
// ─── Financials (chef view, separate from /finance) ─────────────────────────
// ─── Expenses (top-level tree, separate from /finance/expenses) ──────────────
// ─── Schedule (top-level, separate from /staff/schedule) ─────────────────────
```

This prevents future confusion about whether a route is already tested.

### Help Article Navigation

The help section includes a click-through test that follows the first article link:

```typescript
test('/help — clicking first article does not crash', async ({ page }) => {
  const firstArticle = page.locator('a[href*="/help/"]').first()
  if (await firstArticle.isVisible()) {
    await firstArticle.click()
    await page.waitForLoadState('networkidle')
    expect(page.url()).toMatch(/\/help\//)
  }
  expect(errors).toHaveLength(0)
})
```

### Corrected Expense Mutation Test

Phase 3/4 had an incorrect expense mutation test that used the event financial route. This file includes the corrected version using the actual `/expenses/new` route:

```typescript
test('Create expense via /expenses/new → appears in /expenses list', async ({ page }) => {
  const uniqueDesc = `TEST-MV5-Expense-${Date.now()}`
  await page.goto('/expenses/new')
  // ... fill form, save ...
  await page.goto('/expenses')
  const expenseVisible = await page
    .getByText(uniqueDesc)
    .first()
    .isVisible()
    .catch(() => false)
  expect(expenseVisible).toBeTruthy()
})
```

Uses `TEST-MV5-` prefix for cleanup targeting.

### Tenant Scoping

All data-bearing routes include tenant isolation assertions:

```typescript
expect(bodyText).not.toContain(seedIds.chefBId)
```

---

## Test Count After Phase 6

| Layer                  | Files        | Tests (approx) |
| ---------------------- | ------------ | -------------- |
| Smoke                  | 1            | 6              |
| E2E                    | 17           | 127            |
| Coverage               | 6            | 377            |
| Interactions Phase 1-2 | 20           | ~600           |
| Interactions Phase 3   | 10           | ~156           |
| Interactions Phase 4   | 8            | ~267           |
| Interactions Phase 5   | 2            | ~77            |
| Interactions Phase 6   | 1            | ~44            |
| **Total**              | **65 files** | **~1,654**     |

---

## Run Commands

```bash
# All chef-authenticated interaction tests (all phases, excluding admin)
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

## Route Coverage Status

After Phase 6, all discoverable chef-facing routes have at least load tests. The only intentionally uncovered areas are:

| Category                                | Reason                                           |
| --------------------------------------- | ------------------------------------------------ |
| File upload flows                       | Requires real files; better as integration tests |
| Stripe payment flows                    | Requires Stripe test mode                        |
| Real-time presence/chat                 | Requires multiple concurrent sessions            |
| Email delivery                          | Requires email service integration               |
| Public chef profile (`/chef/[slug]/**`) | Covered by coverage layer                        |
