# ChefFlow Handoff -- 2026-04-23

Project: `c:\Users\david\Documents\CFv1`

## Boot (before anything else)

1. `bash scripts/session-briefing.sh` then read `docs/.session-briefing.md`
2. Read CLAUDE.md, MEMORY.md
3. Skim last 3 entries in `docs/session-digests/`
4. Verify every claim below against actual code/DB state

## Current State

### Working Tree

994 dirty files (500 untracked, 494 modified). All from Codex sessions April 21-23. `npx tsc --noEmit --skipLibCheck` passes clean. No `.next` build exists. No dev or prod server running.

Last pushed commit: `15926abff feat(public): consumer-first homepage + instant book discoverability` (on `main`, pushed to GitHub).

### Codex Features (all 10 BUILT, all unreviewed)

Codex delivered ~8,857 lines of real code across 10 features. All verified as non-stub with proper imports, auth gates, and Zod validation. None have been code-reviewed or runtime-tested yet.

| Feature                    | Key Files                                                                                                                         | Lines |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Privileged Mutation Policy | `lib/api/auth-inventory.ts`                                                                                                       | 183   |
| Quote Prefill Unification  | `lib/quotes/quote-prefill.ts`                                                                                                     | 262   |
| Client Interaction Ledger  | `lib/clients/interaction-ledger-core.ts`, `lib/clients/interaction-ledger.ts`                                                     | 1,270 |
| Task-Todo Contract Drift   | `lib/tasks/input-normalization.ts`, `lib/todos/match.ts`, `lib/tasks/create-form-state.ts`                                        | 363   |
| Client Profile Engine      | `lib/clients/client-profile-service.ts`, `*-schema.ts`, `*-chef-workflow.ts`, `*-actions.ts`                                      | 3,844 |
| Operator Walkthrough Lane  | `app/(public)/for-operators/walkthrough/`, `lib/contact/operator-evaluation.ts`, `components/leads/operator-evaluation-inbox.tsx` | 1,159 |
| Canonical Intake Lanes     | `lib/public/intake-lane-config.ts`                                                                                                | 223   |
| Ledger-Backed NBA          | `lib/clients/next-best-action-core.ts`, `lib/clients/next-best-action.ts`                                                         | 784   |
| Tasks Create Path          | `components/tasks/task-create-panel.tsx`, `components/tasks/task-create-fields.tsx`                                               | 469   |
| Public Intent Hardening    | `lib/security/public-intent-guard.ts`                                                                                             | 300   |

### Database Schema Desync (THE BLOCKER)

DB is PostgreSQL in Docker (`chefflow_postgres`, port 54322, healthy). 20 Codex migration SQL files exist in `database/migrations/2026042{1,2}*.sql` but ~12 have NOT been applied. Verified via direct `pg_tables` queries.

**Tables that EXIST in DB:**

- `chef_marketplace_profiles`, `ingredient_knowledge`, `ingredient_knowledge_slugs`
- `chef_location_links`, `event_service_simulation_runs`, `partner_location_change_requests`
- `contact_submissions` has the operator walkthrough columns (`intake_lane`, `operator_evaluation_status`, `source_page`, `source_cta`)

**Tables MISSING from DB:**

- `planning_runs`, `planning_run_artifacts` (migration: `20260422000010`)
- `directory_listing_favorites` (migration: `20260422000001`)
- `passive_products`, `passive_product_purchases` (migration: `20260422002000`)
- `event_outcomes`, `event_dish_outcomes` (migration: `20260422000100`)
- 6x `client_profile_*` tables (migration: `20260422000150`)

**Column modifications MISSING from DB:**

- `communication_events`: 12 delivery tracking columns (migration: `20260421000130`)
- `guest_count_changes`: 4 review workflow columns (migration: `20260421000001`)

**Migration system:** Hand-written SQL in `database/migrations/`, applied by `scripts/init-local-db.sh`. NO tracking table or journal. All files use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` (safe to re-run). Drizzle Kit journal (`lib/db/migrations/meta/_journal.json`) is essentially unused (2 entries, initial one commented out).

## Blocked / Pending Decisions

None. Schema reconciliation is approved. Proceed.

## Standing Orders

- No production builds or pushes. Localhost only. No real users yet.
- Integration over expansion: wire half-built systems before new ones.
- 3-strike rule: same fix fails 3x, commit progress, report, stop.
- NEVER run `drizzle-kit push` without explicit approval.
- Database backup BEFORE applying any migrations.

## Objective

### Phase 1: Apply Missing Migrations (~10 min)

1. **Back up the database first.** Run `pg_dump` via Docker:

   ```
   docker exec chefflow_postgres pg_dump -U postgres postgres > docs/backups/pre-codex-migrations-2026-04-23.sql
   ```

2. **Apply the 20 Codex migration files** sequentially. They are all additive (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`). Apply them in filename order:

   ```
   for f in database/migrations/2026042{1,2}*.sql; do
     docker exec -i chefflow_postgres psql -U postgres postgres < "$f"
   done
   ```

3. **Verify** all previously-missing tables now exist:

   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public'
   AND tablename IN ('planning_runs','planning_run_artifacts','directory_listing_favorites',
   'passive_products','passive_product_purchases','event_outcomes','event_dish_outcomes',
   'client_profile_subjects','client_profile_dimensions','client_profile_evidence',
   'client_profile_snapshots','client_profile_snapshot_dimensions','client_profile_preferences');
   ```

4. **Verify** column modifications applied:

   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'communication_events'
   AND column_name IN ('transport_provider','transport_message_id','delivery_status');

   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'guest_count_changes'
   AND column_name IN ('review_status','reviewed_by','reviewed_at','review_note');
   ```

5. **Update** `memory/project_codex_schema_sync_gap.md` to mark reconciliation complete.

### Phase 2: Build Verification (~15 min)

After migrations are applied:

1. Run `npx next build --no-lint`. If it fails, fix type/import errors (not feature bugs).
2. Start prod server: `npx next start -p 3000`.
3. Verify homepage loads at `localhost:3000`.
4. Verify `/chef/df-private-chef` loads (chef profile page).
5. Verify `/chefs` loads (directory page).
6. Screenshot proof of each.

### Phase 3: Commit Strategy (if time permits)

The 994 dirty files need logical batch commits, not one mega-commit. Suggested batches:

1. Database migrations (20 SQL files) + schema.ts + types
2. Security (public-intent-guard, auth-inventory)
3. Client system (interaction ledger, profile engine, NBA, health score)
4. Task/todo contract fixes
5. Public surfaces (intake lanes, operator walkthrough, homepage)
6. Test files
7. Docs and config

Each batch: `git add [specific files]`, commit with `feat(scope): description`, verify `tsc` still passes after each.

Do NOT `git add -A` or `git add .` -- 994 files includes proof screenshots, log files, temp Codex artifacts, and potentially `.env` files.

## What NOT to Do

- Do NOT start new features. Integration only.
- Do NOT run `drizzle-kit push`.
- Do NOT delete any files (unrouted code may be WIP).
- Do NOT commit without verifying what you're staging.
- Do NOT deploy or push to GitHub without explicit approval.
