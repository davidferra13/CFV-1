# Supabase Name Purge (2026-03-25)

## What Changed

Removed all references to "Supabase" from the codebase. The project now uses PostgreSQL directly via postgres.js with no Supabase branding.

### Code Changes

- **`lib/supabase/`** deleted, replaced by `lib/db/server.ts` and `lib/db/admin.ts`
- **~1000 files** had imports updated: `@/lib/supabase/server` -> `@/lib/db/server`, `@/lib/supabase/admin` -> `@/lib/db/admin`
- **Variable names** renamed: `const supabase` -> `const db`, `supabaseAdmin` -> `dbAdmin`, etc.
- **Type names** renamed: `SupabaseClient` -> `DbClient`, `SupabaseQueryBuilder` -> `DbQueryBuilder`, etc.
- **Function names** renamed: `createMockSupabase` -> `createMockDb`, `getAdminSupabase` -> `getAdminDb`, etc.

### File Renames

| Old                                           | New                                                 |
| --------------------------------------------- | --------------------------------------------------- |
| `lib/supabase/server.ts`                      | `lib/db/server.ts`                                  |
| `lib/supabase/admin.ts`                       | `lib/db/admin.ts`                                   |
| `scripts/lib/supabase.mjs`                    | `scripts/lib/db.mjs`                                |
| `scripts/verify-supabase.ts`                  | `scripts/verify-database.ts`                        |
| `scripts/apply-supabase-migration-repair.mjs` | `scripts/apply-migration-repair.mjs`                |
| `scripts/plan-supabase-migration-repair.mjs`  | `scripts/plan-migration-repair.mjs`                 |
| `scripts/supabase-restore-monitor.sh`         | `scripts/db-restore-monitor.sh`                     |
| `tests/unit/supabase-migration-*.test.ts`     | `tests/unit/db-migration-*.test.ts`                 |
| `tests/unit/supabase.google-oauth.test.ts`    | `tests/unit/google-oauth.test.ts`                   |
| `supabase/` directory                         | `database/` (new, old still on disk but gitignored) |

### Environment Variable Renames

**ACTION REQUIRED: Update your `.env.local`, `.env.local.beta`, `.env.local.prod` files:**

| Old                             | New                       |
| ------------------------------- | ------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `NEXT_PUBLIC_DB_URL`      |
| `SUPABASE_SERVICE_ROLE_KEY`     | `DB_SERVICE_ROLE_KEY`     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_DB_ANON_KEY` |
| `SUPABASE_E2E_ALLOW_REMOTE`     | `E2E_ALLOW_REMOTE`        |
| `SUPABASE_E2E_ALLOW_LOCAL`      | `E2E_ALLOW_LOCAL`         |

### Package Changes

- Removed `@supabase/ssr` from devDependencies
- Removed `supabase` CLI from devDependencies
- Kept `@supabase/supabase-js` in devDependencies (still used by `scripts/lib/db.mjs` and one test)
- Removed all `supabase:*` npm scripts, replaced with `db:*` using Drizzle

### CSP Changes

- Removed `*.supabase.co` from Content-Security-Policy connect-src and img-src in `next.config.js`
- Images now served from local storage only

### What Remains

- `@supabase/supabase-js` package in devDependencies (2 files still import it for script/test use)
- `__InternalSupabase` type in auto-generated `types/database.ts` (cannot change, it's from the type generator)
- Old `supabase/` directory on disk (gitignored, locked by Windows, can be manually deleted after restart)
