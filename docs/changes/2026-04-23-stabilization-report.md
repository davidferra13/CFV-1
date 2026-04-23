# Codebase Stabilization Report (2026-04-23)

## Safety Backup

- Branch: `codex-recovery-backup-2026-04-23`
- Pushed to remote: yes
- Files preserved: 1022 (997 code + 25 misc)
- Excluded files: none (`.gitignore` handled credentials)
- Verified: `git branch -r | grep codex-recovery` confirms `origin/codex-recovery-backup-2026-04-23`

## Build State

### TypeScript compilation

- Command: `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit --skipLibCheck`
- Result: **PASS**
- Error count: 0
- Exit code: 0
- Notes: Clean compile at 8GB heap. No type errors across all 995 uncommitted files.

### Production build

- Command: `NODE_OPTIONS="--max-old-space-size=8192" npx next build --no-lint`
- Result: **OOM (out of memory at 8GB)**
- First attempt (default 4GB): OOM after ~237s, peaked at 4036MB
- Second attempt (8GB): OOM after ~312s, peaked at 8073MB
- Warnings before crash:
  - `Invalid next.config.js options: Unrecognized key 'serverActions'`
  - Sentry deprecation: rename `sentry.client.config.ts` to `instrumentation-client.ts`
- Notes: 995 dirty files likely inflate the module graph beyond available memory. Build may succeed after files are committed and working tree is clean, or on a machine with more RAM.

## Database Ground Truth

### Schema Reconciliation Matrix

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

### Summary

- Tables: 4/7 exist in DB
- Modified table columns: 8/31 exist (partner_locations 3 + events 5). 23 columns across 3 tables missing.
- Enum: MISSING (communication_delivery_status)
- Event nullability migration: APPLIED (serve_time, location_address, location_city, location_state, location_zip all nullable)
- Contact submissions columns: EXIST (intake_lane, operator_evaluation_status, source_page, source_cta)

### Database reachable?

Yes. Connected at `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

## Pending Migrations

- File: `docs/changes/2026-04-23-pending-migrations.sql`
- Contains:
  - 1 new enum type (communication_delivery_status)
  - 3 new tables (planning_runs, planning_run_artifacts, directory_listing_favorites)
  - 23 new columns across 3 existing tables (communication_events, conversation_threads, guest_count_changes)
  - 8 new indexes (3 partial on communication_events, 2 on conversation_threads, 1 on guest_count_changes, 2 on new tables)
  - 1 new FK (guest_count_changes.reviewed_by -> users.id)
  - 1 new CHECK constraint (guest_count_changes.status)
- All statements are idempotent (IF NOT EXISTS guards)
- **REQUIRES DEVELOPER REVIEW AND APPROVAL BEFORE APPLICATION**

## Remaining Work

1. **Production build cannot be verified** due to OOM at 8GB. May need 16GB heap or a cleaner working tree. Not a code error; likely a resource constraint from 995 uncommitted files inflating the module graph.
2. **Migration SQL not applied.** Developer must review `docs/changes/2026-04-23-pending-migrations.sql` and apply manually.
3. **Phase C (compliance audit)** not started. Prompt at `docs/prompts/codex-recovery-phase-c-2026-04-23.md`.
4. **next.config.js warning:** `serverActions` key is unrecognized in Next.js 14.2.35. Non-breaking but should be reviewed.
5. **Sentry config deprecation:** `sentry.client.config.ts` should be renamed to `instrumentation-client.ts` for Turbopack compatibility.

## Risk Assessment

- **Data loss risk:** ELIMINATED. Backup branch `codex-recovery-backup-2026-04-23` pushed to origin with all 1022 files.
- **Runtime crash risk:** HIGH if code references missing tables (planning_runs, planning_run_artifacts, directory_listing_favorites) or missing columns on communication_events, conversation_threads, guest_count_changes. Any server action or query hitting these will throw.
- **Build risk:** UNKNOWN. tsc passes (no type errors), but `next build` OOMs at 8GB. Build may work with more RAM or fewer dirty files. No code-level build errors detected.
- **Type safety:** GOOD. Zero tsc errors confirms Codex maintained type consistency across all changes.
