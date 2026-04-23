# Codebase Stabilization: Ground Truth + Safe Preservation

You are stabilizing the ChefFlow codebase after 4 days of unsupervised Codex work. 997 uncommitted files sit on one machine with no remote backup. The Drizzle schema defines tables and columns that may not exist in the live database. No one has verified the build compiles. Your job: establish ground truth, preserve everything safely, and produce a clear status report so the developer can resume normal operations.

---

## MANDATORY FIRST STEPS

1. Read `CLAUDE.md` at the project root. Every rule in it is law. Pay special attention to: data safety, migration rules (never run `drizzle-kit push` without approval), em dash ban, and the server action quality checklist.
2. Read `docs/CLAUDE-ARCHITECTURE.md` for architecture patterns.
3. Read `docs/changes/2026-04-23-codex-recovery-inventory.md`. This is the complete inventory of what Codex changed. It tells you exactly what files belong to which work unit.

---

## CONTEXT

### What happened

From April 19-23, Codex (GPT-5.4) worked unsupervised. It produced:

- 7 commits on main (98 files, +8404/-1398)
- 997 uncommitted file changes (number grew since initial inventory of 508 due to pre-existing uncommitted work)

### 10 identified work units

| #   | Unit                                          | Status      | Commit               |
| --- | --------------------------------------------- | ----------- | -------------------- |
| 1   | Privileged mutation policy (auth inventory)   | Committed   | 4427048f0, 96deee3c0 |
| 2   | Quote draft prefill unification               | Committed   | f361f6e1d            |
| 3   | Client interaction ledger                     | Committed   | 77c52a867            |
| 4   | Task-todo contract drift fix                  | Committed   | 195d0713f            |
| 5   | Client profile engine                         | Committed   | 150ad5152            |
| 6   | Operator walkthrough lane (has SQL migration) | Committed   | bf4ebd24d            |
| 7   | Canonical intake lanes                        | Uncommitted | -                    |
| 8   | Ledger-backed next best action                | Uncommitted | -                    |
| 9   | Tasks create path reliability                 | Uncommitted | -                    |
| 10  | Public intent hardening (security)            | Uncommitted | -                    |

### The critical schema sync gap

`lib/db/schema/schema.ts` defines 7 new tables and modifications to 5 existing tables, but only ONE SQL migration exists (`0001_event_shell_unknown_core_facts.sql`), which only makes 5 event columns nullable. The rest have no migration SQL.

**New tables in schema.ts (possibly non-existent in DB):**

1. `chef_location_links` (line ~1935)
2. `planning_runs` (line ~2920)
3. `planning_run_artifacts`
4. `ingredient_knowledge`
5. `ingredient_knowledge_slugs`
6. `chef_marketplace_profiles`
7. `directory_listing_favorites`

**Modified tables (new columns possibly non-existent in DB):**

1. `partner_locations` - 3 new array columns: `experience_tags`, `best_for`, `service_types`
2. `communication_events` - 12 new delivery tracking columns
3. `conversation_threads` - 7 new outbound delivery columns
4. `guest_count_changes` - 4 new review columns + FK + check constraint

**New enum:** `communication_delivery_status` (`pending`, `sent`, `delivered`, `read`, `failed`)

### Existing migrations

- `0000_worried_scalphunter.sql` (initial schema, timestamp 1774282424169)
- `0001_event_shell_unknown_core_facts.sql` (event columns nullable, timestamp 1776914710424)
- Operator walkthrough migration: `lib/db/migrations/0001000_operator_walkthrough_evaluation_lane.sql` (committed in Unit 6, may be separate from Drizzle migration system)

---

## YOUR 5 TASKS (in order)

### TASK 1: Safety Backup (do this FIRST, before anything else)

Create a backup branch with ALL current state. This is insurance against data loss.

```bash
git checkout -b codex-recovery-backup-2026-04-23
git add -A
git commit -m "safety: preserve all uncommitted work from Codex period (997 files)"
git push origin codex-recovery-backup-2026-04-23
git checkout main
```

If `git add -A` would include files matching `.env`, `.env.local`, `.auth/developer.json`, or any file containing real credentials, EXCLUDE those files. Check `.gitignore` first. The `.gitignore` should already handle this, but verify.

After pushing, confirm the branch exists on the remote:

