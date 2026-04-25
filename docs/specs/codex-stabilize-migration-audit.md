# Codex Spec: Migration Safety Audit

> **Type:** Research only. No code changes. No migrations applied.
> **Output:** One markdown report file.
> **Risk:** ZERO. Read-only analysis.
> **Time:** ~15 minutes.

Read `CLAUDE.md` before starting. Do NOT run `drizzle-kit push` or apply any migrations.

---

## Problem

28 new migration files have accumulated from multiple Codex agents building in parallel. Some have duplicate names with different schemas. Some may reference tables created by other migrations that haven't been applied yet. Before applying ANY of these, we need a safety report.

---

## What to Do

### Step 1: List all migration files

```bash
ls -1 database/migrations/*.sql | sort
```

### Step 2: Read every file timestamped `20260423*` through `20260426*`

These are the new, unapplied migrations. Read each one completely.

The files are:

```
database/migrations/20260423000001_chef_gear_defaults.sql
database/migrations/20260423000002_fix_financial_view_final.sql
database/migrations/20260423000003_prep_timeline_professional.sql
database/migrations/20260423000004_prep_completions.sql
database/migrations/20260423000005_chef_reminders_expansion.sql
database/migrations/20260424000001_open_booking_followthrough.sql
database/migrations/20260424000003_hub_group_candidates.sql
database/migrations/20260424000004_lifecycle_view_preserve_nulls.sql
database/migrations/20260424000005_event_readiness_assistant.sql
database/migrations/20260425000001_hub_group_candidate_schema_gap.sql
database/migrations/20260425000002_ticketed_events_share_settings.sql
database/migrations/20260425000003_event_course_progress.sql
database/migrations/20260425000004_interaction_engine.sql
database/migrations/20260425000005_event_readiness_suggestion_dismissals.sql
database/migrations/20260425000006_passive_store_sync_state.sql
database/migrations/20260425000007_passive_store_sync_state_bootstrap.sql
database/migrations/20260425000008_event_dinner_circle_layer.sql
database/migrations/20260425000009_ticket_payment_failure_capacity.sql
database/migrations/20260425000010_guest_preference_columns.sql
database/migrations/20260425000011_client_passports_and_delegation.sql
database/migrations/20260425000012_grazing_table_ops_engine.sql
database/migrations/20260425000013_my_restaurants_schema.sql
database/migrations/20260425000015_multi_location_operations.sql
database/migrations/20260425000020_workspace_density.sql
database/migrations/20260425000021_meal_board_prep_assignments.sql
database/migrations/20260426000001_chef_schedule_blocks.sql
database/migrations/20260426000002_guest_preference_columns.sql
database/migrations/20260426000003_client_passports.sql
```

### Step 3: For each file, extract

- Tables created (CREATE TABLE)
- Tables altered (ALTER TABLE)
- Columns added
- Indexes created
- Foreign key references (what tables does it depend on?)

### Step 4: Check for these specific problems

**4a. Duplicate table/column definitions:**
Two files create or alter the same table with the same column name. Known suspects:

- `20260425000010_guest_preference_columns.sql` vs `20260426000002_guest_preference_columns.sql` (same filename, different timestamps)
- `20260425000011_client_passports_and_delegation.sql` vs `20260426000003_client_passports.sql` (both create `client_passports` table)

**4b. Missing dependencies:**
A migration references a table that doesn't exist in the current schema AND isn't created by an earlier migration in this batch. Check against the existing schema by reading `database/schema.ts` for currently defined tables.

**4c. Ordering issues:**
Migration A creates table X, migration B (with earlier timestamp) references table X. This would fail if applied in timestamp order.

**4d. Dangerous operations:**
Any DROP TABLE, DROP COLUMN, DELETE, or TRUNCATE. Flag these as CRITICAL.

### Step 5: Write the report

Create the file `docs/reports/migration-safety-audit.md` with this format:

```markdown
# Migration Safety Audit

Generated: [date]
Files reviewed: [count]

## Summary

- Total new tables: [count]
- Total altered tables: [count]
- Duplicates found: [count]
- Missing dependencies: [count]
- Dangerous operations: [count]

## Duplicates

| File A | File B | Conflict                     | Recommendation               |
| ------ | ------ | ---------------------------- | ---------------------------- |
| ...    | ...    | Both CREATE client_passports | Keep [A/B], delete the other |

## Missing Dependencies

| File | References | Missing Table | Notes |
| ---- | ---------- | ------------- | ----- |
| ...  | ...        | ...           | ...   |

## Dangerous Operations

| File | Operation | Risk |
| ---- | --------- | ---- |
| ...  | ...       | ...  |

## Safe to Apply (in order)

List migrations that have no conflicts and can be applied safely, in correct dependency order.

## Needs Manual Review

List migrations that have conflicts or issues requiring developer decision.

## Full Inventory

| File               | Creates | Alters | Depends On |
| ------------------ | ------- | ------ | ---------- |
| (one row per file) |         |        |            |
```

---

## Rules

- Do NOT modify any migration files.
- Do NOT run drizzle-kit push or apply any migrations.
- Do NOT modify database/schema.ts.
- Do NOT create or edit any file except `docs/reports/migration-safety-audit.md`.
- If you find dangerous operations (DROP/DELETE/TRUNCATE), flag them prominently in the report.
- No em dashes anywhere.
