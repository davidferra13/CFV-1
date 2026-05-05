# Codex Build Spec: PIE Compound Learning Engine Tests

> **Priority:** P1 - If broken, PIE thinks it's learning when it isn't
> **Risk:** LOW - test-only, no production code modified
> **Estimated scope:** ~180 lines, 1 new test file

## Context

`lib/pricing/compound-learning.ts` (300 lines) implements PIE Law 7. Records synthetic price predictions, resolves them against real observations, and computes monthly accuracy metrics. Zero tests exist.

## File to Create

`tests/unit/pie.compound-learning.test.ts`

## What to Test

### 1. Prediction recording

- `PredictionRecord` stored with correct fields: canonicalIngredientId, pricingRegionId, predictedCents, predictedUnit, derivationMethod, confidence
- Duplicate prediction for same ingredient+region = updates, not duplicates

### 2. Resolution against real prices

- Prediction of $5.00, real price $5.00 = 100% accuracy
- Prediction of $5.00, real price $6.00 = correct error percentage calculated
- Unresolved predictions (no real price yet) stay unresolved, not counted in accuracy

### 3. Monthly rollup (`LearningRunResult`)

- predictionsResolved count correct
- newPredictionsRecorded count correct
- currentAccuracy vs priorAccuracy comparison
- improved = true when currentAccuracy > priorAccuracy

### 4. Learning status (`LearningStatus`)

- totalPredictions = resolved + unresolved
- byMethod breakdown: each derivation method has its own accuracy
- meanAbsErrorPct calculated correctly (mean of |predicted - actual| / actual \* 100)

### 5. Edge cases

- Zero predictions = null accuracy, not 0% or crash
- All predictions unresolved = null accuracy
- First month ever = priorAccuracy null, improved null

## Test Approach

Mock `pgClient`. Build controlled prediction + real-price pairs with known accuracy. Verify math.

## Acceptance Criteria

- `npm run test -- tests/unit/pie.compound-learning.test.ts` passes
- All 5 test groups covered
- No modifications to production code
