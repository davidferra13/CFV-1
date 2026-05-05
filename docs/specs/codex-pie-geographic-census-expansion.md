# Codex Build Spec: PIE Census Geographic Expansion

> **Priority:** P1 - Census only references CA, RI, MA, CT. Needs all 50 states
> **Risk:** LOW - additive, expanding existing census logic
> **Estimated scope:** ~100 lines modified in 1 file

## Context

`lib/pricing/census.ts` (303 lines) maintains the Census of all American food ingredients (PIE Law 8). Currently only references CA, RI, MA, CT. The Census must cover all 50 states + DC for PIE to be truly nationwide.

## File to Modify

`lib/pricing/census.ts`

## What to Change

### 1. Ensure all 50 states + DC are represented in region generation

The Census should generate pricing regions for all states. Look for where states are defined or filtered:

- If there's a hardcoded state list: expand to all 50 + DC
- If states come from the stores table: ensure the query doesn't filter to NE-only
- If regions are generated from zip codes: ensure zip-to-state mapping covers nationwide

### 2. Region density

- Major metro areas get their own region (top 50 MSAs minimum)
- Rural areas grouped by state or multi-county region
- Every zip code in America maps to exactly one pricing region

### 3. Census ingredient list

- Verify the Census ingredient list is universal (not NE-biased)
- Ingredients like fresh citrus, avocado, chile peppers should be included even if rare in NE
- The Census defines WHAT should be priced everywhere, not what IS priced

## Do NOT Change

- The Census scoring logic (how coverage is measured)
- The cron endpoint that triggers census runs
- Any other pricing module

## Investigation Required

Read `census.ts` fully before making changes. The state limitation might be in:

- A hardcoded array
- A SQL WHERE clause
- A region-generation function
- An import from another config file

Find the constraint and remove/expand it.

## Acceptance Criteria

- Census generates regions for all 50 states + DC
- `npx tsc --noEmit --skipLibCheck` passes
- Existing census tests (if any) still pass
- No data loss (additive only)
