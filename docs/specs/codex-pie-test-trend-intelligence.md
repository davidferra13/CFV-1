# Codex Build Spec: PIE Trend Intelligence Tests

> **Priority:** P1 - 642 LOC, 6 exports, zero tests
> **Risk:** LOW - test-only, no production code modified
> **Estimated scope:** ~250 lines, 1 new test file

## Context

`lib/pricing/trend-intelligence.ts` (642 lines) exports 6 functions: `runTrendAnalysis`, `getTrendsForIngredients`, `getActiveVolatilityAlerts`, `getSeasonalPatterns`, `getCategoryTrendSummary`, `dismissAlert`. Zero tests exist.

## File to Create

`tests/unit/pie.trend-intelligence.test.ts`

## What to Test

### 1. `runTrendAnalysis`

- Given 30 days of rising prices: detects upward trend
- Given 30 days of falling prices: detects downward trend
- Given stable prices (< 5% variance): trend = stable
- Returns: ingredientsAnalyzed, trendsDetected, alertsCreated, durationMs

### 2. `getTrendsForIngredients`

- Batch of ingredient IDs returns trend data for each
- Missing ingredient = excluded from results, not crash
- Each trend has: direction (up/down/stable), changePct, period, confidence

### 3. `getActiveVolatilityAlerts`

- Ingredients with price variance > threshold = active alert
- Dismissed alerts excluded from active list
- Alert has: ingredientId, severity, triggerPrice, avgPrice, createdAt

### 4. `getSeasonalPatterns`

- Ingredient with clear seasonal pattern (e.g., turkey in November) detected
- Returns monthly price index or similar seasonal representation
- Year-round stable ingredient = no seasonal pattern

### 5. `getCategoryTrendSummary`

- Aggregates trends across all ingredients in a category
- Returns: category, avgChangePct, dominantDirection, topMovers[]

### 6. `dismissAlert`

- Alert ID marked as dismissed
- No longer appears in getActiveVolatilityAlerts
- Dismissing non-existent alert = no-op, not crash

## Test Approach

Mock `pgClient`. Build controlled 30-day price histories with known trends. Verify trend detection math and alert thresholds.

## Acceptance Criteria

- `npm run test -- tests/unit/pie.trend-intelligence.test.ts` passes
- All 6 exports tested
- No modifications to production code
