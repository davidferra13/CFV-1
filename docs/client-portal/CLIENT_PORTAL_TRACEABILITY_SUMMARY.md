# Client Portal Traceability Summary

## Document Identity
- **File**: `CLIENT_PORTAL_TRACEABILITY_SUMMARY.md`
- **Category**: Core Identity & Portal Definition (9/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document provides a **traceability matrix** linking Client Portal subsystems to their verification and testing mechanisms.

It ensures:
- Every subsystem has defined testing coverage
- Every system law has validation scripts
- Every security boundary has test scenarios
- Every failure mode has recovery tests
- No subsystem is implemented without verification

**If it's not traced, it's not verified. If it's not verified, it's not complete.**

---

## Traceability Principles

### Principle 1: Complete Coverage
Every subsystem must map to at least one test category.

### Principle 2: Bidirectional Mapping
Tests map to requirements. Requirements map to tests.

### Principle 3: Automated Verification
Manual testing is supplementary. Automated tests are primary.

### Principle 4: Regression Protection
Every bug fix includes a regression test.

---

## Subsystem Traceability Matrix

### 1. Identity & Linking

| Requirement | Implementation | Verification | Test Location |
|------------|---------------|-------------|---------------|
| **Strict merge rules** | `client-account-linking` logic | Merge scenario tests | `/scripts/test-identity-merge.ts` |
| **Email match validation** | Email verification flow | Email match tests | `/scripts/test-identity.ts` |
| **No duplicate profiles** | Unique constraint on `(tenant_id, email)` | Constraint violation test | `/scripts/verify-migrations.sql` |
| **Invite token validation** | Token expiration + one-time use | Token expiry tests | `/scripts/test-invite-tokens.ts` |
| **Role resolution** | `user_roles` table query | Role resolution tests | `/scripts/verify-rls-harness.ts` |

### Documents
- [CLIENT_IDENTITY_MODEL.md](./CLIENT_IDENTITY_MODEL.md)
- [CLIENT_MERGE_PROCESS.md](./CLIENT_MERGE_PROCESS.md)
- [CLIENT_ROLE_RESOLUTION_FLOW.md](./CLIENT_ROLE_RESOLUTION_FLOW.md)

---

### 2. Visibility & Projection

| Requirement | Implementation | Verification | Test Location |
|------------|---------------|-------------|---------------|
| **Safe SELECT field lists** | Explicit column whitelisting | Projection validation tests | `/scripts/test-projections.ts` |
| **Chef-private field exclusion** | Column exclusion in queries | Field exclusion tests | `/scripts/test-chef-privacy.ts` |
| **No SELECT *** | Code review + linting | Linting rule enforcement | `.eslintrc.json` |
| **RLS projection alignment** | RLS policies match projections | RLS policy tests | `/scripts/verify-rls-strict.sql` |

### Documents
- [CLIENT_PORTAL_BOUNDARIES.md](./CLIENT_PORTAL_BOUNDARIES.md)
- [CLIENT_MENU_PROJECTION_MODEL.md](./CLIENT_MENU_PROJECTION_MODEL.md)

---

### 3. Financial Truth

| Requirement | Implementation | Verification | Test Location |
|------------|---------------|-------------|---------------|
| **Ledger immutability** | Trigger blocks `UPDATE`/`DELETE` | Immutability trigger tests | `/scripts/verify-immutability-strict.sql` |
| **Idempotency enforcement** | Unique constraint on `idempotency_key` | Duplicate webhook tests | `/scripts/test-webhook-idempotency.ts` |
| **Ledger-derived balance** | `event_financial_summary` view | Balance accuracy tests | `/scripts/test-ledger-derivation.ts` |
| **Stripe webhook integrity** | Webhook signature validation | Webhook validation tests | `/scripts/test-stripe-webhooks.ts` |
| **Append-only writes** | Only `INSERT` allowed | Mutation attempt tests | `/scripts/verify-immutability.sql` |

### Documents
- [CLIENT_FINANCIAL_OVERVIEW.md](./CLIENT_FINANCIAL_OVERVIEW.md)
- [CLIENT_LEDGER_MODEL.md](./CLIENT_LEDGER_MODEL.md)
- [CLIENT_LEDGER_APPEND_ONLY_RULES.md](./CLIENT_LEDGER_APPEND_ONLY_RULES.md)

---

### 4. Loyalty Determinism

| Requirement | Implementation | Verification | Test Location |
|------------|---------------|-------------|---------------|
| **Derived-only calculation** | Computed view from ledger | Derivation formula tests | `/scripts/test-loyalty-derivation.ts` |
| **Deterministic formula** | `floor(amount_cents / 100) * points_per_dollar` | Formula accuracy tests | `/scripts/test-loyalty-formula.ts` |
| **Event execution trigger** | Loyalty awarded after execution state | State transition tests | `/scripts/test-loyalty-trigger.ts` |
| **Idempotent recomputation** | Multiple runs yield same result | Idempotency tests | `/scripts/test-loyalty-idempotency.ts` |
| **Rollback safety** | Refund adjusts loyalty correctly | Refund adjustment tests | `/scripts/test-loyalty-refund.ts` |

### Documents
- [CLIENT_LOYALTY_OVERVIEW.md](./CLIENT_LOYALTY_OVERVIEW.md)
- [CLIENT_LOYALTY_DERIVATION_RULES.md](./CLIENT_LOYALTY_DERIVATION_RULES.md)
- [CLIENT_LOYALTY_POINT_FORMULA.md](./CLIENT_LOYALTY_POINT_FORMULA.md)

---

### 5. Security & RLS

| Requirement | Implementation | Verification | Test Location |
|------------|---------------|-------------|---------------|
| **Deny-by-default** | RLS enabled, no default grants | Default deny tests | `/scripts/verify-rls-strict.sql` |
| **Tenant isolation** | `tenant_id` filtering in RLS | Cross-tenant denial tests | `/scripts/verify-rls-sql-only.sql` |
| **Client isolation** | `client_id` filtering in RLS | Cross-client denial tests | `/scripts/verify-rls-harness.ts` |
| **Role enforcement** | Middleware validates role before render | Role validation tests | `/scripts/test-middleware-auth.ts` |
| **No frontend auth** | Server actions enforce ownership | Frontend bypass tests | `/scripts/test-server-action-auth.ts` |

### Documents
- [CLIENT_SECURITY_OVERVIEW.md](./CLIENT_SECURITY_OVERVIEW.md)
- [CLIENT_RLS_STRATEGY.md](./CLIENT_RLS_STRATEGY.md)
- [CLIENT_DEFAULT_DENY_POLICY.md](./CLIENT_DEFAULT_DENY_POLICY.md)

---

### 6. Lifecycle Integrity

| Requirement | Implementation | Verification | Test Location |
|------------|---------------|-------------|---------------|
| **Finite state machine** | Defined transitions in documentation | State transition tests | `/scripts/test-lifecycle-transitions.ts` |
| **Server-enforced transitions** | Server actions validate allowed transitions | Transition validation tests | `/scripts/test-lifecycle-enforcement.ts` |
| **Audit logging** | `event_transitions` logs all changes | Audit completeness tests | `/scripts/test-lifecycle-audit.ts` |
| **No silent transitions** | Trigger enforces transition logging | Silent transition tests | `/scripts/verify-lifecycle-logging.sql` |

### Documents
- [CLIENT_LIFECYCLE_OVERVIEW.md](./CLIENT_LIFECYCLE_OVERVIEW.md)
- [CLIENT_LIFECYCLE_STATE_MACHINE.md](./CLIENT_LIFECYCLE_STATE_MACHINE.md)
- [CLIENT_LIFECYCLE_TRANSITIONS.md](./CLIENT_LIFECYCLE_TRANSITIONS.md)

---

### 7. Idempotency & Failure Handling

| Requirement | Implementation | Verification | Test Location |
|------------|---------------|-------------|---------------|
| **Idempotent writes** | Unique constraint on `idempotency_key` | Duplicate submission tests | `/scripts/test-idempotency.ts` |
| **Replay-safe webhooks** | Check key before processing | Webhook replay tests | `/scripts/test-webhook-replay.ts` |
| **Safe freeze on error** | Error handlers return failure | Failure freeze tests | `/scripts/test-failure-freeze.ts` |
| **Network interruption recovery** | State reconciliation on resume | Network drop tests | `/scripts/test-network-recovery.ts` |
| **Partial update recovery** | Transaction rollback on failure | Rollback tests | `/scripts/test-transaction-rollback.ts` |

### Documents
- [CLIENT_FAILURE_CONTAINMENT_OVERVIEW.md](./CLIENT_FAILURE_CONTAINMENT_OVERVIEW.md)
- [CLIENT_IDEMPOTENCY_MODEL.md](./CLIENT_IDEMPOTENCY_MODEL.md)
- [CLIENT_WEBHOOK_RETRY_MODEL.md](./CLIENT_WEBHOOK_RETRY_MODEL.md)

---

### 8. Performance & Scalability

| Requirement | Implementation | Verification | Test Location |
|------------|---------------|-------------|---------------|
| **Index coverage** | Indexes on `(tenant_id, client_id, ...)` | Query performance tests | `/scripts/test-query-performance.ts` |
| **Pagination enforcement** | Max page size limit | Pagination tests | `/scripts/test-pagination.ts` |
| **RLS performance** | Indexed filters in RLS policies | RLS performance tests | `/scripts/test-rls-performance.ts` |
| **Tenant performance isolation** | One tenant cannot degrade another | Load isolation tests | `/scripts/test-tenant-isolation.ts` |

### Documents
- [CLIENT_PERFORMANCE_OVERVIEW.md](./CLIENT_PERFORMANCE_OVERVIEW.md)
- [CLIENT_INDEX_STRATEGY.md](./CLIENT_INDEX_STRATEGY.md)
- [CLIENT_PAGINATION_RULES.md](./CLIENT_PAGINATION_RULES.md)

---

## System Law Traceability

| Law # | Law Name | Verification Script | Test Type |
|-------|----------|-------------------|-----------|
| 1 | Deny-by-default | `/scripts/verify-rls-strict.sql` | RLS validation |
| 2 | Ledger-derived truth | `/scripts/test-ledger-derivation.ts` | Financial integrity |
| 3 | Ledger append-only | `/scripts/verify-immutability-strict.sql` | Immutability |
| 4 | Server-enforced transitions | `/scripts/test-lifecycle-enforcement.ts` | Lifecycle |
| 5 | Loyalty derived | `/scripts/test-loyalty-derivation.ts` | Loyalty |
| 6 | No cross-tenant leakage | `/scripts/verify-rls-strict.sql` | RLS isolation |
| 7 | No cross-client leakage | `/scripts/verify-rls-harness.ts` | RLS isolation |
| 8 | No SELECT * | Code review + linting | Code quality |
| 9 | Role resolved before render | `/scripts/test-middleware-auth.ts` | Auth |
| 10 | No frontend-only auth | `/scripts/test-server-action-auth.ts` | Security |
| 11 | Idempotency required | `/scripts/test-idempotency.ts` | Idempotency |
| 12 | Webhooks replay-safe | `/scripts/test-webhook-replay.ts` | Idempotency |
| 13 | Signed URLs expire | `/scripts/test-signed-url-expiry.ts` | Security |
| 14 | Secrets server-only | Bundle analysis | Security |
| 15 | No immutable mutation | `/scripts/verify-immutability-strict.sql` | Immutability |
| 16 | No hidden states | `/scripts/test-lifecycle-states.ts` | Lifecycle |
| 17 | No silent transitions | `/scripts/verify-lifecycle-logging.sql` | Lifecycle |
| 18 | State matches ledger | `/scripts/test-ledger-derivation.ts` | Financial |
| 19 | Preserve audit trail | `/scripts/test-soft-delete.ts` | Audit |
| 20 | Fail closed | `/scripts/test-failure-freeze.ts` | Failure handling |

---

## Test Coverage Summary

### Verification Scripts (SQL)
- `verify-rls-strict.sql` → RLS policies (Laws 1, 6, 7)
- `verify-immutability-strict.sql` → Immutability triggers (Laws 3, 15)
- `verify-migrations.sql` → Schema integrity
- `verify-lifecycle-logging.sql` → Transition audit (Law 17)

### Test Suites (TypeScript)
- `test-identity.ts` → Identity & linking
- `test-ledger-derivation.ts` → Financial truth (Laws 2, 18)
- `test-loyalty-derivation.ts` → Loyalty (Law 5)
- `test-lifecycle-enforcement.ts` → Lifecycle (Law 4)
- `test-idempotency.ts` → Idempotency (Laws 11, 12)
- `test-webhook-replay.ts` → Webhook safety (Law 12)
- `test-middleware-auth.ts` → Role resolution (Law 9)
- `test-server-action-auth.ts` → Server auth (Law 10)
- `test-failure-freeze.ts` → Fail-closed (Law 20)
- `test-soft-delete.ts` → Audit preservation (Law 19)

---

## Test Execution Strategy

### Local Development
Run verification scripts before commit:
```bash
# RLS validation
psql -f scripts/verify-rls-strict.sql

# Immutability validation
psql -f scripts/verify-immutability-strict.sql

# Schema validation
psql -f scripts/verify-migrations.sql

# Lifecycle logging validation
psql -f scripts/verify-lifecycle-logging.sql
```

### CI/CD Pipeline
Run full test suite on PR:
```bash
npm run test:security  # RLS + auth tests
npm run test:financial # Ledger + loyalty tests
npm run test:lifecycle # State machine tests
npm run test:idempotency # Webhook + retry tests
npm run test:integration # End-to-end scenarios
```

---

## Traceability Gaps

### How to Identify Gaps

1. **Requirement without test**: Add test to appropriate suite
2. **Test without requirement**: Document requirement or remove test
3. **Subsystem without coverage**: Add test category

### Current Status (V1)

✅ **No traceability gaps identified.**

All subsystems have defined test coverage.

---

## Regression Testing

### Regression Test Policy

When a bug is discovered:
1. **Reproduce**: Create failing test
2. **Fix**: Implement fix
3. **Verify**: Test passes
4. **Commit**: Include test in PR
5. **Document**: Add to regression test suite

### Regression Test Suite

Located in: `/scripts/regression/`

Includes tests for all previously fixed bugs.

---

## Test Data Management

### Test Data Sources
- **Fixtures**: Predefined test data in `/scripts/fixtures/`
- **Factories**: Generated test data in `/scripts/factories/`
- **Mocks**: Stripe webhook mocks in `/scripts/mocks/`

### Test Data Isolation
- Each test suite creates isolated tenant
- Teardown cleans up test data
- No cross-test data pollution

---

## Continuous Verification

### Pre-Commit Hooks
- Lint checks (no `SELECT *`)
- Type checks
- Unit tests (fast subset)

### PR Checks
- Full test suite
- RLS validation
- Immutability validation
- Migration validation

### Post-Deploy Checks
- Health check endpoints
- Canary queries (RLS enforcement)
- Webhook delivery validation

---

## Traceability Reports

### Weekly Report
- Test coverage % by subsystem
- New tests added
- Tests skipped or disabled
- Performance regression

### Release Report
- All tests passing
- No traceability gaps
- Regression suite updated
- Documentation aligned

---

## Related Documents

- [CLIENT_PORTAL_OVERVIEW.md](./CLIENT_PORTAL_OVERVIEW.md)
- [CLIENT_PORTAL_CONSTITUTION.md](./CLIENT_PORTAL_CONSTITUTION.md)
- [CLIENT_TESTING_STRATEGY.md](./CLIENT_TESTING_STRATEGY.md)
- [CLIENT_SECURITY_TESTING_GUIDE.md](./CLIENT_SECURITY_TESTING_GUIDE.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-13
