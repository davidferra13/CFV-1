# Build: Phase 7 — Full Journey Coverage

**Branch:** `feature/scheduling-improvements`
**Date:** 2026-02-20
**Status:** Complete

---

## What Changed

Phase 7 closes every gap identified in a full chef journey audit (login → one week post-service). The audit walked every screen a chef touches across the full lifecycle of a catered event and checked whether a test existed for each one. This phase fills every ❌ found in that audit.

---

## New Spec Files (8 files)

| File                                       | Routes Covered                                                                                                                                                                                                | Tests |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `42-inquiry-pipeline-filters.spec.ts`      | All 5 inquiry status filter views + `/inquiries/new` + detail navigation                                                                                                                                      | ~25   |
| `43-client-deep-subsections.spec.ts`       | 17 client sub-routes: history, preferences, loyalty, communication, insights, management                                                                                                                      | ~55   |
| `44-culinary-deep-subsections.spec.ts`     | 22 routes: costing, components, ingredient notes, menu/recipe filter views, prep, inventory sub-pages                                                                                                         | ~70   |
| `45-finance-deep-subsections.spec.ts`      | 18 routes: payment sub-types, payout sub-types, missing reporting views, finance utilities                                                                                                                    | ~55   |
| `46-event-subpages-and-assignment.spec.ts` | `/events/[id]/receipts`, `/events/[id]/invoice`, `/events/[id]/split-billing` + menu/staff assignment mutations                                                                                               | ~19   |
| `47-quotes-filters-calls-misc.spec.ts`     | `/quotes/expired`, `/quotes/rejected`, `/quotes/viewed`, `/calls/[id]`, `/calls/[id]/edit`, `/goals/[id]/history`                                                                                             | ~16   |
| `48-settings-deep.spec.ts`                 | 13 settings pages: api-keys, appearance, contracts, custom-fields, delete-account (load only), event-types, highlights, journal + detail, portfolio, repertoire + detail, stripe-connect, templates, webhooks | ~40   |
| `49-network-social-deep.spec.ts`           | `/network/[chefId]`, channel nav, `/social/connections`, `/social/settings`, `/social/planner/[month]`, post detail nav                                                                                       | ~22   |

**Total new tests: ~302**

---

## Config Update

**`playwright.config.ts`** — added Phase 7 block to `interactions-chef` testMatch:

```typescript
// Phase 7 — full gap closure (every untested route from journey audit)
'**/interactions/42-inquiry-pipeline-filters.spec.ts',
'**/interactions/43-client-deep-subsections.spec.ts',
'**/interactions/44-culinary-deep-subsections.spec.ts',
'**/interactions/45-finance-deep-subsections.spec.ts',
'**/interactions/46-event-subpages-and-assignment.spec.ts',
'**/interactions/47-quotes-filters-calls-misc.spec.ts',
'**/interactions/48-settings-deep.spec.ts',
'**/interactions/49-network-social-deep.spec.ts',
```

---

## Journey Audit Coverage Map

Every item in the full chef journey (login → 1 week post-service) now has at least one test. The table below maps the key journey phases to the spec files that cover them.

