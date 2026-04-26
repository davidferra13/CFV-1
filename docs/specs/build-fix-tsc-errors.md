# Build: Fix 14 TypeScript Errors

**Goal:** Restore tsc green by fixing 3 root causes (14 errors total).
**Label:** CODEX
**Estimated scope:** S (10 files, all single-line fixes)
**Depends on:** none

## Context Files (read first)

- `lib/auth/get-user.ts` (canonical auth module; `auth-utils` was renamed here)
- `lib/logger.ts` (exports `createLogger` and `log`, NOT `logger`)

## Root Causes

### 1. `@/lib/auth/auth-utils` module missing (4 errors)

Module was renamed to `@/lib/auth/get-user`. Four files still import from the old path.

### 2. `{ logger }` import from `@/lib/logger` (6 errors)

`lib/logger.ts` exports `createLogger(scope)` and `log` (a pre-scoped default). It does NOT export `logger`. These files need `import { createLogger } from '@/lib/logger'` then `const logger = createLogger('scope-name')`.

### 3. Duplicate `metadata` declarations (4 errors, 2 files)

Two page files declare `export const metadata` twice. Remove the first (simpler) declaration, keep the second (typed/complete) one.

## Files to Modify

### auth-utils -> get-user (change import path only)

1. `app/api/build-version/route.ts` line 12: `'@/lib/auth/auth-utils'` -> `'@/lib/auth/get-user'`
2. `app/api/ollama-status/route.ts` line 10: `'@/lib/auth/auth-utils'` -> `'@/lib/auth/get-user'`
3. `lib/decision-queue/actions.ts` line 3: `'@/lib/auth/auth-utils'` -> `'@/lib/auth/get-user'`
4. `lib/service-simulation/actions.ts` line 4: `'@/lib/auth/auth-utils'` -> `'@/lib/auth/get-user'`

### logger -> createLogger (change import and add scoped instance)

5. `lib/ai/remy-memory-actions.ts` line 12: `import { logger } from '@/lib/logger'` -> `import { createLogger } from '@/lib/logger'` then add `const logger = createLogger('remy-memory')`
6. `lib/campaigns/push-dinner-actions.ts` line 15: same pattern, scope `'campaigns'`
7. `lib/communication/automation-actions.ts` line 6: same pattern, scope `'automation'`
8. `lib/grocery/pricing-actions.ts` line 14: same pattern, scope `'grocery-pricing'`
9. `lib/marketing/actions.ts` line 18: same pattern, scope `'marketing'`
10. `lib/partners/invite-actions.ts` line 10: same pattern, scope `'partners'`

### Duplicate metadata (remove first declaration)

11. `app/(chef)/availability/page.tsx` line 7: remove `export const metadata = { title: 'Availability' }` (keep lines 18-20)
12. `app/(chef)/remy/page.tsx` line 1: remove `export const metadata = { title: 'Remy AI Assistant' }` (keep lines 10-13)

## Steps

1. Fix all 4 auth-utils imports (find-replace `'@/lib/auth/auth-utils'` with `'@/lib/auth/get-user'`)
2. Fix all 6 logger imports (replace `import { logger }` with `import { createLogger }` and add scoped const)
3. Remove the 2 duplicate metadata lines
4. Run `npx tsc --noEmit --skipLibCheck` and confirm zero errors

## Constraints

- Do NOT modify any logic, only imports and duplicate declarations
- Do NOT touch `lib/logger.ts` or `lib/auth/get-user.ts`
- Do NOT rename the local `logger` variable in the files; keep usage sites unchanged
- Do NOT add or remove any functionality
- Check that each file's `logger.info()` / `logger.warn()` / `logger.error()` calls still work with `createLogger` (they do; it returns the same interface)

## Verification

- [ ] `npx tsc --noEmit --skipLibCheck` exits 0 with zero errors
- [ ] `npx next build --no-lint` exits 0 (if time permits; tsc is the minimum gate)

## Rollback

If verification fails and you cannot fix within 2 attempts: `git stash`, report what failed.
