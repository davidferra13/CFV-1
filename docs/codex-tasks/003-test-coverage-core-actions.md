# CODEX TASK: test-coverage-core-actions

## Objective

Write integration tests for the 6 most critical server action modules: events, quotes, invoices, recipes, inquiries, and clients. These are the core business operations. Test the happy path and the most important error cases for each.

## Branch

codex/test-coverage-core-actions

## Context

ChefFlow's validation score is at 10%. The biggest gap to V1 launch is proving the software works. These 6 modules handle the core business loop (client inquires, chef quotes, client books event, chef plans menu/recipes, chef invoices client). Tests here cover the most important user journeys.

## Files You May INSPECT (read-only)

- `lib/events/actions.ts` (or similar server actions files)
- `lib/quotes/actions.ts`
- `lib/invoices/` or `lib/finance/`
- `lib/recipes/actions.ts`
- `lib/inquiries/actions.ts`
- `lib/clients/actions.ts`
- `lib/db/schema/schema.ts` (understand table structure)
- `lib/auth/` (understand auth patterns)
- `tests/` (existing test patterns)
- `CLAUDE.md` (project rules, especially server action quality checklist)

## Files You May MODIFY

- `tests/**/*.test.ts` (create new test files)
- `tests/**/*.spec.ts` (create new test files)
- Any test helper/fixture files in `tests/`

## Files You Must NOT Touch

- Any file outside `tests/`
- No application source code modifications
- No migration files
- No config files

## Requirements

1. For each of the 6 modules, test:
   - **Happy path:** Create, read, update operations succeed with valid input and auth
   - **Auth gate:** Unauthenticated calls are rejected
   - **Tenant scoping:** User A cannot access User B's data
   - **Input validation:** Invalid/missing required fields are rejected with clear errors
   - **Error propagation:** Server action returns `{ error: string }`, never throws unhandled

2. Use the existing test patterns found in `tests/`. Match the test runner (likely vitest or jest), assertion library, and mocking approach already in use.

3. If no existing test infrastructure exists, set up a minimal vitest config and document what you created.

4. Tests should be runnable without a live database if possible (mock the DB layer). If the project uses real DB for tests, follow that pattern.

5. Name test files: `tests/{module}/actions.test.ts`

## Constraints

- Do NOT modify application source code
- Do NOT run tests against production data
- Follow existing test patterns if they exist
- No em dashes in comments or test descriptions

## Expected Output

- 6 test files, one per module
- Each file covers: happy path, auth gate, tenant isolation, input validation, error handling
- All tests pass (or document which fail and why, without modifying source code)

## Verification Commands

```bash
npx tsc --noEmit --skipLibCheck
npm test -- --filter=events --filter=quotes --filter=invoices --filter=recipes --filter=inquiries --filter=clients
git status --short
```

## Success Criteria

- [ ] 6 test files created
- [ ] tsc passes
- [ ] Tests run without crashing (pass or fail with clear reason)
- [ ] Auth gate tested for each module
- [ ] Tenant scoping tested for each module
- [ ] git status is clean

## Rollback

```bash
git checkout main
git branch -D codex/test-coverage-core-actions
```

## Report Format

When complete, output:

- Branch name and commit hash
- Test files created (list)
- Test results: X pass, Y fail, Z skip
- For any failures: file, test name, reason
- tsc result