```bash
git branch -r | grep codex-recovery
```

**This task is non-negotiable. Everything else depends on this safety net existing.**

### TASK 2: Build Verification

Check if the codebase compiles:

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | tail -50
```

Capture the result: pass or fail, error count, notable errors. If it fails, record the errors but DO NOT fix them. Understanding what compiles and what doesn't is ground truth.

Then check if a production build works:

```bash
npx next build --no-lint 2>&1 | tail -80
```

If the build takes more than 10 minutes, kill it and note "build timed out." Do not block on this.

Record both results for the final report.

### TASK 3: Database Ground Truth (THE CRITICAL TASK)

Connect to the live database and determine what actually exists. The connection string format is in `.env.local` (key: `DATABASE_URL`). Use `psql` or a node script with the project's `postgres` package.

**3A. Check which of the 7 new tables exist:**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'chef_location_links',
  'planning_runs',
  'planning_run_artifacts',
  'ingredient_knowledge',
  'ingredient_knowledge_slugs',
  'chef_marketplace_profiles',
  'directory_listing_favorites'
);
```

**3B. Check the new enum:**

```sql
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE typname = 'communication_delivery_status';
```

**3C. Check new columns on existing tables:**

For `partner_locations`:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'partner_locations'
AND column_name IN ('experience_tags', 'best_for', 'service_types');
```

For `communication_events`:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'communication_events'
AND column_name IN (
  'external_thread_key', 'provider_name', 'managed_channel_address',
  'recipient_address', 'provider_delivery_status', 'provider_status',
  'provider_status_updated_at', 'provider_delivered_at', 'provider_read_at',
  'provider_failed_at', 'provider_error_code', 'provider_error_message'
);
```

For `conversation_threads`:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'conversation_threads'
AND column_name IN (
  'latest_outbound_event_id', 'latest_outbound_attempted_at',
  'latest_outbound_delivery_status', 'latest_outbound_provider_status',
  'latest_outbound_status_updated_at', 'latest_outbound_error_code',
  'latest_outbound_error_message'
);
```

For `guest_count_changes`:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'guest_count_changes'
AND column_name IN ('status', 'reviewed_by', 'reviewed_at', 'review_notes');
```

**3D. Check the event column nullability (from the one existing migration):**

```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
AND column_name IN ('serve_time', 'location_address', 'location_city', 'location_state', 'location_zip');
```

**3E. Check contact_submissions (from operator walkthrough, Unit 6):**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contact_submissions'
AND column_name IN ('intake_lane', 'operator_evaluation_status', 'source_page', 'source_cta');
```

**3F. Record the complete picture:**

For each item, record one of three states:

- **EXISTS** - table/column/enum exists in DB and matches schema.ts
- **MISSING** - defined in schema.ts but does not exist in DB
- **UNKNOWN** - could not determine (connection failed, query errored, etc.)

If you cannot connect to the database (it may be remote, down, or require SSH tunneling), record "DATABASE UNREACHABLE" and skip to Task 4. The report should note that schema reconciliation is still pending.

### TASK 4: Generate Migration SQL (DO NOT APPLY)

For every table, column, enum, index, and constraint that is MISSING from the database, generate the proper `CREATE TABLE` / `ALTER TABLE` SQL.

Write this to a new file: `docs/changes/2026-04-23-pending-migrations.sql`

Structure it as:

```sql
-- ============================================================
-- Pending migrations from Codex period (April 22-23, 2026)
-- Generated by stabilization agent. NOT YET APPLIED.
-- Developer must review and approve before application.
-- ============================================================

-- SECTION 1: New enum types
-- [if communication_delivery_status is MISSING]

-- SECTION 2: New tables
-- [for each MISSING table, full CREATE TABLE with columns, constraints, indexes]

-- SECTION 3: Altered tables (new columns on existing tables)
-- [for each MISSING column, ALTER TABLE ADD COLUMN]

-- SECTION 4: New indexes
-- [for each MISSING index]

