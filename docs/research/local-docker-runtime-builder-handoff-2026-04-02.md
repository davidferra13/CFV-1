# Local Docker Runtime Builder Handoff

> **Date:** 2026-04-02
> **Status:** ready for builder execution
> **Purpose:** capture the verified live Docker/runtime state, isolate stale local-DB assumptions, and give the next builder an ordered recovery path without re-discovery.

---

## Scope

This handoff is about the local Docker/runtime foundation only:

- Docker Desktop state
- Compose vs standalone containers
- local PostgreSQL connectivity
- local project/runtime boundaries
- local schema/bootstrap drift

This handoff does not change runtime behavior. It is a documentation and execution-order artifact.

---

## Verified Live State

### What is actually running

- Compose project: `cfv1`
- Active Docker service: `postgres`
- Active container: `chefflow_postgres`
- Image: `postgres:15-alpine`
- Published port: `127.0.0.1:54322->5432`
- Container health: `healthy`
- Persistent storage: named volume `cfv1_chefflow_pgdata`
- App server: Next.js dev server running directly on the host at `0.0.0.0:3100`

### What is not in Docker

- the Next.js app
- the project source tree
- local file storage under `./storage`
- Ollama

The active PostgreSQL container mounts only `/var/lib/postgresql/data`. There is no bind mount of `C:\Users\david\Documents\CFv1` into the container.

### Docker Desktop row interpretation

The Docker Desktop screenshot is showing two different object types:

- `cfv1` is the Compose project row
- `spotfyapp-postgres` is a standalone container row

The Compose project row is allowed to show blank values for `Container ID`, `Image`, and `Ports`, because it is an aggregate project surface, not an individual container. Expand it to inspect child containers.

### Additional container found

- `spotfyapp-postgres`
  - image: `postgres:16-alpine`
  - port mapping: `0.0.0.0:5432->5432`
  - status: `Exited (255)`
  - not part of the `cfv1` Compose project

Treat it as stale local clutter unless there is a separate project that still needs it.

---

## Verified File And Config Facts

### Intended Compose configuration

`docker-compose.yml` currently declares:

