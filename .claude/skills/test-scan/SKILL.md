---
name: test-scan
description: Reconcile routes vs tests. Updates docs/test-coverage-blueprint.md with current state. Use when user says /test-scan, "what's tested", "coverage check", "what needs tests", or at end of session per CLAUDE.md mandate.
---

# TEST-SCAN (Route vs Test Reconciliation)

## Purpose

Keep `docs/test-coverage-blueprint.md` accurate by scanning actual routes and test files.

## Procedure

### Phase 1: Inventory Routes

1. Glob `app/**/page.tsx` to find all routes
2. Parse route paths from directory structure
3. Categorize: public, chef (authenticated), admin, API

### Phase 2: Inventory Tests

1. Glob `tests/**/*.spec.ts` and `tests/**/*.test.ts`
2. Parse which routes/features each test covers (from file names and content)
3. Note test status: passing, failing, skipped

### Phase 3: Cross-Reference

For each route, determine coverage:

| Status     | Meaning                                     |
| ---------- | ------------------------------------------- |
| COVERED    | Has dedicated test that exercises the route |
| PARTIAL    | Has test but doesn't cover key interactions |
| UNTESTED   | No test file targets this route             |
| SMOKE-ONLY | Only covered by broad smoke tests           |

### Phase 4: Update Blueprint

Update `docs/test-coverage-blueprint.md` with:

```markdown
## Route Coverage Summary

Total routes: X
Covered: Y (Z%)
Partial: A
Untested: B

### Untested Routes (Priority)

| Route | Category | Priority | Notes |
| ----- | -------- | -------- | ----- |
```

### Phase 5: Report

```
## Test Scan [date]

Routes: X total
- COVERED: Y
- PARTIAL: Z
- UNTESTED: W

### New since last scan
- [routes added without tests]

### Tests without routes (orphan tests)
- [tests targeting removed/renamed routes]
```

## Constraints

- Update the blueprint file in place (don't recreate from scratch)
- Never delete entries from blueprint (mark as REMOVED if route gone)
- Priority for untested: P0 = money/auth routes, P1 = core chef ops, P2 = nice-to-have
