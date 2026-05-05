# Codex Build Spec: PIE Auto-Expansion Engine Tests

> **Priority:** P1 - Self-healing loop. Untested = expansion might silently do nothing
> **Risk:** LOW - test-only, no production code modified
> **Estimated scope:** ~200 lines, 1 new test file

## Context

`lib/pricing/auto-expansion-engine.ts` (411 lines) consumes expansion_targets from the Coverage Gap Detector, finds stores in target regions, and dispatches scrape jobs. This is the "self-healing" loop (PIE Law 5). Zero tests exist.

## File to Create

`tests/unit/pie.auto-expansion-engine.test.ts`

## What to Test

### 1. Target consumption

- Picks highest-priority targets first (lowest priorityScore)
- Respects `maxTargetsPerRun` limit (default 10)
- Skips already-completed targets
- Marks targets as in-progress during processing

### 2. Store discovery

- Finds stores in target region from openclaw.stores
- Prefers stores with existing chain linkage (easier to scrape)
- Respects `maxStoresPerTarget` limit
- Returns StoreCandidate[] with correct fields

### 3. Dispatch logic

- Stores with known chain = dispatched for scraping
- Stores with no chain = skipped (can't scrape unknown store)
- storesDispatched count accurate in result

### 4. Result structure

- `ExpansionRunResult` has: targetsProcessed, storesDispatched, storesFound, regionsExpanded, skipped, errors[], durationMs
- Errors captured in array, not thrown (fault-tolerant)

### 5. Rate limiting and safety

- No targets in queue = clean empty result, no crash
- All targets already completed = 0 processed
- SSH dispatch failure for one store doesn't abort the run

## Test Approach

Mock `pgClient` and any SSH dispatch function. Do NOT actually SSH to Pi. Test the decision logic: target selection, store matching, dispatch decisions.

## Acceptance Criteria

- `npm run test -- tests/unit/pie.auto-expansion-engine.test.ts` passes
- All 5 test groups covered
- No modifications to production code