| Journey Phase                  | Routes                                                          | Covered By                   |
| ------------------------------ | --------------------------------------------------------------- | ---------------------------- |
| Login                          | `/auth/signin`                                                  | global-setup, e2e auth tests |
| Dashboard                      | `/dashboard`                                                    | file 01, coverage layer      |
| Inquiry arrives — inbox        | `/inbox`, `/inbox/triage`, `/inbox/triage/[id]`                 | file 35                      |
| Inquiry review — filters       | `/inquiries/awaiting-response`, etc.                            | **file 42** (NEW)            |
| Inquiry detail                 | `/inquiries/[id]`                                               | file 14                      |
| Client history check           | `/clients/history/event-history`, `/clients/history/past-menus` | **file 43** (NEW)            |
| Client preferences             | `/clients/preferences/dietary-restrictions`, etc.               | **file 43** (NEW)            |
| Quote creation + send          | `/quotes/new`, `/quotes/[id]/edit`                              | file 03                      |
| Quote filter views             | `/quotes/expired`, `/quotes/rejected`, `/quotes/viewed`         | **file 47** (NEW)            |
| FSM transitions                | All 8 states                                                    | file 02                      |
| Deposit ledger                 | `/finance/ledger`, `/finance/payments/deposits`                 | file 32, **file 45** (NEW)   |
| Menu planning — filter views   | `/culinary/menus/drafts`, `/culinary/menus/approved`, etc.      | **file 44** (NEW)            |
| Menu assignment to event       | Mutation on event detail                                        | **file 46** (NEW)            |
| Recipe filter views            | `/culinary/recipes/drafts`, etc.                                | **file 44** (NEW)            |
| Culinary costing sub-pages     | `/culinary/costing/food-cost`, etc.                             | **file 44** (NEW)            |
| Grocery quote                  | `/events/[id]/grocery-quote`                                    | file 23, 40                  |
| Staff assignment to event      | Mutation on event detail                                        | **file 46** (NEW)            |
| Event receipts                 | `/events/[id]/receipts`                                         | **file 46** (NEW)            |
| Event invoice page             | `/events/[id]/invoice`                                          | **file 46** (NEW)            |
| Split billing                  | `/events/[id]/split-billing`                                    | **file 46** (NEW)            |
| DOP + close-out                | `/events/[id]/dop`, `/events/[id]/close-out`                    | files 07, 40                 |
| Expense recording              | `/expenses/new` mutation                                        | file 41                      |
| Payouts sub-pages              | `/finance/payouts/reconciliation`, etc.                         | **file 45** (NEW)            |
| Finance reporting gaps         | `/finance/reporting/expense-by-category`, etc.                  | **file 45** (NEW)            |
| Finance utilities              | `/finance/bank-feed`, `/finance/cash-flow`, etc.                | **file 45** (NEW)            |
| AAR                            | `/events/[id]/aar`                                              | files 10, 40                 |
| Call detail + edit             | `/calls/[id]`, `/calls/[id]/edit`                               | **file 47** (NEW)            |
| Client loyalty sub-pages       | `/clients/loyalty/points`, `/clients/loyalty/referrals`         | **file 43** (NEW)            |
| Client communication sub-pages | `/clients/communication/follow-ups`, etc.                       | **file 43** (NEW)            |
| Goals history                  | `/goals/[id]/history`                                           | **file 47** (NEW)            |
| Settings — all missing pages   | 13 settings sub-pages                                           | **file 48** (NEW)            |
| Network chef profiles          | `/network/[chefId]`                                             | **file 49** (NEW)            |
| Social connections + settings  | `/social/connections`, `/social/settings`                       | **file 49** (NEW)            |
| Social planner month view      | `/social/planner/[month]`                                       | **file 49** (NEW)            |

---

## Key Safety Notes

### Delete Account (file 48)

`/settings/delete-account` is **load tested only**. The test verifies the page loads and shows a warning, but **never clicks the delete button**. This is enforced by code — the test has no click action after navigating to the page.

### Stripe Connect (file 48)

`/settings/stripe-connect` is load tested only. No OAuth flows are triggered.

### Inventory and Finance (files 44, 45)

All inventory and finance tests are read-only. No ledger writes, no payment mutations.

### Menu / Staff Assignment (file 46)

The assignment mutation tests click buttons if visible but do not assert a specific saved state — they verify the UI is reachable and crash-free. A full mutation assertion would require the seed data to have a specific menu already linked.

---

## Test Count After Phase 7

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
| Interactions Phase 7   | 8            | ~302           |
| **Total**              | **73 files** | **~1,956**     |

---

## What Remains Intentionally Untested

| Category                                     | Reason                                          |
| -------------------------------------------- | ----------------------------------------------- |
| File upload (receipts, photos)               | Requires real files; integration test territory |
| Stripe payment OAuth flow                    | Requires Stripe test mode                       |
| Real-time chat message send                  | Requires two concurrent authenticated sessions  |
| Email delivery (review requests, follow-ups) | Requires email service integration              |
| Public chef profile (`/chef/[slug]/**`)      | Covered by coverage layer                       |
| Admin `/admin/users/[chefId]` edit actions   | Admin mutations require specific data setup     |

---

## Run Commands

```bash
# All chef interaction tests (all phases)
npm run test:interactions

# Admin tests
npm run test:interactions:admin

# Isolation / security
npm run test:isolation

# Everything
npm run test:everything

# Report
npm run test:report
```
