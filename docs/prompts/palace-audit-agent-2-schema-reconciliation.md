# Agent Handoff: Codex Schema Reconciliation

Read and execute `docs/palace-audit-build-spec.md`, section "AGENT 2: Codex Schema Reconciliation."

## Context

Codex (April 22-23) expanded `lib/db/schema/schema.ts` by +326 lines defining 6 new tables and modifying 4 existing tables. Only 1 SQL migration exists (making 5 event columns nullable). The Drizzle schema and live database are likely out of sync. This is a time bomb: any feature touching these phantom tables will silently fail or crash.

## Your job

1. **Query the live database** to determine which Codex tables actually exist. Use the postgres MCP tool (read-only) or `psql`. Check for:
   - `chef_location_links`
   - `planning_runs`
   - `planning_run_artifacts`
   - `ingredient_knowledge`
   - `ingredient_knowledge_slugs`
   - `chef_marketplace_profiles`
   - `directory_listing_favorites`

2. **Check modified columns** on existing tables (`partner_locations`, `communication_events`, `conversation_threads`, `guest_count_changes`) via `information_schema.columns`.

3. **For tables/columns that DON'T exist in the DB but ARE in schema.ts:** Generate proper additive migration SQL files. Use timestamp `20260424100001` or higher (check `database/migrations/` for the highest existing timestamp first). Show the full SQL but do NOT apply it. The developer must approve all migrations per CLAUDE.md rules.

4. **For tables/columns that already exist:** Document that Codex likely used `drizzle-kit push`. No migration needed.

5. **For phantom definitions that shouldn't exist:** Flag for developer decision.

6. **Update** `memory/project_codex_schema_sync_gap.md` with your findings.

## Rules

- NEVER run `drizzle-kit push` without explicit developer approval
- All migrations must be additive (no DROP, no DELETE, no TRUNCATE)
- Show full SQL before writing any migration file
- Explain in plain English what each migration does
- Check `database/migrations/*.sql` for the highest existing timestamp before creating new files
- `npx tsc --noEmit --skipLibCheck` must still pass after any schema.ts changes
