# Phase 2: Supabase Compatibility Layer (Drizzle-backed)

## What Changed

Instead of converting 1,012 individual files from Supabase PostgREST queries to Drizzle ORM syntax, we built a **compatibility shim** that makes `createServerClient()` and `createAdminClient()` return a Drizzle-backed query builder that mimics the Supabase PostgREST API.

This removes the Supabase SDK from the server-side data query path while keeping all consumer files unchanged.

## Files Modified

| File                     | Change                                          |
| ------------------------ | ----------------------------------------------- |
| `lib/db/compat.ts`       | New. 1,300-line compatibility query builder     |
| `lib/supabase/server.ts` | Now returns `CompatClient` from `lib/db/compat` |
| `lib/supabase/admin.ts`  | Now returns `CompatClient` from `lib/db/compat` |

## Architecture

```
Consumer files (1,012)
  |
  v
createServerClient() / createAdminClient()
  |
  v
CompatClient (lib/db/compat.ts)
  |
  v
QueryBuilder -> raw SQL via postgres.js
  |
  v
PostgreSQL (localhost:54322)
```

Previously:

```
Consumer files -> Supabase SDK -> PostgREST API -> PostgreSQL
```

Now:

```
Consumer files -> CompatClient -> postgres.js -> PostgreSQL (direct TCP)
```

## Supported Query Patterns

The compat layer supports all patterns found in the codebase:

### Filters

- `.eq()`, `.neq()`, `.gt()`, `.gte()`, `.lt()`, `.lte()`
- `.like()`, `.ilike()`
- `.is()` (null/boolean checks)
- `.in()` (array membership)
- `.not()` (negation: not is, not in, not like)
- `.or()` (PostgREST OR expression syntax)
- `.contains()`, `.containedBy()`, `.overlaps()` (JSONB/array ops)
- `.match()`, `.filter()` (generic filters)

### Select

- `.select('*')` - all columns
- `.select('col1, col2')` - specific columns
- `.select('*, related_table(col)')` - nested/join selects via LEFT JOIN
- `.select('id', { count: 'exact', head: true })` - count queries

### Mutations

- `.insert({})` with `.select().single()` returning
- `.update({})` with filters
- `.upsert({}, { onConflict: 'col' })`
- `.delete()` with filters

### Modifiers

- `.order('col', { ascending: false })`
- `.limit(n)`, `.range(from, to)`
- `.single()`, `.maybeSingle()`

### RPC

- `.rpc('function_name', { param: value })` via `SELECT * FROM fn(params)`

### Auth Admin

- `.auth.admin.getUserById()` - direct query on auth.users
- `.auth.admin.createUser()` - INSERT into auth.users with bcrypt
- `.auth.admin.deleteUser()` - DELETE from auth.users
- `.auth.admin.listUsers()` - paginated auth.users query

### Storage (stub for Phase 3)

- `.storage.from('bucket').upload()` - logs warning, returns stub path
- `.storage.from('bucket').remove()` - logs warning
- `.storage.from('bucket').createSignedUrl()` - returns placeholder URL
- `.storage.from('bucket').getPublicUrl()` - returns placeholder URL

## FK Resolution for Nested Selects

When a query uses nested selects like `.select('*, clients(full_name)')`, the compat layer:

1. Queries `information_schema.table_constraints` once at startup to build an FK cache
2. Uses the cached FK relationships to generate correct LEFT JOIN clauses
3. Falls back to naming convention (`table_name` -> `table_name_id` without trailing `s`) if no FK found
4. Returns nested data as a JSON object under the relation name (matching Supabase behavior)

## What Still Uses Supabase SDK

13 files import from `@/lib/supabase/client` (browser-side):

- 10 for Realtime subscriptions (Phase 3b)
- 2 for Storage operations (Phase 3)
- 1 for Auth (test banner)

63 files import directly from `@supabase/supabase-js` or `@supabase/ssr`:

- Scripts, tests, queue providers, cron jobs
- These will be addressed in Phase 4 cleanup

## Performance Notes

- No PostgREST intermediary: queries go directly to PostgreSQL via TCP
- FK cache is loaded once per process lifetime (not per request)
- No RLS overhead: queries run as the postgres superuser
- Trade-off: application must enforce tenant scoping (already done via `requireChef()` etc.)
