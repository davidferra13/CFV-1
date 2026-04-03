# Research: Database Delete Prevention Patterns (Applied to OpenClaw Guard)

> **Date:** 2026-04-03
> **Question:** How do production systems implement delete prevention and immutability guards? What patterns should inform the OpenClaw no-delete migration?
> **Status:** complete

## Origin Context

After the initial OpenClaw failure-modes research confirmed that delete prevention triggers were the right guardrail, the developer asked for cross-referenced research into how real systems handle this problem. The goal: validate and improve the migration before applying it.

## Summary

The research identified three critical improvements over the initial migration draft. All three have been applied to `database/migrations/20260403000001_openclaw_no_delete_guard.sql`.

## Changes Applied

### 1. TRUNCATE Protection (Critical Gap Fixed)

**Finding:** PostgreSQL's `TRUNCATE` command bypasses all row-level triggers. A `BEFORE DELETE` trigger provides zero protection against `TRUNCATE TABLE openclaw.products`. This is documented in [PostgreSQL trigger docs](https://www.postgresql.org/docs/current/trigger-definition.html): "Row-level triggers are not invoked for TRUNCATE."

**Fix:** Added `BEFORE TRUNCATE` statement-level triggers on all 10 protected tables using a dedicated `openclaw.prevent_truncate()` function.

### 2. Removed Dead Code (`RETURN NULL` After `RAISE EXCEPTION`)

**Finding:** The original migration had `RETURN NULL` after `RAISE EXCEPTION`. This is dead code: `RAISE EXCEPTION` aborts execution and rolls back the transaction immediately. The `RETURN NULL` line never executes. The existing ChefFlow immutability triggers (`prevent_ledger_mutation()`, `prevent_transition_mutation()` in `20260215000003_layer_3_events_quotes_financials.sql:717-757`) correctly omit `RETURN NULL` after `RAISE EXCEPTION`.

**Fix:** Removed the dead `RETURN NULL` from `openclaw.prevent_delete()`.

### 3. Session Variable Escape Hatch (Maintenance Safety)

**Finding:** Production append-only systems (financial ledgers, event stores) universally provide a controlled bypass for legitimate maintenance: GDPR data erasure, corruption repair, storage cleanup. The standard PostgreSQL pattern is `SET LOCAL` with a custom GUC variable, scoped to a single transaction.

Three approaches ranked by production adoption:

| Approach                             | Scope              | Risk                                                  | Used By                        |
| ------------------------------------ | ------------------ | ----------------------------------------------------- | ------------------------------ |
| `SET LOCAL app.variable = 'true'`    | Single transaction | Low (auto-reverts on COMMIT/ROLLBACK)                 | Banks, fintech, event sourcing |
| `ALTER TABLE DISABLE TRIGGER`        | Until re-enabled   | High (ACCESS EXCLUSIVE lock, can forget to re-enable) | DBA maintenance scripts        |
| `session_replication_role = 'local'` | Session-wide       | Medium (requires superuser)                           | Replication systems            |

**Fix:** Added `current_setting('app.allow_openclaw_delete', true)` check to both guard functions. When set, the trigger permits the operation. `SET LOCAL` ensures the bypass cannot leak to other sessions or survive the transaction boundary.

### 4. Consolidated to Single Guard Function

**Finding:** The original migration had two near-identical functions: `openclaw.prevent_delete()` and `public.prevent_openclaw_delete()`. The only difference was whether the error message included `TG_TABLE_SCHEMA`. Since `TG_TABLE_SCHEMA` is always populated by PostgreSQL (it returns `'public'` for public-schema tables), one function handles both.

**Fix:** Single `openclaw.prevent_delete()` function serves all 10 tables. Error message uses `TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME` universally.

## Patterns NOT Adopted (and Why)

### REVOKE DELETE Privilege

**What it is:** `REVOKE DELETE ON openclaw.products FROM app_role;`

**Why not adopted:** ChefFlow connects to PostgreSQL as the `postgres` superuser (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`, per `scripts/openclaw-pull/config.mjs`). Superusers bypass all privilege checks. REVOKE would have zero effect. Adopting this pattern requires first creating a restricted application role, which is a larger infrastructure change.

**Recommendation:** Worth doing as a future hardening step (create `chefflow_app` role with scoped privileges), but out of scope for this migration.

### RLS Policies for Delete Prevention

**What it is:** `CREATE POLICY deny_delete ON table FOR DELETE USING (false);`

**Why not adopted:** Table owners bypass RLS unless `FORCE ROW LEVEL SECURITY` is set. Since the app connects as the table owner (postgres), RLS would be bypassed by default. Also, RLS adds more planning overhead than triggers for this use case.

### DO INSTEAD NOTHING Rules

**What it is:** `CREATE RULE no_delete AS ON DELETE TO table DO INSTEAD NOTHING;`

**Why not adopted:** Silently swallows the DELETE with no error. The caller believes the operation succeeded. This violates ChefFlow's Zero Hallucination Rule ("never show success without confirmation"). PostgreSQL's own docs warn against this pattern.

### UPDATE Prevention

**What it is:** Adding `BEFORE UPDATE` triggers alongside `BEFORE DELETE`.

**Why not adopted:** OpenClaw tables require UPDATE access. The sync pipeline uses `INSERT ... ON CONFLICT DO UPDATE` for idempotent upserts (`pull.mjs:243`, `sync.ts:406`). Blocking UPDATE would break the core data flow. This is the correct distinction: OpenClaw is append-and-update, not fully immutable like `ledger_entries`.

## Codebase Verification

Full codebase audit confirmed zero existing DELETE operations on any protected table:

- No `.delete()` Drizzle calls targeting OpenClaw tables
- No raw `DELETE FROM openclaw.*` SQL in application code
- No `TRUNCATE` on OpenClaw tables
- No cleanup scripts or cron jobs that purge OpenClaw data
- One historical DELETE in migration `20260401000145_openclaw_food_quality_gate.sql:72-77` (one-time normalization_map cleanup during migration, will not re-run)

**The migration is safe to apply with zero risk of breaking existing functionality.**

## CASCADE Behavior Verified

The `openclaw` schema uses `ON DELETE CASCADE` from `chains` to `stores` and from `stores`/`products` to `store_products`. With the guard triggers in place:

1. `DELETE FROM openclaw.chains WHERE id = X` fires the trigger on `chains`, which raises an exception
2. The cascade to `stores` and `store_products` never executes because the parent DELETE is blocked first
3. If somehow a cascade did reach a child table, that table's own trigger would also block it

This is the correct and safe behavior. `RAISE EXCEPTION` aborts the entire statement, including all cascaded operations.

## Final Migration Shape

| Component          | Count                                          | Purpose                                                                                  |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Functions          | 2                                              | `openclaw.prevent_delete()` (row-level), `openclaw.prevent_truncate()` (statement-level) |
| DELETE triggers    | 10                                             | One per protected table (7 openclaw schema + 3 public schema)                            |
| TRUNCATE triggers  | 10                                             | One per protected table (mirrors DELETE coverage)                                        |
| Escape hatch       | `SET LOCAL app.allow_openclaw_delete = 'true'` | Transaction-scoped, auto-reverts                                                         |
| Performance impact | Zero                                           | Triggers on events that never fire cost nothing                                          |
