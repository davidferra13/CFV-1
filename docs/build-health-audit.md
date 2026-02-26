# Build Health Audit — 'use server' Violations & TypeScript Fixes

**Branch:** `feature/packing-list-system`
**Date:** 2026-02-19
**Outcome:** `npm run build` passes cleanly — 258 routes compiled, 0 errors

---

## Why This Work Was Done

Running `npm run build` revealed a class of systematic errors across the codebase:

> **"A 'use server' file can only export async functions, found object"**

Next.js enforces that files marked `'use server'` may only export `async function`s at the module boundary. This is because `'use server'` files are compiled for server-only execution and their exports are treated as callable server actions. Exporting plain objects, arrays, Zod schemas, or non-async constants from these files causes a build-time failure.

Additionally, several TypeScript type errors and a stale `.next` cache were resolved.

---

## Changes Made

### 1. `'use server'` Violation Fixes (10 files)

Each affected file had constants/schemas extracted into a sibling file without `'use server'`. All consumer imports were updated to the new paths.

| Action File (was `'use server'`)        | Extracted To                         | What Was Moved                                                                                                                     |
| --------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `lib/clients/client-profile-actions.ts` | `lib/clients/fun-qa-constants.ts`    | `FUN_QA_QUESTIONS`, `FunQAKey`, `FunQAAnswers`                                                                                     |
| `lib/admin-time/actions.ts`             | `lib/admin-time/constants.ts`        | `ADMIN_TIME_CATEGORIES`, `AdminTimeCategory`                                                                                       |
| `lib/ai/parse-client.ts`                | `lib/ai/parse-client-schema.ts`      | `ParsedClientSchema`, `ParsedClient`                                                                                               |
| `lib/ai/parse-recipe.ts`                | `lib/ai/parse-recipe-schema.ts`      | `ParsedRecipeSchema`, `ParsedRecipe`, `ParsedIngredient`                                                                           |
| `lib/compliance/actions.ts`             | `lib/compliance/constants.ts`        | `SAFE_TEMP_RANGES`                                                                                                                 |
| `lib/contingency/actions.ts`            | `lib/contingency/constants.ts`       | `SCENARIO_LABELS`                                                                                                                  |
| `lib/events/fire-order.ts`              | `lib/events/fire-order-constants.ts` | `COURSE_COLORS`, `COURSE_ORDER`, `STATION_LABELS`, `CourseType`, `StationType`                                                     |
| `lib/professional/actions.ts`           | `lib/professional/constants.ts`      | `ACHIEVE_TYPE_LABELS`, `GOAL_CATEGORY_LABELS`                                                                                      |
| `lib/waste/actions.ts`                  | `lib/waste/constants.ts`             | `WASTE_REASONS`, `UNITS`, `WasteReason`, `IngredientUnit`                                                                          |
| `lib/calendar/actions.ts`               | `lib/calendar/types.ts`              | `UnifiedCalendarItemType`, `CalendarCategory`, `UnifiedCalendarItem`, `CalendarFilters`, `DEFAULT_CALENDAR_FILTERS`, `WeekDensity` |

**Rule:** The new constants files have no `'use server'` directive and export only types and plain values. The action files retain `'use server'` and import the constants as values where needed internally.

**Note on `export type { X } from './module'`:** Type re-exports in `'use server'` files are legal (types are erased at compile time), but re-exporting from a module that also contains non-function exports can trigger Next.js static analysis to follow the chain and fail. The `lib/calendar/actions.ts` case was fixed by removing the re-export entirely and defining the type locally.

---

### 2. `app/api/scheduled/monitor/route.ts` — Supabase Cast Fix

**Problem:** `cron_executions` table exists in a migration but is not yet reflected in the generated `types/database.ts`. The TypeScript compiler rejected `.from('cron_executions')` because the string literal wasn't in the known table union.

**Pattern that DOES NOT work:**

```typescript
supabase.from('cron_executions' as any) // ❌ casting the string arg doesn't help
```

**Pattern that works:**

```typescript
const db = supabase as any
const { data: recentRunsRaw } = await db.from('cron_executions').select(...)
const recentRuns: any[] = recentRunsRaw ?? []
```

**Why:** TypeScript resolves the overload on the client object itself. The string argument cast doesn't change the return type of `.from()`. You must cast the client to `any` first.

This is the same pattern already used in `lib/webhooks/audit-log.ts` for the `webhook_events` table.

---

### 3. `lib/events/debrief-actions.ts` — Double-Cast Fix

**Problem:** TypeScript 5.x enforces that a type cast from type A to type B requires sufficient overlap. When Supabase returns a `SelectQueryError` (because a joined column is not in the schema definition), casting directly to `any[]` fails:

```typescript
event.menus as any[] // ❌ SelectQueryError does not overlap with any[]
```

**Fix:**

```typescript
event.menus as unknown as any[] // ✅ routes through unknown first
```

The intermediate `unknown` cast is the TypeScript-safe escape hatch for cases where the source type is a structural mismatch.

---

### 4. Stale `.next` Cache Cleared

The original "Module not found: Can't resolve '@/components/menus/menu-doc-editor'" error was a false alarm caused by a stale webpack cache. The file existed at 953 lines — a full implementation. Clearing `.next` and rebuilding resolved the webpack error and revealed the real issues listed above.

---

## How the Pattern Works Going Forward

When adding constants or types that client components need to import from a server-action file:

1. **Create a sibling `constants.ts` or `types.ts`** — no `'use server'` directive
2. **Export everything non-async from there** — types, enums, plain objects, arrays, Zod schemas
3. **Keep `'use server'` files to async functions only**
4. **For new DB tables not in `types/database.ts`:** use `const db = supabase as any` until `types/database.ts` is regenerated via `supabase gen types typescript --linked`

---

## Build Result

```
✓ Compiled successfully
✓ Linting and checking validity of types (warnings only — <img> elements)
✓ Generating static pages (258/258)
```

The `[ActivityPage] Dynamic server usage` console messages during the build are **expected** — they appear because pages using `cookies()` cannot be statically pre-rendered. Next.js correctly marks them as `ƒ (Dynamic)` and renders them on-demand. These are not errors.

---

## Files Created

- `lib/clients/fun-qa-constants.ts`
- `lib/admin-time/constants.ts`
- `lib/ai/parse-client-schema.ts`
- `lib/ai/parse-recipe-schema.ts`
- `lib/compliance/constants.ts`
- `lib/contingency/constants.ts`
- `lib/events/fire-order-constants.ts`
- `lib/professional/constants.ts`
- `lib/waste/constants.ts`
- `lib/calendar/types.ts`
