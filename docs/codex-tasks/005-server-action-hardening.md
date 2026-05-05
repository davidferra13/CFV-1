# CODEX TASK: server-action-hardening

## Objective

Audit all `'use server'` exports across `lib/` for missing auth gates, tenant scoping, input validation, and error handling. Fix every violation found. This is the #1 security debt item.

## Branch

codex/server-action-hardening

## Context

CLAUDE.md requires every server action to have: (1) auth gate, (2) tenant scoping, (3) input validation, (4) error propagation, (5) mutation feedback, (6) idempotency guards, (7) cache busting. A prior audit found gaps. This task systematically closes them.

## Files You May INSPECT (read-only)

- `lib/auth/` (auth helper patterns: `requireChef`, `requireAuth`, etc.)
- `lib/db/schema/schema.ts` (understand table ownership)
- `CLAUDE.md` (server action quality checklist)

## Files You May MODIFY

- `lib/**/actions.ts` (any server action file)
- `lib/**/mutations.ts` (any mutation file)
- Any file containing `'use server'` exports

## Files You Must NOT Touch

- `middleware.ts`
- `lib/auth/auth-config.ts`
- `lib/db/schema/schema.ts`
- `database/migrations/*`
- `app/layout.tsx`
- `CLAUDE.md`
- Any file in `app/` (this task is lib-only)

## Requirements

1. Find all files containing `'use server'` in `lib/`. For each exported function:

   a. **Auth gate:** Must call `requireChef()`, `requireAuth()`, or equivalent as first line. If missing, add it.

   b. **Tenant scoping:** Every DB query must filter by `userId`, `chefId`, or equivalent from the session. If missing, add the filter.

   c. **Input validation:** Function parameters must be validated. Use zod schemas if the module already uses zod, otherwise use manual checks. Reject invalid input with `{ error: "..." }`.

   d. **Error handling:** Wrap DB operations in try/catch. Return `{ error: string }` on failure. Never throw unhandled. Never return `{ success: true }` on a no-op.

   e. **Cache busting:** If the function mutates data, it must call `revalidatePath()` or `revalidateTag()`. For `unstable_cache`, use `revalidateTag` (not `revalidatePath`).

2. Do NOT add auth gates to internal helper functions that are not exported or not in `'use server'` files.

3. Follow the pattern in `lib/events/actions.ts` as the gold standard for server action structure.

4. Report: files scanned, violations found per category, violations fixed.

## Constraints

- No em dashes
- No OpenClaw in user-visible strings
- Do not change function signatures (callers depend on them)
- Do not add new features
- Do not modify non-server-action files
- Immutable tables (`ledger_entries`, `event_transitions`, `quote_state_transitions`) must not have delete/update actions added

## Expected Output

- All `'use server'` exports have auth gates
- All DB queries are tenant-scoped
- All mutations have error handling
- All mutations bust relevant caches

## Verification Commands

```bash
npx tsc --noEmit --skipLibCheck
# Verify no unguarded exports:
grep -r "'use server'" lib/ --include="*.ts" -l
git status --short
```

## Success Criteria

- [ ] tsc passes
- [ ] Every `'use server'` exported function has an auth gate
- [ ] Report includes violation counts by category
- [ ] No `return { success: true }` on no-op paths
- [ ] git status is clean

## Rollback

```bash
git checkout main
git branch -D codex/server-action-hardening
```

## Report Format

When complete, output:

- Branch name and commit hash
- Files scanned: X
- Violations found: auth(X), tenant(X), validation(X), error(X), cache(X)
- Violations fixed: X
- Violations deferred (with reason): X
- tsc result
