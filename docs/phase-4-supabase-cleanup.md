# Phase 4: Supabase SDK Cleanup

## What Changed

Removed direct `@supabase/supabase-js` and `@supabase/ssr` imports from all production code. The Supabase SDK is no longer in the server-side data path.

## Summary

| Category                    | Files Migrated | Approach                                          |
| --------------------------- | -------------- | ------------------------------------------------- |
| API routes (cron, webhooks) | 10             | `createAdminClient()` from `@/lib/supabase/admin` |
| Library files               | 3              | `createAdminClient()` or structural types         |
| Client components           | 4              | Server actions or Auth.js                         |
| TypeScript scripts          | 18             | `createAdminClient()` from `@/lib/supabase/admin` |
| MJS scripts                 | 35             | Shared helper `scripts/lib/supabase.mjs`          |
| Test helpers                | 7              | `createAdminClient()`                             |
| Deleted                     | 1              | `lib/supabase/client.ts` (browser client)         |

## Files Deleted

- `lib/supabase/client.ts` - Browser Supabase client. No longer imported anywhere.

## Files Created

- `scripts/lib/supabase.mjs` - Shared Supabase client factory for `.mjs` scripts that can't use TypeScript path aliases. Exports `createAdminClient()`, `createAnonClient()`, and raw `createClient`.

## Remaining Supabase SDK Usage

The `@supabase/supabase-js` package is still installed because:

1. **`scripts/lib/supabase.mjs`** - Centralized factory for 35 `.mjs` scripts
2. **`tests/e2e/client_rls_negative.spec.ts`** - Intentionally uses Supabase anon client to test PostgREST RLS policies (can't use compat layer which bypasses RLS)

These are scripts and tests, not production server code. The package can be moved to `devDependencies`.

## Production Code Path

```
Browser -> Next.js -> Server Action -> createServerClient() -> CompatClient -> postgres.js -> PostgreSQL
```

No Supabase SDK anywhere in this path. All 1,012 consumer files go through the compat layer.

## Environment Variables

The following Supabase env vars are still referenced by scripts/tests but are NOT needed for the production app:

- `NEXT_PUBLIC_SUPABASE_URL` - used by `.mjs` scripts via `scripts/lib/supabase.mjs`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - used by test scripts for RLS testing
- `SUPABASE_SERVICE_ROLE_KEY` - used by `.mjs` scripts

The production app only needs:

- `DATABASE_URL` (or the default `postgresql://postgres:postgres@127.0.0.1:54322/postgres`)
- `NEXTAUTH_SECRET` (for Auth.js + storage signed URLs)
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (for Google OAuth)
