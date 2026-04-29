---
name: tdd
description: Test-Driven Development. Use when the user asks for TDD, test-first implementation, regression-first bug fixing, or production code that must start with a failing test.
user-invocable: true
---

# Test-Driven Development (TDD)

**Iron Law: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

If you wrote the code before the test, delete the code and start over.

## The Cycle

## Boundary Selection

Before RED, identify the fastest meaningful test boundary:

- Unit test for pure behavior.
- Server action call for business logic.
- Route or component test for UI behavior.
- Playwright flow when only browser behavior proves the contract.
- Replacement check when TDD is impractical, with a clear reason.

Prefer stable interfaces over incidental internals. The test should protect the module contract the next agent will rely on.

### RED - Write a failing test

1. Write a test that describes the desired behavior.
2. Run it. It **must** fail. If it passes immediately, the test is wrong - delete and rewrite.
3. Confirm the failure message makes sense (fails for the right reason).

### GREEN - Write minimal code to pass

1. Write the simplest possible production code that makes the test pass.
2. No extras, no clever abstractions, no future-proofing.
3. Run the test. It must pass.

### REFACTOR - Clean up

1. Improve the code without changing behavior.
2. Run tests after each refactor step. They must stay green.
3. Only refactor when green. Never refactor on red.

## ChefFlow Test Context

- **Server actions:** test via direct function call in test file (import and call)
- **Playwright (UI behavior):** tests in `tests/` with `playwright.config.ts`
- **Experiential verification:** `tests/experiential/` (blank screens, cross-boundary UX)
- **Run single test:** `npx playwright test tests/your-file.spec.ts`
- **Type check after:** `npx tsc --noEmit --skipLibCheck`

## What Makes a Good Test

- Tests ONE behavior
- Has a clear name: "should [behavior] when [condition]"
- Fails before fix, passes after fix
- Does not test implementation details (test behavior, not internals)
- Hits real DB (no mocks per feedback rules) when testing server actions

## Red Flags

- Writing test after the code
- Test passes on first run before any production code exists
- Testing that a function was called (testing implementation, not behavior)
- One test covering 5 different behaviors
- Mocking the database to avoid real queries

## Verification Checklist Before Marking Done

- [ ] Test was written before production code
- [ ] Test failed on RED phase (with the right failure message)
- [ ] Minimal code written to go GREEN
- [ ] Refactor done with tests staying green
- [ ] `npx tsc --noEmit --skipLibCheck` exits 0
- [ ] No regressions in related tests
