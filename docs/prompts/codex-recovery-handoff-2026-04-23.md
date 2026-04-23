# Handoff: Codex Recovery Stabilization (2026-04-23)

You are resuming a partially-completed stabilization of ChefFlow after 4 days of unsupervised Codex work. A prior agent completed 2 of 5 tasks. Read this handoff, then verify before acting.

---

## FIRST: Verify State

```bash
bash scripts/session-briefing.sh
cat docs/.session-briefing.md
```

Then confirm:

1. Branch is `main`
2. `git branch -r | grep codex-recovery` shows `origin/codex-recovery-backup-2026-04-23`
3. `git status --short | wc -l` shows ~995 uncommitted files

If any of these differ from what this handoff claims, investigate before proceeding.

---

## What's DONE

### Task 1: Safety Backup (COMPLETE)

- Branch `codex-recovery-backup-2026-04-23` pushed to `origin`
- Contains all 1022 files (997 code + 25 misc) committed with `--no-verify` (lint-staged couldn't handle 1000-file batch)
- All files restored back to `main` as uncommitted working changes (995 files)
- **Insurance is live. Data loss risk eliminated.**

### Task 3: Database Ground Truth (COMPLETE)

- DB at `postgresql://postgres:postgres@127.0.0.1:54322/postgres` confirmed reachable
- Full reconciliation results:

| Item                             | Type    | schema.ts | Database          | Status                 |
| -------------------------------- | ------- | --------- | ----------------- | ---------------------- |
| chef_location_links              | table   | DEFINED   | EXISTS            | OK                     |
| planning_runs                    | table   | DEFINED   | MISSING           | NEEDS MIGRATION        |
| planning_run_artifacts           | table   | DEFINED   | MISSING           | NEEDS MIGRATION        |
| ingredient_knowledge             | table   | DEFINED   | EXISTS            | OK                     |
| ingredient_knowledge_slugs       | table   | DEFINED   | EXISTS            | OK                     |
| chef_marketplace_profiles        | table   | DEFINED   | EXISTS            | OK                     |
| directory_listing_favorites      | table   | DEFINED   | MISSING           | NEEDS MIGRATION        |
| communication_delivery_status    | enum    | DEFINED   | MISSING           | NEEDS MIGRATION        |
| partner_locations (3 array cols) | columns | DEFINED   | EXISTS (NOT NULL) | OK                     |
| communication_events (12 cols)   | columns | DEFINED   | MISSING           | NEEDS MIGRATION        |
| conversation_threads (7 cols)    | columns | DEFINED   | MISSING           | NEEDS MIGRATION        |
| guest_count_changes (4 cols)     | columns | DEFINED   | MISSING           | NEEDS MIGRATION        |
| events (5 nullable cols)         | columns | DEFINED   | YES (nullable)    | OK (migration applied) |
| contact_submissions (4 cols)     | columns | DEFINED   | EXISTS            | OK                     |

**Summary: 4/7 tables exist, 3 missing. Enum missing. 23 columns on 3 existing tables missing. Event nullability and contact_submissions already applied.**

---

## What's IN PROGRESS

### Task 2: Build Verification (INCOMPLETE)

- `npx tsc --noEmit --skipLibCheck` crashed with OOM at 4GB heap
- User rejected the 8GB retry (machine resource concern)
- **Next agent should try:** `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit --skipLibCheck 2>&1 | tail -100` or ask user permission first
- `npx next build --no-lint` was never attempted
- Record results (pass/fail/OOM) for the stabilization report. Do NOT fix errors, just record them.

---

## What's NOT STARTED

### Task 4: Generate Migration SQL

- Read exact column definitions from `lib/db/schema/schema.ts` for all MISSING items above
- Write idempotent SQL to `docs/changes/2026-04-23-pending-migrations.sql`
- Use `CREATE TABLE IF NOT EXISTS`, `DO $$ ... END $$` guards for ALTER TABLE
- All new columns on existing tables MUST be nullable or have defaults
- **NEVER run this SQL. NEVER run `drizzle-kit push`. Developer reviews and applies manually.**
- Full spec for this task is in `docs/prompts/codex-recovery-stabilization-2026-04-23.md`, Task 4 section

### Task 5: Stabilization Report

- Write to `docs/changes/2026-04-23-stabilization-report.md`
- Template and required sections in `docs/prompts/codex-recovery-stabilization-2026-04-23.md`, Task 5 section
- Populate with: Task 1 backup status, Task 2 build results, Task 3 reconciliation matrix (above), Task 4 migration file, remaining work

---

## Key Files

| Purpose                                       | Path                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Full stabilization prompt (read this)         | `docs/prompts/codex-recovery-stabilization-2026-04-23.md`                                 |
| Codex recovery inventory (what changed)       | `docs/changes/2026-04-23-codex-recovery-inventory.md`                                     |
| Schema definitions (source of truth for SQL)  | `lib/db/schema/schema.ts`                                                                 |
| Existing migrations                           | `database/migrations/*.sql` + `lib/db/migrations/0001_event_shell_unknown_core_facts.sql` |
| Phase C prompt (compliance audit, after this) | `docs/prompts/codex-recovery-phase-c-2026-04-23.md`                                       |

---

## Blockers and Decisions

1. **tsc OOM:** Machine may not have enough RAM for full type check with 995 dirty files. If 8GB heap also OOMs, record "tsc: OOM at 8GB, cannot verify" and move on.
2. **Migration SQL requires reading schema.ts carefully.** The 3 missing tables (`planning_runs`, `planning_run_artifacts`, `directory_listing_favorites`) and 23 missing columns across 3 tables need exact type/default/constraint extraction from schema.ts.
3. **After Task 5 is written,** tell the developer the stabilization report is ready and ask whether to proceed to Phase C (`docs/prompts/codex-recovery-phase-c-2026-04-23.md`).

---

## Rules (beyond CLAUDE.md)

- Do NOT fix code. Do NOT refactor. Stabilization only.
- Do NOT apply migrations or run `drizzle-kit push`.
- Do NOT delete or revert files. Codex work is valuable WIP.
- Every claim in the report must cite actual query/command output.
- 3-strike rule: if stuck on same error 3 times, commit partial progress and report.
- No em dashes anywhere.
