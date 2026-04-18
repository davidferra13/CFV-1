# System Integrity Question Set: Data Layer & Database

> Sweep 11 of N. 50 binary pass/fail questions across 10 domains.
> Executed 2026-04-18. Methodology: code reading + grep + agent exploration.

## Summary

- **Score: 47/50 (94%)**
- **Fixes applied: 2** (FK fallback warning, Drizzle pgView SQL sync)
- **Remaining gaps: 3** (documented below)

---

## Domain 1: Connection & Pool Management (5/5)

| #   | Question                                                    | Result | Evidence                                                              |
| --- | ----------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| 1   | Connection pool has bounded max connections                 | PASS   | `lib/db/index.ts:13` - `max: 10`                                      |
| 2   | Idle timeout configured to reclaim stale connections        | PASS   | `lib/db/index.ts:14` - `idle_timeout: 20`                             |
| 3   | Statement timeout prevents runaway queries                  | PASS   | `lib/db/index.ts:18` - `statement_timeout: 30000`                     |
| 4   | DATE columns return strings (not JS Date) to match TS types | PASS   | `lib/db/index.ts:20-31` - DATE OID override, parse returns raw string |
| 5   | No ad-hoc connections created outside singleton pool        | PASS   | All 36 pgClient importers use shared singleton from `lib/db`          |

## Domain 2: SQL Injection Prevention (5/5)

| #   | Question                                                     | Result | Evidence                                                                 |
| --- | ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------ |
| 6   | All SQL identifiers pass through assertIdent regex           | PASS   | `lib/db/compat.ts:56-72` - 30+ call sites verified                       |
| 7   | User values always use positional $N parameters              | PASS   | Every filter/insert/update/upsert uses `params.push()` + `$${idx++}`     |
| 8   | assertIdent rejects dotted identifiers with invalid segments | PASS   | `compat.ts:60-66` - splits on `.`, validates each part                   |
| 9   | OR expression parser validates column names before SQL       | PASS   | `compat.ts:877` - `assertIdent(col)` before embedding                    |
| 10  | Automated test enforces no raw string concat SQL             | PASS   | `tests/system-integrity/q72-sql-interpolation-safety.spec.ts` - 6 checks |

## Domain 3: Compat Shim Query Builder (5/5)

| #   | Question                                               | Result | Evidence                                                                 |
| --- | ------------------------------------------------------ | ------ | ------------------------------------------------------------------------ |
| 11  | `.single()` returns error on zero rows                 | PASS   | `compat.ts:515-525` - PGRST116 error, status 406                         |
| 12  | `.maybeSingle()` returns null data without error       | PASS   | `compat.ts:530-532` - `data[0] ?? null`, no error                        |
| 13  | Nested select generates proper LEFT JOINs              | PASS   | `compat.ts:452-476` - parseSelectString + buildJoinPlans + FK resolution |
| 14  | Count queries with head:true return count without rows | PASS   | `compat.ts:492-503` - count subquery + head returns null data            |
| 15  | Upsert generates ON CONFLICT clause                    | PASS   | `compat.ts:1121-1141` - conflict target + DO UPDATE SET                  |

## Domain 4: Migration System Integrity (5/5)

| #   | Question                                                   | Result | Evidence                                                          |
| --- | ---------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| 16  | Migration timestamps strictly ascending (no collisions)    | PASS   | 738 files, zero duplicate timestamps                              |
| 17  | No migration contains DROP TABLE without documented reason | PASS   | 4 mentions all in comments stating "no DROP TABLE"                |
| 18  | Drizzle schema file reflects current view definitions      | PASS   | Fixed in this sweep - view SQL synced to migration 20260417000005 |
| 19  | Migration files use safe SQL (no interpolation)            | PASS   | Raw SQL files with literal values only                            |
| 20  | Archive directory exists for retired migrations            | PASS   | `database/migrations/archive/` exists                             |

## Domain 5: Schema & Type Safety (5/5)

| #   | Question                                                       | Result | Evidence                                                                              |
| --- | -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| 21  | `types/database.ts` never manually edited                      | PASS   | Auto-generated Supabase types, 52K lines                                              |
| 22  | Drizzle schema defines proper FK constraints                   | PASS   | FK map has 1,340 entries generated from schema FKs                                    |
| 23  | Enum values in schema match migration CREATE TYPE              | PASS   | Schema generated via introspection from same DB                                       |
| 24  | All monetary columns use integer type (not float)              | PASS   | All `*_cents` columns are `integer()` or `bigint()`. `numeric()` only for percentages |
| 25  | `database.generated.d.ts` has @ts-nocheck, no callable exports | PASS   | Line 1: `// @ts-nocheck`. Zero `export function` matches                              |

## Domain 6: Immutability & Audit Trail (5/5)

| #   | Question                                                     | Result | Evidence                                                 |
| --- | ------------------------------------------------------------ | ------ | -------------------------------------------------------- |
| 26  | ledger_entries has BEFORE UPDATE trigger                     | PASS   | Migration 20260215000003:718-731                         |
| 27  | ledger_entries has BEFORE DELETE trigger                     | PASS   | Same migration, both triggers defined                    |
| 28  | event_state_transitions has immutability triggers            | PASS   | Migration 20260215000003:741-747                         |
| 29  | quote_state_transitions has immutability triggers            | PASS   | Migration 20260215000003:749-755                         |
| 30  | Account deletion is only sanctioned bypass, re-enables after | PASS   | Migration 20260326000011:94 - DISABLE/ENABLE TRIGGER ALL |

## Domain 7: Soft-Delete Consistency (4/5)

