# Supabase Migration Repair Runbook

## Purpose

This repo had migration filename drift that passed a local uniqueness test but did not match Supabase CLI history semantics. The current source of truth for planning repairs is:

- [scripts/plan-supabase-migration-repair.mjs](/C:/Users/david/Documents/CFv1/scripts/plan-supabase-migration-repair.mjs)
- [tests/unit/supabase-migration-plan.test.ts](/C:/Users/david/Documents/CFv1/tests/unit/supabase-migration-plan.test.ts)

## Before touching the remote database

1. Back up the linked database.

```bash
supabase db dump --linked > backup-$(date +%Y%m%d-%H%M%S).sql
```

2. Generate the repair plan from the linked project.

```bash
npm run supabase:migration:plan
```

3. Confirm the linked CLI session can reach the remote database.

```bash
npx supabase db push --linked --include-all --dry-run
```

Expected result right now: a dry-run connection succeeds, then reports the known `20260305` history drift. If this command fails on credentials instead, restore the linked project password with `supabase link` or pass `-p`.

## Current expected repair sequence

If the linked project still matches the March 10, 2026 audit state, the repair sequence should be:

```bash
npx supabase migration repair --linked --status reverted 20260305
npx supabase migration repair --linked --status applied 20260313000011
npx supabase db push --linked --include-all
```

## Why these commands exist

- `20260305` is a legacy short remote version. The valid local replacement is `20260305000010_owner_observability_indexes.sql`.
- `20260313000011_purchase_orders.sql` overlaps later purchase-order schema work and should be recorded as satisfied instead of executed blindly.

## After the push

1. Recheck migration history.

```bash
npm run supabase:migration:plan
```

Expected result: no unknown remote-only versions.

2. Regenerate database types.

```bash
npm run supabase:types
```

3. Re-run the migration guard tests.

```bash
node --test --import tsx tests/unit/supabase-migration-plan.test.ts tests/unit/supabase-migration-versions.test.ts tests/unit/runtime-log-regressions.test.ts
```

## Safety notes

- Do not run `supabase db push` without explicit approval.
- If the planner reports a remote-only version other than `20260305`, stop and investigate before repair.
- If the planner reports invalid local filenames or duplicate 14-digit prefixes, fix local files before touching the remote database.
- The linked Supabase CLI session on this machine can use native credential storage. `SUPABASE_DB_PASSWORD` is optional, not required, when linked credentials already work.
