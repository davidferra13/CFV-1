# Phase 4: database SDK Cleanup

## What Changed

Removed direct `@database/database-js` and `@database/ssr` imports from all production code. The database SDK is no longer in the server-side data path.

## Summary

| Category                    | Files Migrated | Approach                                          |
| --------------------------- | -------------- | ------------------------------------------------- |
| API routes (cron, webhooks) | 10             | `createAdminClient()` from `@/lib/database/admin` |
| Library files               | 3              | `createAdminClient()` or structural types         |
| Client components           | 4              | Server actions or Auth.js                         |
| TypeScript scripts          | 18             | `createAdminClient()` from `@/lib/database/admin` |
| MJS scripts                 | 35             | Shared helper `scripts/lib/database.mjs`          |
| Test helpers                | 7              | `createAdminClient()`                             |
| Deleted                     | 1              | `lib/database/client.ts` (browser client)         |

## Files Deleted

- `lib/database/client.ts` - Browser database client. No longer imported anywhere.

## Files Created

- `scripts/lib/database.mjs` - Shared database client factory for `.mjs` scripts that can't use TypeScript path aliases. Exports `createAdminClient()`, `createAnonClient()`, and raw `createClient`.

## Remaining database SDK Usage

The `@database/database-js` package is still installed because:

1. **`scripts/lib/database.mjs`** - Centralized factory for 35 `.mjs` scripts
2. **`tests/e2e/client_rls_negative.spec.ts`** - Intentionally uses PostgreSQL anon client to test PostgREST RLS policies (can't use compat layer which bypasses RLS)

These are scripts and tests, not production server code. The package can be moved to `devDependencies`.

## Production Code Path

```
Browser -> Next.js -> Server Action -> createServerClient() -> CompatClient -> postgres.js -> PostgreSQL
```

No database SDK anywhere in this path. All 1,012 consumer files go through the compat layer.

## Environment Variables

The following PostgreSQL env vars are still referenced by scripts/tests but are NOT needed for the production app:

- `NEXT_PUBLIC_DATABASE_URL` - used by `.mjs` scripts via `scripts/lib/database.mjs`
- `NEXT_PUBLIC_DATABASE_ANON_KEY` - used by test scripts for RLS testing
- `DATABASE_SERVICE_ROLE_KEY` - used by `.mjs` scripts

The production app only needs:

- `DATABASE_URL` (or the default `postgresql://postgres:CHEF.jdgyuegf9924092.FLOW@127.0.0.1:54322/postgres`)
- `NEXTAUTH_SECRET` (for Auth.js + storage signed URLs)
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (for Google OAuth)
