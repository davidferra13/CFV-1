# Codex Build Spec: Launch Stabilization - Agent 3 (Migration Timestamp Collision)

> **Priority:** P0. Duplicate migration timestamp will cause deployment failure.
> **Risk:** LOW. Rename one file. Zero code changes.

---

## CRITICAL RULES FOR CODEX

1. This is a FILE RENAME task. No code editing.
2. Do NOT modify the contents of any migration file.
3. Do NOT run any migrations. Do NOT run `drizzle-kit push`.
4. Commit with message: `fix(db): resolve duplicate migration timestamp 20260425000015`

---

## The Problem

Two migration files share timestamp `20260425000015`:

1. `database/migrations/20260425000015_multi_location_operations.sql`
2. `database/migrations/20260425000015_restaurant_ops_engine.sql`

Migration runners process files in alphabetical order. Duplicate timestamps cause unpredictable ordering or outright failures.

## The Fix

Rename the second file to use timestamp `20260425000016`:

```bash
mv database/migrations/20260425000015_restaurant_ops_engine.sql database/migrations/20260425000016_restaurant_ops_engine.sql
```

## Verification

1. Run: `ls database/migrations/20260425000015_*.sql` - should return exactly ONE file
2. Run: `ls database/migrations/20260425000016_*.sql` - should return exactly ONE file
3. No other changes needed

## What NOT to Do

- Do NOT modify migration file contents
- Do NOT run migrations
- Do NOT run drizzle-kit
- Do NOT touch any other file
- Do NOT modify database/schema.ts or types/database.ts