- project-local PostgreSQL only
- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=CHEF.jdgyuegf9924092.FLOW`
- `POSTGRES_DB=postgres`
- `127.0.0.1:54322:5432`

### Actual host runtime configuration

`.env.local` currently points the app to:

- `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`

Host-side connection testing confirmed:

- `postgres` succeeds against `127.0.0.1:54322`
- `CHEF.jdgyuegf9924092.FLOW` fails against `127.0.0.1:54322`

So the active host runtime is aligned with `.env.local`, not with `docker-compose.yml` or several docs.

### Local architecture docs

`docs/local-database-setup.md` is directionally correct about the architecture:

- one PostgreSQL Docker container
- Next.js on host
- file storage on host
- no cloud DB dependency in the intended local path

But the document is not authoritative for the current live machine state because it still contains conflicting credential claims.

---

## Confirmed Drift And Builder Traps

### 1. Credential drift is real

The same local stack currently advertises three different stories:

- `docker-compose.yml`: password is `CHEF.jdgyuegf9924092.FLOW`
- `.env.local`: password is `postgres`
- `docs/local-database-setup.md`: table says password is `postgres`, but URL says `CHEF.jdgyuegf9924092.FLOW`

The live host connection path currently works with `postgres`.

### 2. The old local-env switcher is stale

`package.json` still exposes:

- `npm run env:use-local`

But that command copies `.env.local.dev` over `.env.local`.

`.env.local.dev` is still Supabase-era configuration:

- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- no local `DATABASE_URL=...54322...`

So `npm run env:use-local` should not be trusted as the canonical local-Docker switch path.

### 3. The old local bootstrap script path is stale

`package.json` still exposes:

- `npm run local:bootstrap` -> `docker compose up -d && npm run seed:local`

But `scripts/seed-local-demo.ts` still expects:

- `NEXT_PUBLIC_DB_URL`
- local database URL on `127.0.0.1:54321`

That does not match the current direct-Postgres Docker path on `54322`, and it relies on an older compat/admin flow. Do not treat `local:bootstrap` as the canonical recovery path for the current Docker setup.

### 4. The current volume is schema-drifted

Observed runtime SQL failures against the active database include missing objects such as:

- table `invoices`
- column `events.event_time`
- column `events.title`
- column `conversations.unread_count`
- column `inquiries.client_name`
- column `inquiries.occasion`
- column `chef_marketplace_profiles.service_area_radius_miles`

This is not a Docker networking problem. The app is reaching the database; the schema in the active volume does not match current code expectations.

### 5. The active local DB likely predates later migrations

Verified indicators:

- migration files on disk: `658`
- public tables in active DB: `709`
- no migration-tracking table was found via information schema probe
- named volume `cfv1_chefflow_pgdata` predates the current run and was reused

The repo also has a scratch-rebuild script, `scripts/init-local-db.sh`, that applies all SQL files directly. That fits a rebuild-from-scratch model better than an in-place tracked migration model.

### 6. Health is mixed, not fully red

Current health endpoints:

- `/api/health` -> `ok`
- `/api/health/readiness` -> `degraded`

The readiness degradation is currently tied to missing background-job admin env, not to Docker reachability.

### 7. There are separate dev-server issues outside Docker

The active dev log also shows intermittent Next.js dev-runtime/cache issues. Those are real, but they are a separate lane from the Docker/schema mismatch and should be triaged independently.

---

## Ordered Builder Sequence

The builder should follow this exact order.

### Phase 0. Start from the correct mental model

Treat the current local setup as:

1. Next.js on the host
2. PostgreSQL in Docker
3. local files on the host
4. no project bind mount into the DB container

Do not waste time trying to debug a missing source-tree mount inside Postgres. That is not part of the intended architecture.

Exit condition:

- the builder understands that Docker currently provides only the database layer

### Phase 1. Preserve evidence before mutating anything

Before any destructive action:

1. capture `docker compose ps`
2. capture `docker ps -a`
3. inspect `cfv1_chefflow_pgdata`
4. back up the current DB contents

Preferred first backup command:

- `bash scripts/backup-db.sh`

If that backup path is unusable in the current environment, export the DB contents with a direct Docker/psql-compatible path before changing the volume.

Exit condition:

- the current DB state is recoverable

### Phase 2. Choose one recovery path explicitly

The builder must choose and document one of these paths.

#### Path A. Preserve the current local data

Use this only if the current local DB contents matter.

Required steps:

1. keep the backup created in Phase 1
2. classify whether the missing schema is repairable in place or whether the volume is too far behind
3. inspect the bootstrap assumptions in:
   - `scripts/init-local-db.sh`
   - `database/migrations/`
   - `package.json`
4. write down whether a targeted repair path exists for this local Docker model

Do not jump straight to `npm run db:migrate` or `npm run drizzle:migrate` without first proving they are the correct mechanism for this repo's raw SQL migration history.

Exit condition:

- the builder has a justified in-place repair plan, or has formally decided to rebuild instead

#### Path B. Rebuild from scratch

This is the recommended clean path if the current local DB contents are disposable.

Required steps:

1. preserve a backup anyway
2. remove the current volume
3. start the Compose DB fresh
4. run `scripts/init-local-db.sh`
5. verify the app against the fresh schema

The canonical rebuild flow is:

1. `docker compose down -v`
2. `docker compose up -d`
3. `bash scripts/init-local-db.sh`

Do not substitute `npm run local:bootstrap` for this path. It is stale.

Exit condition:

- the active local volume is freshly initialized from the repo's current SQL/bootstrap path

### Phase 3. Normalize the config story

After repair or rebuild, make the credential and bootstrap story internally consistent.

The builder must reconcile at least these surfaces:

- `docker-compose.yml`
- `.env.local.example`
- `.env.local.dev`
- `docs/local-database-setup.md`
- `package.json` scripts:
  - `env:use-local`
  - `local:bootstrap`
  - any other local DB helper that assumes `54321` or Supabase

Exit condition:

- there is one documented local credential story
- there is one documented bootstrap path
- stale `54321`/Supabase local-helper paths are either repaired or clearly retired

### Phase 4. Re-verify the live app against the repaired DB

Minimum verification:

1. host-side DB auth succeeds using the documented local credential
2. `docker compose ps` shows `chefflow_postgres` healthy
3. `/api/health` returns `ok`
4. the high-noise schema errors disappear from Postgres logs for the known failing queries
5. the builder re-checks the app paths that were previously triggering the missing-column/table queries

Exit condition:

- the Docker foundation is no longer the source of schema mismatch noise

### Phase 5. Clean up Docker Desktop ambiguity

After the main path is stable:

1. remove or archive the stale `spotfyapp-postgres` container if it is not needed
2. confirm Docker Desktop shows only the intended local DB story for this project

Exit condition:

- Docker Desktop no longer mixes an active `cfv1` project with an unrelated stale Postgres container

---

## Commands And Scripts The Builder Should Treat Carefully

### Safe to trust first

- `docker compose ps`
- `docker ps -a`
- `docker volume inspect cfv1_chefflow_pgdata`
- `bash scripts/backup-db.sh`
- `bash scripts/init-local-db.sh` for a scratch rebuild

### Do not trust blindly

- `npm run env:use-local`
- `npm run local:bootstrap`
- `npm run seed:local`
- `npm run db:migrate`
- `npm run drizzle:migrate`

Reason:

- the first three still reflect the old `54321`/Supabase-style local path
- the last two may not represent the canonical recovery mechanism for this repo's raw SQL migration history and scratch-bootstrap model

---

## Key File Map

### Live Docker/runtime truth surfaces

- `docker-compose.yml`
- `.env.local`
- `docs/local-database-setup.md`
- `lib/db/index.ts`
- `lib/db/admin.ts`

### Bootstrap and migration surfaces

- `scripts/init-local-db.sh`
- `database/migrations/`
- `scripts/plan-migration-repair.mjs`
- `scripts/apply-migration-repair.mjs`

### Stale local-helper surfaces to reconcile

- `.env.local.dev`
- `package.json`
- `scripts/seed-local-demo.ts`

---

## Completion Condition

This handoff is complete when the next builder can do all of the following without guessing:

- explain why Docker Desktop shows blank fields on the `cfv1` row
- explain that the project source is not supposed to be mounted into Postgres
- identify the stale local helper scripts and env files
- choose a justified repair path
- repair or rebuild the local DB foundation
- leave the repo with one coherent local Docker/bootstrap story
