# Codex Build Spec: PIE Anomaly Detector Tests

> **Priority:** P0 - Undetected anomalies = chefs see $50/lb chicken silently
> **Risk:** LOW - test-only, no production code modified
> **Estimated scope:** ~180 lines, 1 new test file

## Context

`lib/pricing/anomaly-detector.ts` (280 lines) exports `runAnomalyDetection()`. Catches price spikes, drops, and statistical outliers. Zero tests exist. If this breaks, bad prices flow through unchallenged.

## File to Create

`tests/unit/pie.anomaly-detector.test.ts`

## What to Test

### 1. Spike detection

- Price 3x higher than 30-day moving average = flagged as spike
- Price 10% above average = NOT flagged (normal variance)
- Threshold boundary: exactly at threshold = not flagged (conservative)

### 2. Drop detection

- Price drops 80% from prior observation = flagged
- Gradual 5% decline over weeks = not flagged

### 3. Statistical outliers

- Price > 3 standard deviations from category mean = outlier
- Price within 2 SD = normal

### 4. Result structure

- Each anomaly has: ingredientId, priorPrice, newPrice, anomalyType, severity
- Run returns: totalScanned, anomaliesFound, durationMs
- Empty price table = 0 anomalies, no crash

### 5. Multi-ingredient batch

- Multiple ingredients, only some anomalous = only anomalous ones flagged
- Already-flagged anomalies not double-counted on re-run

## Test Approach

Mock `pgClient`. Provide controlled price histories. Verify detection thresholds mathematically.

## Acceptance Criteria

- `npm run test -- tests/unit/pie.anomaly-detector.test.ts` passes
- All 5 test groups covered
- No modifications to production code
