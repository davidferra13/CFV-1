# Build: Client Relationship Closure Server Actions

**Goal:** Add tenant-scoped server actions that close, reopen, inspect, and enforce client relationship closure.
**Label:** CLAUDE
**Estimated scope:** M (3-8 files)
**Depends on:** `docs/specs/build-client-relationship-closure-data-contract.md`

## Context Files (read first)

- `docs/research/client-relationship-closure-market-research.md`
- `lib/clients/actions.ts`
- `lib/client-portal/actions.ts`
- `lib/events/actions.ts`
- `lib/events/client-actions.ts`
- `lib/network/collab-actions.ts`
- `lib/email/send-chef-transition.ts`
- `lib/auth/server-action-inventory.ts`

## Files to Modify/Create

- `lib/clients/relationship-closure-actions.ts`: new server action file.
- `lib/clients/relationship-closure-queries.ts`: non-`use server` query helpers.
- `lib/client-portal/actions.ts`: portal-token closure guard.
- `lib/events/actions.ts`: event-creation guard for blocked clients.
- `lib/clients/action-vocabulary.ts`: suppress re-engage wording when active closure exists.
- `lib/clients/next-best-action.ts`: exclude active closures from re-engagement actions.
- `tests/unit/client-relationship-closure-actions.test.ts`: action and guard tests.

## Steps

1. Create `lib/clients/relationship-closure-queries.ts` with helpers:
   - `getActiveClientClosure(db, tenantId, clientId)`
   - `getActiveClientClosureByClientId(db, clientId)`
   - `assertClientRelationshipOpenForNewEvent(db, tenantId, clientId)`
   - `assertClientPortalAllowed(db, clientId, surface)`
2. Create `lib/clients/relationship-closure-actions.ts` with `'use server'` and only async exports:
   - `getClientRelationshipClosureSummary(clientId)`
   - `closeClientRelationship(input)`
   - `reopenClientRelationship(input)`
   - `getClientClosureReadiness(clientId)`
3. `closeClientRelationship` must require chef auth, validate input with Zod, tenant-scope every query, insert a closure row, optionally revoke the portal token, revalidate `/clients`, `/clients/[id]`, `/events`, `/my-events`, and return `{ success, closureId?, error? }`.
4. `reopenClientRelationship` must require chef auth, validate input, update only the active closure row for the same tenant and client, write `reopened_at`, `reopened_by`, and `reopen_reason`, then revalidate affected paths.
5. `getClientClosureReadiness` must return real counts for active events, unpaid balance, active portal link, active handoffs, and outstanding cancellation orchestration state. If a query fails, return an error field for that section rather than zero.
6. Update `lib/events/actions.ts` so `createEvent()` calls `assertClientRelationshipOpenForNewEvent()` after tenant ownership verification and before inserting the event.
7. Update `lib/client-portal/actions.ts` so `resolveClientPortalAccess()` rejects portal access when an active closure blocks portal access. If active-event messaging exceptions are later needed, keep the helper surface-aware.
8. Update next-best-action and action vocabulary usage so closed or blocked clients do not generate "Re-engage dormant client" actions.
9. Register sensitive closure mutations in `lib/auth/server-action-inventory.ts` if required by the privileged mutation policy.

## Constraints

- Do not edit `types/database.ts`.
- Do not create no-op success returns.
- Do not silently return zero for readiness sections that fail to load.
- Do not send emails from the closure action in this slice. Email belongs to the communication spec.
- Non-blocking side effects must use try/catch and log warnings.

## Verification

- [ ] `node --test --import tsx tests/unit/client-relationship-closure-actions.test.ts` passes
- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] `npx next build --no-lint` passes if explicitly allowed by the developer
- [ ] Manual code check confirms `createEvent()` blocks active `do_not_book`, `closed`, and `legal_hold` clients
- [ ] Manual code check confirms portal-token access is denied when `revoke_portal_access` is true

## Rollback

If verification fails and you cannot fix within 2 attempts: `git stash`, report what failed.
