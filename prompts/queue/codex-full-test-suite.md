# Write Comprehensive Unit & Integration Tests for Entire Codebase

**Priority:** high
**Area:** all
**Tier:** free

---

## Summary

Write unit and integration tests for every untested module in the ChefFlow codebase. There are ~896 files in `lib/`, ~978 unchecked items in `docs/test-coverage-todo.md`, and only ~21 existing test files. Your job is to close this gap by writing tests for every module that has testable business logic.

## Context

ChefFlow is a multi-tenant private chef platform (Next.js + PostgreSQL + Stripe). It has:

- 896 files in `lib/` containing business logic
- 30 sections in the test-coverage-todo spanning auth, ledger, finance, events, quotes, clients, recipes, inventory, staff, AI, scheduling, analytics, communications, marketing, operations, compliance, admin, API routes, middleware, database integrity, concurrency, hooks, caching, email/PDF rendering, PWA, and cross-cutting behavioral concerns
- ~21 existing unit/integration test files that cover ~5% of the codebase
- ~148 Playwright E2E test files (these are separate — don't touch them)

Your goal: write **unit tests** for every pure-logic module. For modules that require PostgreSQL, write **integration tests** using the test-db helper.

---

## CRITICAL RULES — Read These Before Writing ANY Code

### Test Runner & Framework

- **Use Node's built-in `node:test`** — NOT Jest, NOT Vitest, NOT Mocha
- **Use `node:assert/strict`** — NOT chai, NOT expect
- **Import with `.js` extensions** — this is ESM. `from '../../lib/foo.js'` not `from '../../lib/foo'`
- **No external test dependencies** — no sinon, no nock, no jest.mock. Everything is done with plain functions
- **Run command:** `node --test --import tsx "tests/unit/**/*.test.ts"`

### File Naming & Location

- Unit tests go in `tests/unit/` with the pattern `[module-name].test.ts`
- Integration tests go in `tests/integration/` with the pattern `[module-name].integration.test.ts`
- One test file per logical module (group related files)

### The Pattern — Follow This Exactly

Every test file follows this exact structure:

```typescript
/**
 * Unit tests for [Module Name]
 *
 * Tests [what it tests] from [source file path].
 * This is P[X] — [why it matters if it breaks].
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// If you CAN import the actual function (pure logic, no 'use server', no database):
import { myFunction } from '../../lib/some-module.js'

// If you CANNOT import (has 'use server' or PostgreSQL dependency):
// Extract the pure logic into the test file and test it directly.
// Copy the exact formulas/rules from the source file.

describe('Module Name — category', () => {
  it('does the expected thing', () => {
    assert.equal(myFunction(input), expectedOutput)
  })
})
```

### When You CAN vs CANNOT Import From Source

**CAN import directly** (do this whenever possible):

- Files WITHOUT `'use server'` at the top
- Files that export pure functions (no database, no server-only APIs)
- Examples: `lib/events/fsm.ts`, `lib/billing/modules.ts`, `lib/pricing/compute.ts`

**CANNOT import directly** (extract logic into test file):

- Files WITH `'use server'` at the top — these can only run inside Next.js server actions
- Files that call `createServerClient()`, `requireChef()`, etc.
- For these: copy the pure computation/validation logic into the test file as local functions, then test those functions. The logic must mirror the source exactly.

### Existing Test Infrastructure — USE IT

Three helper files already exist. Use them:

1. **`tests/helpers/factories.ts`** — Test data factories

   ```typescript
   import { factories } from '../helpers/factories.js'
   const chef = factories.chef()
   const event = factories.event({ tenant_id: chef.id })
   const flow = factories.paymentFlow('t1', 'c1', 'e1')
   ```

   Available: `chef()`, `authUser()`, `userRole()`, `client()`, `event()`, `inquiry()`, `quote()`, `ledgerEntry()`, `recipe()`, `menu()`, `staffMember()`, `expense()`, `chefWithAuth()`, `clientWithAuth()`, `paymentFlow()`

2. **`tests/helpers/mocks.ts`** — Mock infrastructure

   ```typescript
   import { createMockPostgreSQL, createMockStripe } from '../helpers/mocks.js'
   ```

   Available: `createMockPostgreSQL()`, `createMockOllama()`, `createMockStripe()`, `createMockEmail()`, `createMockSms()`, `createMockGroceryApi()`, `createMockTurnstile()`

3. **`tests/helpers/test-db.ts`** — Integration test helpers (requires PostgreSQL credentials)
   ```typescript
   import { testDb } from '../helpers/test-db.js'
   testDb.skipIfNoPostgreSQL()
   const database = testDb.getClient()
   ```
   Available: `skipIfNoPostgreSQL()`, `getClient()`, `createTestChef()`, `createTestClient()`, `createTestEvent()`, `createTestLedgerEntry()`, `cleanup()`

---

## Files to Read First

Read these to understand patterns and existing tests:

- `docs/test-coverage-todo.md` — **THE MASTER CHECKLIST** — every item that needs a test
- `tests/unit/events.fsm.test.ts` — gold standard: imports pure FSM module directly
- `tests/unit/ledger.compute.test.ts` — extracts computation logic from 'use server' file
- `tests/unit/billing.tier.test.ts` — extracts tier resolution logic
- `tests/unit/middleware.routing.test.ts` — extracts routing logic from middleware.ts
- `tests/unit/auth.roles.test.ts` — extracts auth role resolution logic
- `tests/unit/quote.fsm.test.ts` — tests quote state machine (extracted)
- `tests/unit/modules.test.ts` — imports directly from pure module
- `tests/unit/pricing.validation.test.ts` — imports pure validation function
- `tests/unit/ledger.append.test.ts` — tests validation + idempotency logic
- `tests/integration/rls-policies.integration.test.ts` — integration test pattern
- `tests/integration/immutability-triggers.integration.test.ts` — integration test pattern
- `tests/helpers/factories.ts` — test data factories
- `tests/helpers/mocks.ts` — mock infrastructure
- `tests/helpers/test-db.ts` — database test helpers

---

## Requirements — What to Test (in Priority Order)

### BATCH 1 — P1: Security & Data Integrity (do these first)

1. **`lib/auth/actions.ts`** — sign-up validation, sign-in error handling, password reset token logic
2. **`lib/auth/invitations.ts`** — invitation token generation, validation, expiry checking
3. **`lib/api/auth-api-key.ts`** — API key validation, scope checking
4. **`lib/api/rate-limit.ts`** — rate limit window calculations, threshold logic
5. **`lib/crypto/hash.ts`** — hash function correctness
6. **`lib/security/turnstile.ts`** — Turnstile verification logic
7. **`lib/oauth/jwt.ts`** — JWT generation, validation, expiry edge cases
8. **`lib/mutations/idempotency.ts`** — idempotency key logic
9. **`lib/mutations/conflict.ts`** — optimistic concurrency conflict detection
10. **`lib/validation/schemas.ts`** — Zod schema validation (all shared schemas)

### BATCH 2 — P1/P2: Financial Core

11. **`lib/stripe/checkout.ts`** — checkout session parameter building
12. **`lib/stripe/refund.ts`** — refund amount validation, reason formatting
13. **`lib/stripe/subscription.ts`** — subscription status mapping
14. **`lib/payments/payment-flow.ts`** — payment state machine transitions
15. **`lib/payments/status-flow.ts`** — payment status transition rules
16. **`lib/payments/settlement-validator.ts`** — settlement amount validation
17. **`lib/payments/plan-selector.ts`** — payment plan selection logic
18. **`lib/financials/balance-sheet.ts`** — balance sheet computation
19. **`lib/financials/cash-flow.ts`** — cash flow statement logic
20. **`lib/financials/income-statement.ts`** — P&L computation
21. **`lib/financials/depreciation-engine.ts`** — depreciation calculation formulas
22. **`lib/financials/tax-summary.ts`** — tax summary computation
23. **`lib/finance/break-even-actions.ts`** — break-even analysis math
24. **`lib/finance/cash-flow-actions.ts`** — cash flow projection formulas

### BATCH 3 — P3: Core Operations

25. **`lib/events/readiness.ts`** — readiness gate evaluation, hard/soft block logic
26. **`lib/events/scheduling.ts`** — scheduling conflict detection
27. **`lib/inquiries/scoring.ts`** or `lib/ai/lead-scoring.ts` — lead score computation
28. **`lib/inquiries/actions.ts`** — inquiry validation, status transitions
29. **`lib/clients/actions.ts`** — client CRUD validation, merge logic
30. **`lib/recipes/compute.ts`** or `lib/recipes/costing.ts` — recipe food cost calculation
31. **`lib/recipes/scaling.ts`** — recipe scaling math (guest count changes)
32. **`lib/menus/actions.ts`** — menu composition validation
33. **`lib/inventory/actions.ts`** — inventory tracking, par level alerts
34. **`lib/scheduling/conflict-detector.ts`** — scheduling conflict detection
35. **`lib/scheduling/prep-block-actions.ts`** — prep block placement logic
36. **`lib/documents/generate-prep-sheet.ts`** — prep sheet data assembly
37. **`lib/documents/generate-invoice.ts`** — invoice data assembly
38. **`lib/email/notifications.ts`** — email template parameter building

### BATCH 4 — P3/P4: Features

39. **`lib/loyalty/actions.ts`** — loyalty point calculation, tier progression
40. **`lib/surveys/actions.ts`** — survey creation, token validation
41. **`lib/automations/engine.ts`** — automation rule evaluation
42. **`lib/notifications/actions.ts`** — notification creation, deduplication
43. **`lib/chat/actions.ts`** — chat message validation
44. **`lib/travel/actions.ts`** — travel leg computation, mileage calc
45. **`lib/staff/actions.ts`** — staff assignment validation
46. **`lib/scheduling/calendar-sync.ts`** — calendar event building
47. **`lib/ai/command-orchestrator.ts`** — command routing, fail-fast for unsupported types
48. **`lib/ai/lead-scoring.ts`** — lead score formula
49. **`lib/ai/expense-categorizer.ts`** — expense categorization logic
50. **`lib/ai/fallback-parsers.ts`** — regex/heuristic parsers (no LLM)
51. **`lib/ai/allergen-risk.ts`** — allergen risk classification
52. **`lib/pricing/constants.ts`** — constant integrity (rates exist, are positive, etc.)

### BATCH 5 — P4/P5: Everything Else

53. **`lib/analytics/*.ts`** — analytics computation formulas
54. **`lib/marketing/*.ts`** — campaign targeting logic
55. **`lib/cannabis/*.ts`** — compliance packet generation
56. **`lib/admin/*.ts`** — admin action validation
57. **`lib/social/*.ts`** — social feature logic
58. **`lib/compliance/*.ts`** — compliance check rules
59. **All API routes** — parameter validation, error responses
60. **Custom React hooks** — `hooks/use-*.ts` — state logic, debounce, etc.

---

## How to Approach Each Module

For each file you're testing:

1. **Read the source file first** — understand what it does
2. **Check for `'use server'`** at the top:
   - If present: extract pure logic into test file, test that
   - If absent: import directly
3. **Identify testable logic:**
   - Validation functions
   - Computation/math formulas
   - State machine transitions
   - Decision logic (if/else trees)
   - Error handling paths
   - Edge cases (null, empty, boundary values)
4. **Write descriptive test names** that explain what's being verified
5. **Test both happy path AND error cases**
6. **Use factories** for test data when applicable

---

## Edge Cases to Always Test

For every module:

- Empty input / null / undefined
- Boundary values (0, -1, MAX_SAFE_INTEGER)
- Type coercion edge cases
- Missing optional fields
- Duplicate/idempotent operations
- Tenant isolation (tenant A can't see tenant B's data)
- Role restrictions (client can't do chef things)

---

## Constraints

- **NEVER install new packages** — use only what's in package.json
- **NEVER modify source code** — only create files in `tests/`
- **NEVER touch existing test files** — they already pass
- **NEVER use Jest or Vitest syntax** — use `node:test` and `node:assert/strict`
- **All imports use `.js` extension** — `from '../../lib/foo.js'` not `from '../../lib/foo'`
- **Amounts are always in cents** (integer minor units)
- **Tenant ID comes from session, never from input** — test this assumption
- **Financial state is derived, never stored** — test computation, not DB columns
- **Run `node --test --import tsx "tests/unit/**/\*.test.ts"` to verify\*\* — all tests must pass
- **Commit after each batch** — don't wait until the end

---

## Validation

After writing each batch of tests, run:

```bash
node --test --import tsx "tests/unit/**/*.test.ts"
```

Every test must pass. If a test fails because the source logic is different from what you extracted, fix the test (not the source). If a file can't be imported due to server-side dependencies, extract the logic pattern and test that instead.

---

## Follow-Up

- [ ] Update `docs/test-coverage-todo.md` — check off items as tests are written
- [ ] Commit after each batch with message: `test: [batch description] (X tests, 0 failures)`
- [ ] Push to `feature/risk-gap-closure` branch (never to main)
- [ ] Final commit message should include total test count

---

_Written by Claude Code. Ready for Codex._