-- SECTION 5: New constraints
-- [for each MISSING check constraint or FK]
```

**Rules for generating SQL:**

- Read the exact column definitions from `lib/db/schema/schema.ts` (types, defaults, nullability, constraints).
- Use `IF NOT EXISTS` on CREATE TABLE and CREATE INDEX to make the migration idempotent.
- Use `ADD COLUMN IF NOT EXISTS` pattern (or guard with `DO $$ ... END $$` blocks) for ALTER TABLE statements.
- Include the Drizzle `statement-breakpoint` comments between statements so the file is compatible with Drizzle's migration format.
- All new columns on existing tables MUST be nullable (or have defaults) to avoid breaking existing rows.
- Verify FKs reference tables that actually exist.

If the database was unreachable and you could not determine what is MISSING vs EXISTS, generate the FULL migration SQL for ALL schema additions (with IF NOT EXISTS guards everywhere). Note clearly that this is a worst-case migration that assumes nothing was applied.

**NEVER run this SQL. NEVER run `drizzle-kit push`. The developer will review and apply manually.**

### TASK 5: Stabilization Report

Write the complete report to `docs/changes/2026-04-23-stabilization-report.md`:

```markdown
# Codebase Stabilization Report (2026-04-23)

## Safety Backup

- Branch: `codex-recovery-backup-2026-04-23`
- Pushed to remote: [yes/no]
- Files preserved: [count]
- Any excluded files: [list if any]

## Build State

### TypeScript compilation

- Result: [PASS/FAIL]
- Error count: [N]
- Notable errors: [list]

### Production build

- Result: [PASS/FAIL/TIMEOUT]
- Notable warnings: [list]

## Database Ground Truth

### Schema Reconciliation Matrix

| Item                         | Type  | schema.ts | Database       | Status             |
| ---------------------------- | ----- | --------- | -------------- | ------------------ |
| chef_location_links          | table | DEFINED   | EXISTS/MISSING | OK/NEEDS MIGRATION |
| planning_runs                | table | DEFINED   | EXISTS/MISSING | OK/NEEDS MIGRATION |
| [... for every item checked] |

### Summary

- Tables: [X/7 exist]
- Modified table columns: [X/Y exist]
- Enum: [exists/missing]
- Event nullability migration: [applied/not applied]
- Contact submissions columns: [exist/missing]

### Database unreachable?

[If yes, explain what happened and what remains unknown]

## Pending Migrations

- File: `docs/changes/2026-04-23-pending-migrations.sql`
- Contains: [summary of what needs to be applied]
- REQUIRES DEVELOPER REVIEW AND APPROVAL BEFORE APPLICATION

## Remaining Work

1. [List anything that could not be completed and why]
2. [List any findings that need developer decision]
3. [List recommended next steps in priority order]

## Risk Assessment

- Data loss risk: [ELIMINATED by backup branch / STILL PRESENT because ...]
- Runtime crash risk: [HIGH if X tables missing / LOW if all tables exist / UNKNOWN if DB unreachable]
- Build risk: [PASS / FAIL with N errors / UNKNOWN]
```

---

## GROUND RULES

1. **Read CLAUDE.md first.** It overrides everything.
2. **No em dashes anywhere in your output.** Use commas, semicolons, colons, or separate sentences.
3. **NEVER run `drizzle-kit push`.** NEVER apply migration SQL. NEVER modify the database. Read-only queries only.
4. **NEVER delete or revert files.** Codex's work is valuable WIP. You are preserving it, not judging it.
5. **Task 1 (safety backup) is non-negotiable and must complete before anything else.** If the agent crashes after Task 1, the work is safe.
6. **If the database is unreachable, skip Task 3 and generate worst-case migration SQL in Task 4.** Do not spend more than 5 minutes trying to connect.
7. **Do not fix code.** Do not refactor. Do not run compliance scans. This is stabilization only.
8. **The backup branch commit message can use `git add -A` because it is a safety branch, not main.** This is the ONE exception to the "stage specific files" rule.
9. **If the build fails, record the errors. Do not attempt to fix them.** Ground truth, not remediation.
10. **Every claim in the report must be backed by the actual query result or command output.** No guessing.

---

## AFTER COMPLETION

Report: backup branch status, build result, schema reconciliation summary (how many items exist vs missing), and the top concern. Then stop.

The developer will review the report and decide:

- Whether to apply the pending migrations
- Whether to fix build errors (if any)
- Whether to proceed with Phase C (compliance audit) or Phase D (organized commits)
- Whether to run the compliance audit prompt at `docs/prompts/codex-recovery-phase-c-2026-04-23.md`
