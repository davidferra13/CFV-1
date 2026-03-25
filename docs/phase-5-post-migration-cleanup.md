# Phase 5: Post-Migration Cleanup

## What Changed

1. **PostgreSQL packages moved to devDependencies** - `@database/database-js` and `@database/ssr` are now devDependencies (used only by scripts and tests, not production code).

2. **Drizzle npm scripts added** - `drizzle:generate`, `drizzle:migrate`, `drizzle:push`, `drizzle:pull`, `drizzle:studio`.

3. **CLAUDE.md updated** - Architecture section now reflects the new stack: PostgreSQL via postgres.js, Auth.js v5, local FS storage, SSE realtime. Key file locations table expanded with all new infrastructure files.

4. **Edge runtime fix** - `app/(public)/chef/[slug]/opengraph-image.tsx` switched from `runtime = 'edge'` to `runtime = 'nodejs'` because the import chain now includes Node.js-only modules (crypto, fs, net via postgres.js).

5. **Compat shim fixes:**
   - `gen_random_uuid()` in schema fixed from bare JS call to `sql` template tag
   - SQL identifier validation now allows table-qualified names (e.g., `chef_preferences.network_discoverable`)
   - `quoteIdent()` properly handles dotted identifiers (`"table"."column"`)
   - `buildWhere()` uses `qualifyColumn()` helper to avoid double-prefixing table-qualified columns
   - `parseSelectString()` regex now handles PostgreSQL `!inner` and `!left` join hints

## Build Status

`npx next build --no-lint` passes with 0 errors. All 735 static pages generated successfully.
