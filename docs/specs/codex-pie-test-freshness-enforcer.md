# Codex Build Spec: PIE Freshness Enforcer Tests

> **Priority:** P0 - Broken freshness = chefs silently served month-old prices
> **Risk:** LOW - test-only, no production code modified
> **Estimated scope:** ~180 lines, 1 new test file

## Context

`lib/pricing/freshness-enforcer.ts` (212 lines) scans resolved_prices for stale entries past their category's freshness threshold and triggers re-estimation. Implements PIE Law 4 (Freshness Guarantee). Zero tests exist.

## File to Create

`tests/unit/pie.freshness-enforcer.test.ts`

## What to Test

### 1. Freshness report generation (`getFreshnessReport`)

- Prices updated today = fresh
- Prices older than category max_age_days = stale
- Report includes correct stalePct calculation
- byCategory breakdown sums correctly
- oldestPrice returns the actual oldest

### 2. Staleness thresholds by category

- Produce (perishable) has shorter threshold than spices (shelf-stable)
- Different tiers have different max_age_days
- Missing freshness_policy row for a category = use default threshold, not crash

### 3. Re-estimation trigger (`enforceFreshness`)

- Stale prices get flagged for re-estimation (reEstimated count > 0)
- Fresh prices are not touched
- Prices flagged for rescrape when source is scrapeable
- Return value includes correct durationMs

### 4. Edge cases

- Zero prices in DB = report with all zeros, no crash
- All prices fresh = 0 stale, 0 reEstimated
- All prices stale = everything flagged

## Test Approach

Mock `pgClient` with controlled price rows at known timestamps. Use `jest.useFakeTimers()` or inject "now" to control time-based comparisons.

## Acceptance Criteria

- `npm run test -- tests/unit/pie.freshness-enforcer.test.ts` passes
- All 4 test groups covered
- No modifications to production code
