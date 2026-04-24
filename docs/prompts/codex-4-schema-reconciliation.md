# Codex Task: Schema Reconciliation

Codex expanded `lib/db/schema/schema.ts` by +326 lines defining new tables and columns. Some may not have corresponding migrations. Audit and fix.

## Step 1: Read the schema diff

```bash
git diff ccb6851f3..HEAD -- lib/db/schema/schema.ts | head -400
```

Commit `ccb6851f3` is `feat(schema): add 20 Codex migrations + sync database types`. Look at what tables and columns were added AFTER that commit.

## Step 2: Check which Codex tables exist in the live DB

Run this SQL against the live database (use the postgres MCP tool or `psql`):

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'chef_location_links', 'planning_runs', 'planning_run_artifacts',
  'ingredient_knowledge', 'ingredient_knowledge_slugs',
  'chef_marketplace_profiles', 'directory_listing_favorites',
  'client_profile_subjects', 'client_profile_vectors',
  'client_profile_conflicts', 'client_profile_evidence',
  'client_profile_recommendations', 'client_profile_arbitration_queries'
);
```

## Step 3: Check modified columns on existing tables

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'partner_locations'
AND column_name IN ('change_request_status', 'verified_at', 'verified_by');

SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'guest_count_changes'
AND column_name IN ('acknowledged_at', 'acknowledged_by');
```

## Step 4: Generate migrations for missing tables/columns

For each table or column that does NOT exist in the live DB but IS defined in `schema.ts`:

1. Write an additive `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migration
2. Use timestamp `20260425000001` (increment for each file)
3. Write the SQL to `database/migrations/20260425000001_<descriptive_name>.sql`
4. Include `IF NOT EXISTS` / `IF NOT EXISTS` on everything (idempotent)

**CRITICAL: Do NOT run `drizzle-kit push`. Do NOT apply the migration. Only WRITE the file.**

## Step 5: Report

For each table/column, report one of:

- EXISTS: already in live DB, no migration needed
- MISSING: migration file written at `database/migrations/XXXXXXX_name.sql`
- PHANTOM: defined in schema.ts but not needed by any code (flag for removal)

To check if a table is used by any code:

```bash
grep -r "from('table_name')" lib/ app/ components/ --include="*.ts" --include="*.tsx"
```

## Step 6: Update memory

Edit `memory/project_codex_schema_sync_gap.md` in the project memory directory with findings. List which tables exist, which got migrations, which are phantom.

## Verification

```bash
npx tsc --noEmit --skipLibCheck
```

Must pass. No runtime changes in this task.

## Rules

- Do NOT run `drizzle-kit push` (CLAUDE.md rule)
- Do NOT apply migrations (developer must approve first)
- Do NOT modify `schema.ts` without verifying the table is truly unused
- All migrations must be additive (CREATE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS)
- Read `CLAUDE.md` section on "Database Migrations" before writing any SQL
