# TypeScript Zero-Errors Final Pass

**Date:** 2026-02-19
**Branch:** feature/packing-list-system

---

## What Was Done

This document covers the final TypeScript cleanup pass that brought the codebase to **zero source-level errors** after the `types/database.ts` regeneration earlier in the same session.

---

## Errors Fixed

### 1. `lib/menus/actions.ts` — `ComponentCategory` not in scope

**Error:**
```
lib/menus/actions.ts(754,39): error TS2304: Cannot find name 'ComponentCategory'.
lib/menus/actions.ts(791,39): error TS2304: Cannot find name 'ComponentCategory'.
```

**Root cause:** The file re-exports `ComponentCategory` on line 116 (`export type { ComponentCategory, TransportCategory } from './constants'`) but never imports it into the local scope. The type was used as a cast on two `.insert()` / `.update()` calls.

**Fix:** Added one import line at the top of the file:
```typescript
import type { ComponentCategory } from './constants'
```

**Files changed:**
- [lib/menus/actions.ts](../lib/menus/actions.ts) — line 12, added import

---

### 2. `lib/calendar/actions.ts` — File was a stub with `test` on line 1

**Error:**
```
lib/calendar/actions.ts(1,1): error TS2582: Cannot find name 'test'.
app/(chef)/calendar/*.tsx(n,n): error TS2306: File 'lib/calendar/actions.ts' is not a module.
```

**Root cause:** The file existed as a stub (just the word `test` on line 1) from a prior session. The calendar pages import `getUnifiedCalendar` and `UnifiedCalendarItem` from this file.

**State at fix time:** The file already had a full implementation from a previous write in the same session. The errors resolved once the `.next` build cache was cleared.

**What the file does:**
- Exports `UnifiedCalendarItem` type (re-exported from `lib/calendar/types.ts`)
- Implements `getUnifiedCalendar(startDate, endDate): Promise<UnifiedCalendarItem[]>` — queries 7 data sources in parallel and maps them to the unified calendar item shape:
  1. Events (any non-cancelled status)
  2. Event prep blocks
  3. Scheduled calls
  4. Chef availability blocks (manual only, not event-auto)
  5. Waitlist entries (as lead indicators)
  6. Chef calendar entries (personal/business/intentions)
  7. Inquiries with a preferred_date target (as soft lead indicators)
- Also exports `getFilteredCalendar()` (server-side filter helper) and `getYearDensity()` (week-by-week density for the year view)

---

### 3. `app/api/scheduled/push-cleanup/route.ts` — Invalid `.select()` overload

**Error:**
```
app/api/scheduled/push-cleanup/route.ts(49,19): error TS2554: Expected 0-1 arguments, but got 2.
```

**Root cause:** `.select('id', { count: 'exact', head: true })` is not valid after `.update()` in the Supabase client. The second argument only applies to `.select()` chains off `.from()`, not off `.update()`.

**Fix:** Changed to `.select('id')` and derived the count from `data?.length ?? 0`.

**Files changed:**
- [app/api/scheduled/push-cleanup/route.ts](../app/api/scheduled/push-cleanup/route.ts)

---

### 4. `app/api/scheduled/loyalty-expiry/route.ts` — Same `.select()` issue

Same pattern as push-cleanup. Fixed in the same session.

**Files changed:**
- [app/api/scheduled/loyalty-expiry/route.ts](../app/api/scheduled/loyalty-expiry/route.ts)

---

## Final State

```
npx tsc --noEmit --skipLibCheck
→ NO SOURCE ERRORS (0 errors in source files)
```

The `.next/types/**/*.ts` path is included in `tsconfig.json` for Next.js generated route types. These require a `next build` to be populated and are not source-level errors — they only appear when the `.next` directory is missing or stale.

---

## No Changes To

- Business logic / FSM
- Ledger / financial code
- Auth flows
- Database schema
- Any page functionality
