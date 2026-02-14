# Client Portal System Laws Alignment

## Document Identity
- **File**: `CLIENT_PORTAL_SYSTEM_LAWS_ALIGNMENT.md`
- **Category**: Core Identity & Portal Definition (6/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document demonstrates how the Client Portal **aligns with and enforces** all 20 ChefFlow V1 System Laws.

Each law is:
- Restated for clarity
- Mapped to implementation mechanisms
- Validated with enforcement strategy
- Verified with test coverage

**100% alignment required. No exceptions.**

---

## Law 1: Deny-by-Default at Database Level

### Law Statement
**All tables must default to no access.**

### Client Portal Implementation
- RLS enabled on all client-accessible tables:
  - `clients`
  - `events`
  - `ledger_entries`
  - `menus`
  - `event_menus`
  - `messages`
  - `attachments`
  - `event_transitions`
- No access granted without explicit `GRANT` in RLS policy
- Service role use documented and restricted

### Enforcement
- Database: RLS policies enforce access restrictions
- Application: No `SELECT *` queries in client code
- Testing: `verify-rls-strict.sql` validates deny-by-default

### Alignment
✅ **Fully aligned.** All client-accessible tables have explicit RLS policies.

---

## Law 2: All Financial Truth is Ledger-Derived

### Law Statement
**The `ledger_entries` table is the canonical source of all financial state.**

### Client Portal Implementation
- Balance calculations query `ledger_entries` only
- Payment status derived from ledger entry types
- Refunds recorded as ledger entries
- Stripe API never queried for financial state

### Enforcement
- Database: View `event_financial_summary` derives from ledger
- Application: All balance queries use ledger-derived views
- Testing: Financial tests verify ledger-only derivation

### Alignment
✅ **Fully aligned.** No financial state read from Stripe API.

---

## Law 3: Ledger is Append-Only

### Law Statement
**No updates or deletes allowed on `ledger_entries`.**

### Client Portal Implementation
- Immutability trigger on `ledger_entries` blocks `UPDATE` and `DELETE`
- Corrections handled via offsetting entries
- Webhook handlers only `INSERT` ledger entries

### Enforcement
- Database: Trigger raises exception on mutation attempt
- Testing: `verify-immutability-strict.sql` validates trigger

### Alignment
✅ **Fully aligned.** Ledger immutability enforced at database level.

---

## Law 4: Lifecycle Transitions are Finite and Server-Enforced

### Law Statement
**All lifecycle state changes must be validated server-side via defined transitions.**

### Client Portal Implementation
- Client cannot directly mutate `events.lifecycle_state`
- Server actions validate allowed transitions before state change
- All transitions logged in `event_transitions`
- Finite state machine defined in lifecycle documentation

### Enforcement
- Server: Server actions validate transition legality
- Database: `event_transitions` audit all state changes
- Testing: Lifecycle tests validate transition rules

### Alignment
✅ **Fully aligned.** Client portal cannot bypass lifecycle validation.

---

## Law 5: Loyalty Derived Only from Settled Ledger

### Law Statement
**Loyalty points are computed from `charge_succeeded` ledger entries only.**

### Client Portal Implementation
- Loyalty view computes from ledger entries with `type = 'charge_succeeded'`
- Formula: `floor(amount_cents / 100) * points_per_dollar`
- No manual loyalty adjustment endpoint
- Idempotent recomputation

### Enforcement
- Database: Loyalty view filters ledger by type and event execution
- Application: Loyalty display reads from view only
- Testing: Loyalty tests validate derivation formula

### Alignment
✅ **Fully aligned.** Loyalty cannot be manually set.

---

## Law 6: No Cross-Tenant Data Leakage

### Law Statement
**No query or view can return data from another tenant.**

### Client Portal Implementation
- All tables include `tenant_id` column
- RLS policies filter by `tenant_id` matching session
- JOINs preserve tenant isolation
- Dashboard aggregates scoped to single tenant

### Enforcement
- Database: RLS policies enforce `tenant_id` filtering
- Middleware: Session resolves `tenant_id` before queries
- Testing: RLS tests validate cross-tenant denial

### Alignment
✅ **Fully aligned.** Cross-tenant access blocked at database level.

---

## Law 7: No Cross-Client Data Leakage

### Law Statement
**A client can only access data where they are the owner.**

### Client Portal Implementation
- RLS policies filter events by `client_id = session.client_id`
- Messages scoped to events owned by client
- Ledger entries filtered by owned events
- Profile queries filter by `client_id`

### Enforcement
- Database: RLS policies enforce `client_id` filtering
- Server: Server actions validate ownership
- Testing: RLS tests validate cross-client denial

### Alignment
✅ **Fully aligned.** Cross-client access blocked at database level.

---

## Law 8: No SELECT * in Client Projections

### Law Statement
**All client-facing queries must explicitly list safe columns.**

### Client Portal Implementation
- Explicit column lists in all client queries
- Chef-private fields excluded: `internal_notes`, `chef_pricing_formula`
- No `SELECT *` in server components or API routes
- Projection whitelists documented per table

### Enforcement
- Application: Code review enforces explicit column lists
- Testing: Query analysis validates no `SELECT *`

### Alignment
✅ **Fully aligned.** All client queries use explicit column lists.

---

## Law 9: Role Resolved Before Render

### Law Statement
**User role must be determined server-side before page render.**

### Client Portal Implementation
- Middleware resolves `auth_user_id` → `user_roles.role` → `entity_id`
- Layout validates `role = 'client'` before rendering
- No role inference from frontend
- Unauthorized roles redirected

### Enforcement
- Middleware: `middleware.ts` resolves role from `user_roles`
- Layout: `app/(client)/layout.tsx` validates role
- Testing: Auth flow tests validate role resolution

### Alignment
✅ **Fully aligned.** Role resolved server-side only.

---

## Law 10: No Frontend-Only Authorization

### Law Statement
**All authorization enforced server-side and at database level.**

### Client Portal Implementation
- Frontend displays based on server state
- All mutations via server actions with ownership validation
- All queries RLS-enforced
- No hidden form fields bypassing RLS

### Enforcement
- Server: Server actions validate ownership
- Database: RLS blocks unauthorized queries
- Testing: Security tests validate server enforcement

### Alignment
✅ **Fully aligned.** No frontend-only authorization logic.

---

## Law 11: Idempotency Required for All External Writes

### Law Statement
**All writes triggered by external events must use idempotency keys.**

### Client Portal Implementation
- Stripe webhooks use `stripe_event_id` as idempotency key
- Ledger table has `UNIQUE(tenant_id, idempotency_key)` constraint
- Duplicate webhook delivery blocked by constraint
- Inquiry submissions use idempotency key

### Enforcement
- Database: Unique constraint on `idempotency_key`
- Application: Webhook handler checks key before processing
- Testing: Idempotency tests validate duplicate rejection

### Alignment
✅ **Fully aligned.** All external writes idempotent.

---

## Law 12: Webhooks Must Be Replay-Safe

### Law Statement
**All webhook handlers must tolerate duplicate delivery.**

### Client Portal Implementation
- Webhook handler checks idempotency key first
- Returns success if already processed
- No side effects on duplicate delivery
- Audit log records first receipt only

### Enforcement
- Application: Webhook handler queries for existing entry
- Database: Unique constraint prevents duplicate insert
- Testing: Webhook replay tests validate no-op on duplicate

### Alignment
✅ **Fully aligned.** Webhooks replay-safe.

---

## Law 13: Signed URLs Must Expire

### Law Statement
**All temporary access URLs must have time-limited validity.**

### Client Portal Implementation
- Attachment signed URLs expire in 1 hour
- Menu PDF signed URLs expire in 24 hours
- No permanent public URLs for tenant data
- Expiration enforced by Supabase Storage

### Enforcement
- Application: Signed URL generation specifies expiration
- Storage: Supabase enforces expiration
- Testing: URL expiration tests validate time limits

### Alignment
✅ **Fully aligned.** All signed URLs have expiration.

---

## Law 14: All Environment Secrets Server-Only

### Law Statement
**No API keys, secrets, or service role keys in frontend code.**

### Client Portal Implementation
- Stripe secret key in `.env.local` (server-only)
- Supabase service role key in `.env.local` (server-only)
- Environment variables not exposed to browser bundle
- `.env.local` excluded from version control

### Enforcement
- Build: Next.js restricts env vars to server by default
- Version control: `.gitignore` excludes `.env.local`
- Testing: Bundle analysis validates no secrets in client JS

### Alignment
✅ **Fully aligned.** Secrets server-only.

---

## Law 15: No Mutation of Immutable Tables

### Law Statement
**Tables marked immutable cannot be updated or deleted.**

### Client Portal Implementation
- `ledger_entries` immutable (trigger enforced)
- `event_transitions` immutable (trigger enforced)
- Corrections via new entries, not updates

### Enforcement
- Database: Trigger raises exception on `UPDATE` or `DELETE`
- Testing: `verify-immutability-strict.sql` validates triggers

### Alignment
✅ **Fully aligned.** Immutability enforced at database level.

---

## Law 16: No Hidden Lifecycle States

### Law Statement
**All lifecycle states must be explicit and documented.**

### Client Portal Implementation
- Finite set of states in `event_lifecycle_state` enum
- No inferred states
- State transitions explicitly defined
- No frontend-only state extensions

### Enforcement
- Database: Enum restricts valid states
- Documentation: Lifecycle states listed in `CLIENT_LIFECYCLE_STATE_MACHINE.md`
- Testing: Lifecycle tests validate only documented states

### Alignment
✅ **Fully aligned.** All states explicit and documented.

---

## Law 17: No Silent State Transitions

### Law Statement
**All lifecycle state changes must be logged in `event_transitions`.**

### Client Portal Implementation
- Every state change creates `event_transitions` record
- Record includes: `old_state`, `new_state`, `actor`, `reason`, `timestamp`
- No state change without audit entry
- Trigger enforces transition logging

### Enforcement
- Database: Trigger inserts transition record on state change
- Testing: Transition tests validate audit completeness

### Alignment
✅ **Fully aligned.** All transitions logged.

---

## Law 18: Client-Visible State Must Match Ledger Truth

### Law Statement
**Displayed balances, payment status, and loyalty must derive from ledger.**

### Client Portal Implementation
- Balance displayed from `event_financial_summary` view (ledger-derived)
- Payment status computed from ledger entry types
- Loyalty balance computed from ledger `charge_succeeded` entries
- No cached balance without ledger validation

### Enforcement
- Application: All financial displays query ledger views
- Testing: Financial truth tests validate ledger alignment

### Alignment
✅ **Fully aligned.** Displayed state matches ledger.

---

## Law 19: Deletions Must Preserve Audit Trail

### Law Statement
**Soft delete or archive, never hard delete financial or audit data.**

### Client Portal Implementation
- Events archived via `is_deleted = true` flag
- Ledger entries never deleted
- Messages soft-deleted with `deleted_at` timestamp
- Historical data queryable for compliance

### Enforcement
- Application: Deletion endpoints set flags, not DELETE
- Testing: Deletion tests validate soft delete behavior

### Alignment
✅ **Fully aligned.** No hard deletes of audit data.

---

## Law 20: Failure Defaults to Freeze, Not Commit

### Law Statement
**On error, system halts safely rather than proceeding.**

### Client Portal Implementation
- Payment failure → event remains pending
- Webhook failure → retry, no state mutation
- Database constraint violation → transaction rollback
- No silent error swallowing

### Enforcement
- Application: Error handlers return failure, not success
- Database: Transactions rollback on constraint violation
- Testing: Failure tests validate safe freeze

### Alignment
✅ **Fully aligned.** System fails closed.

---

## Alignment Summary

| Law # | Law Name | Client Portal Alignment | Enforcement |
|-------|----------|------------------------|-------------|
| 1 | Deny-by-default | ✅ Fully aligned | RLS policies |
| 2 | Ledger-derived financial truth | ✅ Fully aligned | Ledger-only queries |
| 3 | Ledger append-only | ✅ Fully aligned | Immutability trigger |
| 4 | Server-enforced transitions | ✅ Fully aligned | Server actions |
| 5 | Loyalty derived from ledger | ✅ Fully aligned | View computation |
| 6 | No cross-tenant leakage | ✅ Fully aligned | RLS filtering |
| 7 | No cross-client leakage | ✅ Fully aligned | RLS filtering |
| 8 | No SELECT * | ✅ Fully aligned | Explicit columns |
| 9 | Role resolved before render | ✅ Fully aligned | Middleware |
| 10 | No frontend-only auth | ✅ Fully aligned | Server validation |
| 11 | Idempotency required | ✅ Fully aligned | Unique constraints |
| 12 | Webhooks replay-safe | ✅ Fully aligned | Idempotency check |
| 13 | Signed URLs expire | ✅ Fully aligned | Expiration params |
| 14 | Secrets server-only | ✅ Fully aligned | Env var restriction |
| 15 | No immutable mutation | ✅ Fully aligned | Triggers |
| 16 | No hidden states | ✅ Fully aligned | Enum constraints |
| 17 | No silent transitions | ✅ Fully aligned | Audit logging |
| 18 | State matches ledger | ✅ Fully aligned | View-based display |
| 19 | Preserve audit trail | ✅ Fully aligned | Soft delete |
| 20 | Fail closed | ✅ Fully aligned | Error handling |

**Total Alignment**: 20/20 (100%)

---

## Verification

All laws verified via:
- `scripts/verify-rls-strict.sql`
- `scripts/verify-immutability-strict.sql`
- `scripts/verify-migrations.sql`
- Application test suite

---

## Related Documents

- [CLIENT_PORTAL_CONSTITUTION.md](./CLIENT_PORTAL_CONSTITUTION.md)
- [CLIENT_PORTAL_OVERVIEW.md](./CLIENT_PORTAL_OVERVIEW.md)
- [CLIENT_SECURITY_OVERVIEW.md](./CLIENT_SECURITY_OVERVIEW.md)
- [CLIENT_LEDGER_MODEL.md](./CLIENT_LEDGER_MODEL.md)
- [CLIENT_LIFECYCLE_OVERVIEW.md](./CLIENT_LIFECYCLE_OVERVIEW.md)

---

**Document Status**: ✅ Implementation-Ready, 100% Aligned
**ChefFlow Version**: V1
**Last Updated**: 2026-02-13
