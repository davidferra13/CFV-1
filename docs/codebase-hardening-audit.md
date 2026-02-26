# Codebase Hardening Audit — Results & Changes

**Date:** 2026-02-26
**Branch:** `feature/risk-gap-closure`

## Audit Scope

Full codebase audit covering build config, architecture patterns, security, and code quality.

## Overall Grade: A (was A-)

Architecture is strong — multi-tenant isolation, ledger-first financials, 8-state FSM, RLS policies. The changes below close the remaining practical gaps.

## Changes Made

### 1. npm Vulnerability Patches

- **Ran `npm audit fix`** — patched ajv, minimatch, rollup
- **4 remaining** (all high-severity, Next.js internals) — require Next.js 16 upgrade (breaking change, deferred)

### 2. TypeScript Config Upgrade

- **`target`**: `ES2017` → `ES2020` — reduces unnecessary transpilation for modern Node.js
- **Added `noFallthroughCasesInSwitch: true`** — catches missing `break` statements in switch blocks

### 3. OAuth Type Safety

**File:** `app/api/integrations/social/callback/[platform]/route.ts`

- Removed 2 unnecessary `as any` casts on `stateRow.tenant_id` and `stateRow.code_verifier`
- The `social_oauth_states` table type in `types/database.ts` already has these fields typed correctly

### 4. API Key Audit Trail Fix

**File:** `lib/api/auth-api-key.ts`

- Added `ApiKeyRow` interface replacing `as any` cast on query result
- Changed fire-and-forget `last_used_at` update (`.then(() => {})`) to awaited `try/catch`
- Follows project's non-blocking side effects pattern — logs failure, never throws

### 5. Event Status Enum Validation

**File:** `app/api/v1/events/route.ts`

- Added import of `ALL_EVENT_STATUSES` from `lib/events/fsm`
- Validates `?status=` query parameter against the FSM's allowed statuses
- Returns 400 with allowed values if invalid status is passed
- Changed `status as any` → `status as EventStatus`

### 6. Dependency Updates (Tier 1 — Safe)

Updated safe, non-breaking dependencies:

- @sentry/nextjs, @stripe/stripe-js, stripe
- @supabase/supabase-js, @supabase/ssr
- @remotion/\*, remotion
- lucide-react, autoprefixer

## Not Changed (Intentional)

| Item                       | Why                                                                               |
| -------------------------- | --------------------------------------------------------------------------------- |
| `noUncheckedIndexedAccess` | Would produce 1000+ errors across 340k LOC — needs incremental adoption           |
| `noImplicitReturns`        | Same — too aggressive for a single session                                        |
| Next.js 16 upgrade         | Breaking change, requires dedicated session                                       |
| ~250 `as any` casts        | Most are Supabase `.from()` calls — need generated types update, not manual fixes |

## Files Modified

- `tsconfig.json` — target + strict option
- `lib/api/auth-api-key.ts` — type safety + await fix
- `app/api/v1/events/route.ts` — status validation
- `app/api/integrations/social/callback/[platform]/route.ts` — removed `as any`
- `package.json` / `package-lock.json` — audit fix + dependency updates
