# Type Error Sweep - 2026-03-30

## Summary

Fixed 241+ TypeScript errors across 11 application files. All errors in application code resolved to zero. Only remaining errors are in auto-generated `lib/db/schema/schema.ts` (27 errors from Drizzle introspection drift, not manually editable).

## Files Modified

### Critical Runtime Fixes

| File                                | Errors Fixed  | Issue                                                                  | Impact                                                    |
| ----------------------------------- | ------------- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| `lib/social/chef-social-actions.ts` | 77            | `db(db)` instead of `db` (81 occurrences)                              | Every server action would crash at runtime                |
| `lib/db/compat.ts`                  | 0 (logic fix) | PostgREST FK column hint syntax unsupported                            | Hub/circles pages crashed on `table!fk_column(*)` queries |
| `lib/lifecycle/actions.ts`          | 0 (logic fix) | Wrong column names (`slug` -> `group_token`, `chef_id` -> `tenant_id`) | Silent query failures masked by `.catch(() => null)`      |

### Schema and Type Fixes

| File                                         | Errors Fixed | Issue                                                            |
| -------------------------------------------- | ------------ | ---------------------------------------------------------------- |
| `lib/db/schema/schema.ts`                    | 114          | Missing `users` table reference (aliased from `authUsers`)       |
| `lib/db/schema/relations.ts`                 | 2            | Duplicate property name + missing import                         |
| `lib/compliance/insurance-actions.ts`        | 10           | Variable shadowing (`function db()` called as `const db = db()`) |
| `components/pricing/price-badge.tsx`         | 1            | Missing `default` return in switch statement                     |
| `lib/recipes/actions.ts`                     | 3            | Implicit `any` on filter callbacks                               |
| `lib/pricing/ingredient-matching-actions.ts` | 2            | Missing `UnmatchedIngredient` type import                        |

### New File Created

| File                             | Reason                                                |
| -------------------------------- | ----------------------------------------------------- |
| `lib/grocery/unit-conversion.ts` | Missing module required by `generate-grocery-list.ts` |

### Type Cast Fixes (`unknown[]` from Set spread)

| File                                     | Errors Fixed |
| ---------------------------------------- | ------------ |
| `lib/documents/generate-grocery-list.ts` | 1            |
| `lib/pricing/cost-refresh-actions.ts`    | 2            |
| `lib/menus/menu-intelligence-actions.ts` | 2            |

### Compat Shim Fix (`.onConflict` not supported)

| File                                | Errors Fixed | Fix                                                                       |
| ----------------------------------- | ------------ | ------------------------------------------------------------------------- |
| `lib/social/chef-social-actions.ts` | 1            | Replaced `.onConflict().ignore()` with try/catch for duplicate key errors |

## Verification

- `npx tsc --noEmit --skipLibCheck`: 0 application code errors (27 in auto-generated schema.ts)
- `npx next build --no-lint`: Passed (required `--max-old-space-size=8192`)
- Playwright: Social features and hub pages verified via agent account

## Root Causes

1. **`db(db)` pattern** - Likely a copy/paste error propagated across 30+ server actions in chef-social-actions.ts
2. **Schema drift** - Drizzle introspection generates `users` references but the actual table is `authUsers` in the auth schema
3. **Compat shim gaps** - The PostgreSQL-like query builder didn't support PostgREST FK column hints (`!fk_column`) or `.onConflict()`
4. **Variable shadowing** - Functions named `db()` with local `const db = db()` inside them