| #   | Question                                                           | Result   | Evidence                                                                   |
| --- | ------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------- |
| 31  | Tables with deleted_at have partial index WHERE deleted_at IS NULL | PASS     | Migration 20260326000009:36-54 - all 5 core tables indexed                 |
| 32  | Queries on soft-deletable tables filter for non-deleted rows       | PASS     | events, clients, menus all use `.is('deleted_at', null)` consistently      |
| 33  | No table uses both is_deleted AND deleted_at redundantly           | **FAIL** | `chef_post_comments` has both (migration 20260304000005:114-115)           |
| 34  | Soft-delete columns are TIMESTAMPTZ for core tables                | PASS     | events, clients, menus, inquiries, quotes all use `deleted_at TIMESTAMPTZ` |
| 35  | Delete ops on soft-deletable tables use UPDATE not DELETE          | PASS     | events/clients/menus all use `.update({ deleted_at: ... })`                |

**F33**: `chef_post_comments` has `is_deleted BOOLEAN` + `deleted_at TIMESTAMPTZ`. RLS policy and index use `is_deleted`. Core tables use only `deleted_at`. Two conventions in one codebase. Low priority - social features are secondary. Fix: migration to drop `is_deleted`, update queries to use `deleted_at IS NULL`.

## Domain 8: Auth Gating on Data Operations (4/5)

| #   | Question                                                            | Result   | Evidence                                                                               |
| --- | ------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| 36  | 'use server' files with .delete() have auth gate                    | PASS     | All sampled: requireChef/requireAdmin before delete                                    |
| 37  | 'use server' files with .insert() derive tenant_id from session     | PASS     | Pattern: `user.tenantId!` from requireChef()                                           |
| 38  | 'use server' files with .update() include tenant scoping            | PASS     | `.eq('tenant_id', user.tenantId!)` on all sampled updates                              |
| 39  | No internal-only DB helpers exported from 'use server' without auth | **FAIL** | `notifications/triggers.ts` - 8 exports, zero auth gates, 'use server'                 |
| 40  | Raw pgClient usage in production code is auth-gated                 | PASS     | completion=requireChef, staff=requireStaff, discover=requireAdmin, finance=requireChef |

**F39**: `lib/notifications/triggers.ts` is `'use server'` but exports 8 functions (e.g., `notifyOrderReady(tenantId, ...)`) with no auth checks. Browser could inject notifications to any tenant. Mitigating factor: notification injection only (no data leak). Note: 26 total 'use server' files export tenantId-accepting functions, but most have `requireChef()` + tenant mismatch guards internally. `notifications/triggers.ts` is the only one with zero auth.

## Domain 9: FK Map & JOIN Resolution (3/5)

| #   | Question                                                    | Result   | Evidence                                                           |
| --- | ----------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| 41  | FK map generation queries information_schema                | PASS     | `scripts/generate-fk-cache.mjs` - joins 3 information_schema views |
| 42  | FK map covers all tables referenced in nested selects       | **FAIL** | Generated 2026-03-28, ~20 days of migrations not reflected         |
| 43  | Compat shim falls back gracefully when FK mapping not found | PASS     | Fixed: added console.warn before heuristic guess (`compat.ts:680`) |
| 44  | FK map regeneration script exists in package.json           | PASS     | `"db:fk-cache": "node scripts/generate-fk-cache.mjs"`              |
| 45  | No stale entries in FK map referencing dropped tables       | PASS     | Zero DROP TABLE in any migration                                   |

**F42**: FK map last generated 2026-03-28. Any FKs from migrations after that date are missing. Fix: run `npm run db:fk-cache` (requires Docker container `chefflow_postgres` running).

## Domain 10: Views & Computed Data (5/5)

| #   | Question                                           | Result | Evidence                                                          |
| --- | -------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| 46  | event_financial_summary view exists and is current | PASS   | Migration 20260417000005 - latest version                         |
| 47  | Financial views compute from ledger_entries        | PASS   | Correlated subqueries against ledger_entries, not stored balances |
| 48  | Views handle NULL safely (COALESCE)                | PASS   | All subquery results wrapped in `COALESCE(..., 0)::bigint`        |
| 49  | View definitions match Drizzle pgView declarations | PASS   | Fixed: updated `schema.ts:24783` to match migration SQL           |
| 50  | No view references a dropped or renamed column     | PASS   | No columns dropped in any migration                               |

---

## Fixes Applied This Sweep

### Fix 1: FK Map Heuristic Warning (Q43)

- **File**: `lib/db/compat.ts:680`
- **Change**: Added `console.warn()` when FK map lookup fails and falls back to singular-guess heuristic
- **Why**: Silent fallback could produce wrong JOINs. Warning makes it detectable in logs

### Fix 2: Drizzle pgView SQL Sync (Q49)

- **File**: `lib/db/schema/schema.ts:24783`
- **Change**: Replaced stale LEFT JOIN SQL with correlated subquery SQL matching migration 20260417000005
- **Bugs fixed in .as() SQL**:
  1. Cartesian product from LEFT JOIN ledger_entries + LEFT JOIN expenses
  2. Missing `WHERE e.deleted_at IS NULL` filter
  3. Outstanding balance formula: was `quoted - paid`, now `quoted - paid + refunded`

---

## Remaining Action Items

| ID  | Domain  | Issue                                                           | Priority | Fix                                             |
| --- | ------- | --------------------------------------------------------------- | -------- | ----------------------------------------------- |
| F33 | SoftDel | `chef_post_comments` dual soft-delete columns                   | Low      | Migration to drop `is_deleted`, update queries  |
| F39 | Auth    | `notifications/triggers.ts` has zero auth gates in 'use server' | Medium   | Move to internal file or add auth checks        |
| F42 | FKMap   | FK map 3 weeks stale                                            | Medium   | Run `npm run db:fk-cache` when Docker available |
