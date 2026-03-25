# Phase 6: RLS Disable + Standalone PostgreSQL

## RLS Disabled

**Migration:** `database/migrations/20260401000098_disable_rls_all_tables.sql`

Disabled Row Level Security on all 673 public tables. RLS is no longer needed because:

- All database queries now go through server-side code (postgres.js direct TCP)
- Tenant scoping is enforced at the application layer via `requireChef()`, `requireClient()`, `requireAdmin()`
- No browser client touches the database directly (PostgREST is removed from the data path)
- Previously, PostgreSQL's anon key + PostgREST exposed the DB to browsers, making RLS essential

The RLS policies themselves are still defined in the migration files but are now inactive. They can be dropped in a future cleanup if desired.

## Standalone PostgreSQL Docker

**File:** `docker-compose.yml`

A minimal Docker Compose config that runs PostgreSQL 15 on port 54322 (same port as PostgreSQL). This replaces the full PostgreSQL Docker stack (PostgREST, GoTrue, Storage, Realtime, Studio, etc.) with just the database.

**Migration script:** `scripts/migrate-to-standalone-pg.sh`

Handles the transition:

1. Dumps PostgreSQL PostgreSQL
2. Stops PostgreSQL Docker
3. Starts standalone PostgreSQL
4. Restores the dump

The connection string stays the same: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

**Important:** The PostgreSQL CLI is still needed for applying migrations (`drizzle-kit push`). The standalone PostgreSQL approach means you'd switch to `drizzle-kit migrate` or direct `psql` for future migrations. The database migration files in `database/migrations/` remain as the canonical schema history.

## When to Switch

The PostgreSQL Docker stack can stay running during the transition period. Switch to standalone PostgreSQL when:

1. You're confident the compat layer handles all queries correctly
2. You no longer need PostgreSQL Studio for debugging
3. You want to reduce Docker resource usage (PostgreSQL runs ~10 containers vs 1)
