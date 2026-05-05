# Codex Build Spec: PIE Synthetic Engine Tests

> **Priority:** P0 - Wrong synthetic prices = wrong prices for every chef outside NE
> **Risk:** LOW - test-only, no production code modified
> **Estimated scope:** ~200 lines, 1 new test file

## Context

`lib/pricing/synthetic-engine.ts` (362 lines) generates fallback prices when no real data exists. It uses category floors, subcategory medians, and regional price parity (RPP) adjustments. This is the "never null" guarantee (tier 9.5 and 10 in resolve-price). Zero tests exist.

## File to Create

`tests/unit/pie.synthetic-engine.test.ts`

## What to Test

### 1. Category floor generation

- Given a category with known prices, synthetic price >= category floor
- Given an empty category (no real prices), falls back to hardcoded floor from `subcategory-floors.ts`
- Floors are always positive (never $0.00, never negative)

### 2. Regional adjustment

- Given a base national price and a region with RPP > 1.0 (expensive area), synthetic price > national
- Given a region with RPP < 1.0 (cheap area), synthetic price < national
- Missing RPP data defaults to 1.0 (no adjustment, not crash)

### 3. Unit normalization

- Synthetic price per lb converts correctly to per oz, per kg
- Unit mismatch between request and stored data handled gracefully

### 4. Confidence scoring

- Synthetic prices always have confidence < 0.5 (they're estimates, not real)
- Confidence decreases as derivation chain gets longer

### 5. Edge cases

- Ingredient with no category at all still gets a price (absolute fallback)
- Null/undefined inputs return a valid SyntheticResult, never throw

## Test Approach

Mock the database calls (`pgClient`) to return controlled data. Do NOT hit a real database. Focus on the computation logic: floors, RPP multiplication, confidence scoring, unit conversion.

## Acceptance Criteria

- `npm run test -- tests/unit/pie.synthetic-engine.test.ts` passes
- All 5 test groups above covered
- No modifications to production code
