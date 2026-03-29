# Local PostgreSQL Migration

**Date:** 2026-03-21
**Branch:** `feature/external-directory`

## What Changed

ChefFlow's development environment now runs against a **local database stack** (Docker) instead of the remote database cloud project. This eliminates dependency on the database's cloud availability and moves toward full self-hosting.

## Architecture

```
Before:  App (localhost:3100) --> PostgreSQL Cloud (luefkpakzvxcsqroxyhz.database.co)
After:   App (localhost:3100) --> Local PostgreSQL (127.0.0.1:54321) via Docker
```

Local PostgreSQL services running:

- **PostgREST** (REST API): `http://127.0.0.1:54321/rest/v1`
- **Auth (GoTrue)**: `http://127.0.0.1:54321/auth/v1`
- **Storage**: `http://127.0.0.1:54321/storage/v1`
- **Realtime**: `http://127.0.0.1:54321/realtime/v1`
- **Studio** (admin UI): `http://127.0.0.1:54323`
- **Mailpit** (email testing): `http://127.0.0.1:54324`
- **Postgres**: `postgresql://postgres:CHEF.jdgyuegf9924092.FLOW@127.0.0.1:54322/postgres`

## Environment Configuration

`.env.local` was updated to point at local database:

```
NEXT_PUBLIC_DATABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_DATABASE_ANON_KEY=eyJhbG...(local demo anon key)
DATABASE_SERVICE_ROLE_KEY=eyJhbG...(local demo service role key)
```

The remote database credentials are preserved as comments in `.env.local` for reference.

## Database State

- **591 migrations** applied successfully
- **672 tables** created
- All 11 critical tables present: chefs, clients, events, inquiries, quotes, menus, recipes, ingredients, conversations, ledger_entries, user_roles

## Migration Fixes Applied

Several migrations had conflicts due to duplicate migration files (same table created by different timestamps). Fixes applied:

1. **`20260330000056_chef_service_config.sql`** - Removed `REFERENCES tenants(id)` (table doesn't exist), changed RLS to use `get_current_tenant_id()`
2. **`20260330000059_hub_group_events.sql`** - Added `IF NOT EXISTS` to CREATE INDEX
3. **`20260330000064_guest_experience_improvements.sql`** - Added ALTER TABLE ADD COLUMN IF NOT EXISTS for `guest_token` and `read_at` on `guest_messages`
4. **`20260330000070_user_roles_entity_id_validation.sql`** - Fixed DROP TRIGGER to include ON table_name
5. **`20260330000074_missing_fk_indexes.sql`** - Fixed `event_guest_id` to `guest_id` on guest_feedback
6. **`20260330000100_client_booking_system.sql`** - Made no-op (duplicate of 20260330000096)
7. **`20260401000060_discovery_location_search.sql`** - Wrapped in DO block to skip if `chef_marketplace_profiles` doesn't exist
8. **`20260401000063_variance_alert_settings.sql`** - Fixed malformed DROP TRIGGER syntax
9. **`20260401000066_communication_foundation.sql`** - Added missing columns to `response_templates`, fixed RLS to use COALESCE(chef_id, tenant_id)
10. **Bulk fixes** - Added `IF NOT EXISTS` to CREATE INDEX across 15 files, added `DROP TRIGGER IF EXISTS ON table` across 9 files, added `DROP POLICY IF EXISTS` across 10 files

## Test Users Created

| Email                  | Password     | Chef ID                              | Role                  |
| ---------------------- | ------------ | ------------------------------------ | --------------------- |
| agent@chefflow.test    | TestAgent123 | aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee | chef                  |
| davidferra13@gmail.com | LocalDev2026 | 1d59faa8-757c-4e9d-9ca4-ad249e92e42e | chef (platform owner) |

## Starting Local PostgreSQL

```bash
cd CFv1
npx docker compose up -d    # Start all services
npx database stop     # Stop all services
npx database status   # Check status
```

Requires Docker Desktop to be running.

## Reverting to Remote PostgreSQL

To switch back to cloud PostgreSQL, edit `.env.local` and uncomment the remote credentials while commenting out the local ones.

## Data Migration (Pending)

The local database has the full schema but no production data. When remote database is back online, a data dump can be imported:

```bash
# From remote (when available)
database db dump --linked --data-only > data-dump.sql

# To local
docker exec -i database_db_CFv1 psql -U postgres < data-dump.sql
```

## What This Does NOT Change

- Beta and production environments still use remote database (`.env.local.beta` and `.env.local.prod` unchanged)
- No code changes to the app itself (only `.env.local` and migration SQL files)
- The `@database/ssr` and `@database/database-js` packages remain (they work with any PostgreSQL instance, local or remote)
