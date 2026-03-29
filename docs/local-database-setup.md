# Local Database Setup (Docker PostgreSQL)

ChefFlow uses a single Docker container running PostgreSQL 15. No Supabase, no cloud database dependency.

## Architecture

```
┌─────────────────────────────────────────┐
│           Your Machine                  │
│                                         │
│  Next.js (:3100) ──► PostgreSQL (:54322)│
│       │                  │              │
│       │            Docker container     │
│       │           (chefflow_postgres)   │
│       │                                 │
│  Ollama (:11434)    Local Storage       │
│  (private AI)       (./storage/)        │
└─────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Start the database
docker compose up -d

# 2. Initialize schema + seed data (first time only)
bash scripts/init-local-db.sh

# 3. Start the app
npm run dev
```

## Connection Details

| Setting  | Value                                                                      |
| -------- | -------------------------------------------------------------------------- |
| Host     | 127.0.0.1                                                                  |
| Port     | 54322                                                                      |
| User     | postgres                                                                   |
| Password | postgres                                                                   |
| Database | postgres                                                                   |
| URL      | `postgresql://postgres:CHEF.jdgyuegf9924092.FLOW@127.0.0.1:54322/postgres` |

## Demo Accounts

All accounts use password: `CHEF.jdgyuegf9924092.FLOW`

| Account         | Email                      | Role         |
| --------------- | -------------------------- | ------------ |
| Demo Chef       | chef.demo@local.chefflow   | Chef (admin) |
| Demo Client     | client.demo@local.chefflow | Client       |
| Agent (testing) | agent@local.chefflow       | Chef (admin) |

## Common Commands

```bash
# Start database
docker compose up -d

# Stop database (data persists in volume)
docker compose stop

# Destroy and recreate (WARNING: deletes all data)
docker compose down -v
bash scripts/init-local-db.sh

# Connect with psql
docker exec -it chefflow_postgres psql -U postgres -d postgres

# Check table count
docker exec chefflow_postgres psql -U postgres -d postgres -t -c \
  "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';"
```

## Migration from Supabase

This project migrated from Supabase to standalone PostgreSQL. The compatibility stubs in `scripts/init-local-db.sh` create:

- `auth` schema with `auth.users` table (matches Supabase auth structure)
- `auth.uid()`, `auth.role()`, `auth.jwt()` functions (no-ops for standalone)
- `authenticated`, `anon`, `service_role` PostgreSQL roles
- `storage` schema with `buckets` and `objects` tables (stubs only; actual storage is local filesystem)
- `extensions` schema with `gen_random_bytes()` wrapper
- `supabase_realtime` publication stub

These stubs allow the 603 migration files (originally written for Supabase) to apply cleanly on vanilla PostgreSQL. The app itself does not use any Supabase APIs; all database access goes through Drizzle ORM / postgres.js.

## What's NOT in Docker

| Component    | Where it runs                             |
| ------------ | ----------------------------------------- |
| Next.js app  | Directly on machine (`npm run dev`)       |
| Ollama (AI)  | Directly on machine (port 11434)          |
| File storage | Local filesystem (`./storage/`)           |
| Auth         | Auth.js v5 (reads auth.users via Drizzle) |
