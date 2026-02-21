# Fix: database.ts Corruption from Supabase CLI Output

## What Changed

- **File:** `types/database.ts`
- **Change:** Removed a spurious first line reading `Initialising login role...` that had been prepended to the file.

## Root Cause

When `supabase gen types typescript --linked` is run, the Supabase CLI sometimes prints status messages to stdout (e.g., `Initialising login role...`) before the actual TypeScript output. If the command is piped with `>` to overwrite `types/database.ts`, these status lines get written into the file ahead of the TypeScript content.

The result is that `types/database.ts` begins with:

```
Initialising login role...
export type Json =
  ...
```

TypeScript cannot parse `Initialising login role...` as valid TypeScript and reports:

```
types/database.ts(1,1): error TS1434: Unexpected keyword or identifier.
types/database.ts(1,14): error TS1434: Unexpected keyword or identifier.
types/database.ts(1,20): error TS1434: Unexpected keyword or identifier.
types/database.ts(1,24): error TS1128: Declaration or statement expected.
```

Because `types/database.ts` is used as the single source of truth for all Supabase table/column types (via `@supabase/supabase-js`), a corrupted database types file causes every `.from('...')` call across the entire codebase to lose its type information. This was causing cascading errors in files like `lib/grocery/pricing-actions.ts`, `lib/admin/reconciliation-actions.ts`, and many others — making it appear those files had column/table type errors.

## Fix Applied

Removed line 1 of `types/database.ts` using:

```bash
tail -n +2 types/database.ts > /tmp/database_fixed.ts
cp /tmp/database_fixed.ts types/database.ts
```

After the fix, `npx tsc --noEmit --skipLibCheck` exits with code 0 and zero errors.

## Prevention

When regenerating `types/database.ts`, use one of these safer approaches:

```bash
# Option 1: Redirect stderr to /dev/null so only TypeScript goes to stdout
supabase gen types typescript --linked 2>/dev/null > types/database.ts

# Option 2: Verify the first line after generation
head -1 types/database.ts  # should be "export type Json ="
```

If the first line is not `export type Json =`, remove it with `tail -n +2`.

## Connection to System

- `types/database.ts` is auto-generated and must never be manually edited (per CLAUDE.md).
- It is used by `@supabase/supabase-js` to provide typed `.from()` table selectors throughout all server actions.
- Any corruption in this file cascades immediately into TypeScript errors across every file that queries Supabase.
