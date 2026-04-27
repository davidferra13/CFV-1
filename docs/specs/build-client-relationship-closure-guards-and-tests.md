# Build: Client Relationship Closure Guards and Tests

**Goal:** Add regression tests and surface guards so closed or blocked clients cannot re-enter booking, outreach, portal, or automation flows by accident.
**Label:** CLAUDE
**Estimated scope:** L (8+ files)
**Depends on:** `docs/specs/build-client-relationship-closure-server-actions.md`, `docs/specs/build-client-relationship-closure-ui.md`

## Context Files (read first)

- `docs/research/client-relationship-closure-market-research.md`
- `lib/events/actions.ts`
- `lib/client-portal/actions.ts`
- `lib/events/client-actions.ts`
- `lib/clients/next-best-action.ts`
- `lib/clients/action-vocabulary.ts`
- `lib/ai/agent-actions/event-ops-actions.ts`
- `lib/ai/agent-actions/proactive-actions.ts`
- `lib/inquiries/public-actions.ts`
- `components/clients/portal-link-manager.tsx`
- `app/(chef)/clients/clients-table.tsx`

## Files to Modify/Create

- `tests/unit/client-relationship-closure-guards.test.ts`: core guard tests.
- `tests/unit/client-relationship-closure-surface-guard.test.ts`: static guard tests for known entry points.
- `tests/e2e/client-relationship-closure.spec.ts`: browser flow for close, blocked event create, and reopen.
- `lib/events/actions.ts`: ensure guard stays in create path.
- `lib/client-portal/actions.ts`: ensure closure-aware access remains.
- `lib/ai/agent-actions/proactive-actions.ts`: suppress automated re-engagement for active closures.
- `lib/ai/agent-actions/event-ops-actions.ts`: prevent AI event creation for blocked clients.
- `lib/inquiries/public-actions.ts`: prevent direct public booking conversion into blocked client when identity matches.

## Steps

1. Add unit tests for every closure mode across booking, portal, outreach, and active-event messaging policy.
2. Add a static surface guard that fails if `createEvent()` no longer imports or calls the relationship closure guard.
3. Add a static surface guard that fails if `resolveClientPortalAccess()` no longer checks closure state.
4. Add unit coverage that next-best-action and proactive actions do not generate re-engagement actions for closed or do-not-book clients.
5. Add an e2e test that:
   - opens a client detail page
   - closes the relationship as `do_not_book`
   - confirms the client detail shows closure
   - confirms event creation for that client is blocked
   - reopens the relationship
   - confirms event creation can proceed to the form again
6. Keep e2e setup isolated. Do not kill or restart existing developer servers.

## Constraints

- Do not create new long-running servers without explicit developer permission.
- Do not hardcode financial figures in UI assertions.
- Do not weaken auth or tenant checks to make tests easier.
- Do not edit `types/database.ts`.
- Do not use em dashes.

## Verification

- [ ] `node --test --import tsx tests/unit/client-relationship-closure-guards.test.ts tests/unit/client-relationship-closure-surface-guard.test.ts` passes
- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] `npx playwright test tests/e2e/client-relationship-closure.spec.ts` passes if an approved dev server is available
- [ ] `npx next build --no-lint` passes if explicitly allowed by the developer

## Rollback

If verification fails and you cannot fix within 2 attempts: `git stash`, report what failed.
