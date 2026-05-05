# Codex Build Spec: PIE Coverage Gap Detector Tests

> **Priority:** P1 - Feeds auto-expansion engine. Wrong gaps = wrong expansion targets
> **Risk:** LOW - test-only, no production code modified
> **Estimated scope:** ~200 lines, 1 new test file

## Context

`lib/pricing/coverage-gap-detector.ts` (404 lines) scores every pricing region by freshness, source diversity, and ingredient coverage relative to the Census. Produces prioritized expansion targets consumed by the Auto-Expansion Engine. Zero tests exist.

## File to Create

`tests/unit/pie.coverage-gap-detector.test.ts`

## What to Test

### 1. Region scoring

- Region with 100% Census coverage, all fresh, multiple sources = high score (90+)
- Region with 0% coverage = score near 0
- Region with stale-only data = low freshness score even if ingredient count is high

### 2. Composite priority calculation

- Priority combines coverage, freshness, diversity with weights
- Higher priority (lower number) = more urgent gap
- Verify weighting: coverage weight > freshness weight > diversity weight

### 3. Expansion target generation

- Regions below threshold get queued as expansion targets
- Regions above threshold do NOT get queued
- Critical regions (score < 10) counted separately in result

### 4. Result structure

- `CoverageGapResult` has: regionsScanned, gapsIdentified, expansionTargetsQueued, criticalRegions, durationMs, topGaps
- topGaps sorted by priorityScore ascending (most urgent first)

### 5. Edge cases

- Zero regions in DB = empty result, no crash
- Region with no Census ingredients mapped = skip, don't divide by zero
- All regions fully covered = 0 gaps

## Test Approach

Mock `pgClient`. Build test regions with known coverage/freshness/diversity values. Verify scores match expected calculations.

## Acceptance Criteria

- `npm run test -- tests/unit/pie.coverage-gap-detector.test.ts` passes
- All 5 test groups covered
- No modifications to production code
