# Build: Client Relationship Closure Data Contract

**Goal:** Add the database and domain contract for closing, transitioning, and blocking client relationships without deleting client history.
**Label:** CLAUDE
**Estimated scope:** M (3-8 files)
**Depends on:** developer approval for the proposed SQL below

## Context Files (read first)

- `docs/research/client-relationship-closure-market-research.md`
- `database/migrations/20260215000001_layer_1_foundation.sql`
- `lib/clients/actions.ts`
- `lib/auth/server-action-inventory.ts`
- `docs/prompts/triage-and-delegate.md`
- `CLAUDE.md`

## Proposed SQL for Developer Approval

Do not write a migration until the developer approves this SQL. Before writing the migration, list `database/migrations/*.sql` and choose a timestamp strictly greater than the highest existing timestamp.

```sql
CREATE TABLE IF NOT EXISTS client_relationship_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  closure_mode TEXT NOT NULL CHECK (
    closure_mode IN ('transitioning', 'closed', 'do_not_book', 'legal_hold')
  ),
  reason_category TEXT NOT NULL CHECK (
    reason_category IN (
      'moving_away',
      'chef_capacity',
      'client_requested',
      'relationship_soured',
      'payment_risk',
      'safety_risk',
      'legal_dispute',
      'other'
    )
  ),
  internal_notes TEXT,
  client_message TEXT,
  block_new_events BOOLEAN NOT NULL DEFAULT true,
  block_public_booking BOOLEAN NOT NULL DEFAULT true,
  block_automated_outreach BOOLEAN NOT NULL DEFAULT true,
  revoke_portal_access BOOLEAN NOT NULL DEFAULT false,
  allow_active_event_messages_until TIMESTAMPTZ,
  active_event_policy TEXT NOT NULL DEFAULT 'review_each_event' CHECK (
    active_event_policy IN ('continue_active_events', 'cancel_active_events', 'review_each_event')
  ),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reopened_by UUID,
  reopened_at TIMESTAMPTZ,
  reopen_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_client_relationship_closures_tenant_client_active
  ON client_relationship_closures(tenant_id, client_id)
  WHERE reopened_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_relationship_closures_tenant_mode
  ON client_relationship_closures(tenant_id, closure_mode)
  WHERE reopened_at IS NULL;
```

## Files to Modify/Create

- `database/migrations/[next_timestamp]_client_relationship_closures.sql`: additive migration only after developer approval.
- `lib/clients/relationship-closure-types.ts`: shared closure mode, reason, and policy types.
- `lib/clients/relationship-closure.ts`: pure helper functions for policy derivation and active-event exception windows.
- `tests/unit/client-relationship-closure-policy.test.ts`: unit coverage for policy derivation.

## Steps

1. Stop and ask for developer approval before writing the migration file. Show the SQL above in the message.
2. After approval, list all files in `database/migrations/*.sql` and pick a timestamp strictly higher than the highest existing one.
3. Write the additive migration exactly from the approved SQL. Do not alter existing columns, rename columns, delete data, or modify `types/database.ts`.
4. Create `lib/clients/relationship-closure-types.ts` with literal union types for closure modes, reasons, active-event policy, and a `ClientRelationshipClosure` interface matching the selected fields.
5. Create `lib/clients/relationship-closure.ts` with pure helpers:
   - `isClosureActive(closure)`
   - `blocksNewEvents(closure)`
   - `blocksAutomatedOutreach(closure)`
   - `blocksPortalAccess(closure, now)`
   - `allowsActiveEventMessaging(closure, now)`
6. Add unit tests for each helper and each mode.

## Constraints

- Do not run `drizzle-kit push`.
- Do not edit `types/database.ts`.
- Do not add `@ts-nocheck`.
- Do not use destructive SQL.
- Do not overload the existing `clients.status = dormant` behavior.
- Keep helper functions pure and independent of Next.js.

## Verification

- [ ] `node --test --import tsx tests/unit/client-relationship-closure-policy.test.ts` passes
- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] `npx next build --no-lint` passes if explicitly allowed by the developer

## Rollback

If verification fails and you cannot fix within 2 attempts: `git stash`, report what failed.
