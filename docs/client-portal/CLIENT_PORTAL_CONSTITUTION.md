# Client Portal Constitution

## Document Identity
- **File**: `CLIENT_PORTAL_CONSTITUTION.md`
- **Category**: Core Identity & Portal Definition (2/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready, Non-Negotiable

---

## Purpose

This document defines the **20 Non-Negotiable Laws** that govern the Client Portal.

These laws are:
- **Immutable** within V1 scope
- **Binding** on all implementation decisions
- **Non-overridable** by feature requests or convenience
- **Testable** and enforceable

Violation of any law constitutes a **system integrity failure**.

---

## The 20 System Laws

### Law 1: Deny-by-Default at Database Level
**All tables must default to no access.**

- RLS enabled on all client-accessible tables
- No access granted without explicit policy
- No table accessible via `SELECT *` without whitelisting
- Service role use documented and audited

**Violation**: Any table accessible without explicit RLS policy.

---

### Law 2: All Financial Truth is Ledger-Derived
**The `ledger_entries` table is the canonical source of all financial state.**

- Balance calculations query ledger only
- Payment status derived from ledger
- Refunds recorded in ledger
- Stripe API never used as source of truth

**Violation**: Reading balance or payment state from Stripe directly.

---

### Law 3: Ledger is Append-Only
**No updates or deletes allowed on `ledger_entries`.**

- Only `INSERT` operations permitted
- Corrections handled via new offsetting entries
- Immutability enforced via database trigger
- Trigger blocks `UPDATE` and `DELETE`

**Violation**: Any code path that attempts `UPDATE` or `DELETE` on ledger.

---

### Law 4: Lifecycle Transitions are Finite and Server-Enforced
**All lifecycle state changes must be validated server-side via defined transitions.**

- Transitions defined in `event_transitions` table
- Finite state machine governs allowed transitions
- No frontend code can directly update `events.lifecycle_state`
- All transitions logged with timestamp, actor, reason

**Violation**: Direct update to `events.lifecycle_state` without transition validation.

---

### Law 5: Loyalty Derived Only from Settled Ledger
**Loyalty points are computed from `charge_succeeded` ledger entries only.**

- No manual loyalty point assignment
- Formula deterministic: `floor(settled_amount_cents / 100) * points_per_dollar`
- Calculated after event execution
- Idempotent (recomputation yields same result)

**Violation**: Loyalty balance computed from any source other than ledger.

---

### Law 6: No Cross-Tenant Data Leakage
**No query or view can return data from another tenant.**

- All tables include `tenant_id`
- All RLS policies filter by `tenant_id`
- JOINs preserve tenant isolation
- Dashboard aggregates scoped to single tenant

**Violation**: Any query returning data from `tenant_id` not matching session.

---

### Law 7: No Cross-Client Data Leakage
**A client can only access data where they are the owner.**

- `client_id` filtered in all client-facing queries
- Event visibility requires `events.client_id = session.client_id`
- Messages scoped to events owned by client
- No access to other clients' profiles, events, or ledger

**Violation**: Client accessing event, message, or profile of another client.

---

### Law 8: No SELECT * in Client Projections
**All client-facing queries must explicitly list safe columns.**

- Chef-private fields excluded (`internal_notes`, `chef_pricing_formula`)
- Explicit column whitelist for client views
- No `SELECT *` in API routes or server components
- Projections documented per table

**Violation**: Query using `SELECT *` exposed to client.

---

### Law 9: Role Resolved Before Render
**User role must be determined server-side before page render.**

- Middleware resolves `auth_user_id` → `user_roles.role` → `entity_id`
- Layout validates role before rendering portal
- No role inference from frontend
- No client-side role toggle

**Violation**: Role determined in frontend JS or inferred from URL.

---

### Law 10: No Frontend-Only Authorization
**All authorization enforced server-side and at database level.**

- Frontend only displays based on server state
- All mutations validated via server actions
- All queries RLS-enforced
- No hidden fields bypassing RLS

**Violation**: Authorization check only in frontend without server enforcement.

---

### Law 11: Idempotency Required for All External Writes
**All writes triggered by external events must use idempotency keys.**

- Stripe webhooks use `stripe_event_id` as idempotency key
- Ledger inserts have `UNIQUE(tenant_id, idempotency_key)` constraint
- Duplicate webhook delivery results in no-op
- Payment processing replay-safe

**Violation**: Webhook processing without idempotency key check.

---

### Law 12: Webhooks Must Be Replay-Safe
**All webhook handlers must tolerate duplicate delivery.**

- Check idempotency key before processing
- Return success if already processed
- No side effects on duplicate delivery
- Audit log records first receipt only

**Violation**: Webhook handler creating duplicate ledger entry on replay.

---

### Law 13: Signed URLs Must Expire
**All temporary access URLs must have time-limited validity.**

- Attachment signed URLs expire in 1 hour
- Menu PDF signed URLs expire in 24 hours
- No permanent public URLs for tenant data
- Expiration configurable per resource type

**Violation**: Signed URL with no expiration or > 24 hours for client data.

---

### Law 14: All Environment Secrets Server-Only
**No API keys, secrets, or service role keys in frontend code.**

- Stripe secret key server-only
- Supabase service role key server-only
- Environment variables not exposed to browser
- `.env.local` not committed to version control

**Violation**: API key or service role key accessible in client bundle.

---

### Law 15: No Mutation of Immutable Tables
**Tables marked immutable cannot be updated or deleted.**

- `ledger_entries` immutable
- `event_transitions` immutable
- Trigger enforcement at database level
- Corrections via new entries, not updates

**Violation**: `UPDATE` or `DELETE` on immutable table succeeds.

---

### Law 16: No Hidden Lifecycle States
**All lifecycle states must be explicit and documented.**

- Finite set of states in `event_lifecycle_state` enum
- No inferred states (e.g., "pending but actually confirmed")
- State transitions explicitly defined
- No frontend-only state extensions

**Violation**: Code branching on undocumented lifecycle state.

---

### Law 17: No Silent State Transitions
**All lifecycle state changes must be logged in `event_transitions`.**

- Every transition creates audit record
- Record includes: `old_state`, `new_state`, `actor`, `reason`, `timestamp`
- No state change without logged transition
- Audit trail complete

**Violation**: `events.lifecycle_state` updated without `event_transitions` insert.

---

### Law 18: Client-Visible State Must Match Ledger Truth
**Displayed balances, payment status, and loyalty must derive from ledger.**

- No cached balance without ledger validation
- Payment status computed from ledger entries
- UI displays derived state only
- No manual override of displayed amounts

**Violation**: UI showing balance not matching ledger SUM.

---

### Law 19: Deletions Must Preserve Audit Trail
**Soft delete or archive, never hard delete financial or audit data.**

- Events archived via `is_deleted = true` flag
- Ledger entries never deleted
- Messages soft-deleted with `deleted_at` timestamp
- Historical data queryable for compliance

**Violation**: Hard delete of event, ledger entry, or message.

---

### Law 20: Failure Defaults to Freeze, Not Commit
**On error, system halts safely rather than proceeding.**

- Payment failure → event remains pending
- Webhook failure → retry, no state mutation
- Database constraint violation → transaction rollback
- No silent error swallowing

**Violation**: System continuing after error without safe resolution.

---

## Enforcement Strategy

### Database-Level
- RLS policies enforce Laws 1, 6, 7
- Triggers enforce Laws 3, 15, 17
- Constraints enforce Law 11
- Check constraints enforce Law 16

### Server-Side
- Middleware enforces Law 9
- Server actions enforce Laws 4, 10, 14
- Webhook handlers enforce Laws 11, 12, 20

### Application-Level
- Financial queries enforce Laws 2, 5, 18
- URL generation enforces Law 13
- Deletion handlers enforce Law 19

---

## Testing Requirements

Each law must have:
- ✅ **Positive test**: Law is followed correctly
- ✅ **Negative test**: Violation is blocked
- ✅ **Edge case test**: Boundary conditions handled

Test suite located in:
- `/scripts/verify-rls-strict.sql` (Laws 1, 6, 7, 8, 10)
- `/scripts/verify-immutability-strict.sql` (Laws 3, 15, 17)
- `/scripts/verify-migrations.sql` (Schema enforcement)

---

## Violation Response

If a law is violated:

1. **Identify**: Which law is violated?
2. **Contain**: Does violation expose data or create corruption?
3. **Fix**: Implement enforcement (trigger, RLS, validation)
4. **Test**: Add regression test to prevent recurrence
5. **Audit**: Review related code for similar violations

**No violation is acceptable in production.**

---

## Amendment Process

These laws are **immutable within V1 scope**.

To change a law:
- Requires explicit V2 scope definition
- Must preserve backward compatibility or provide migration
- Cannot reduce security or data integrity
- Must update all dependent documentation

---

## Related Documents

- [CLIENT_PORTAL_OVERVIEW.md](./CLIENT_PORTAL_OVERVIEW.md)
- [CLIENT_PORTAL_SYSTEM_LAWS_ALIGNMENT.md](./CLIENT_PORTAL_SYSTEM_LAWS_ALIGNMENT.md)
- [CLIENT_SECURITY_OVERVIEW.md](./CLIENT_SECURITY_OVERVIEW.md)
- [CLIENT_LEDGER_APPEND_ONLY_RULES.md](./CLIENT_LEDGER_APPEND_ONLY_RULES.md)
- [CLIENT_RLS_STRATEGY.md](./CLIENT_RLS_STRATEGY.md)

---

**Document Status**: ✅ Implementation-Ready, Non-Negotiable
**ChefFlow Version**: V1
**Last Updated**: 2026-02-13
