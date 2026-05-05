# Codex Build Spec: PIE Predictive Supply Chain Tests

> **Priority:** P1 - 581 LOC of shortage forecasting with zero tests
> **Risk:** LOW - test-only, no production code modified
> **Estimated scope:** ~220 lines, 1 new test file

## Context

`lib/pricing/predictive-supply.ts` (581 lines) provides 5 capabilities: supply risk scoring, shortage forecasting, substitution engine, seasonal availability windows, and event risk assessment. Zero tests exist.

## File to Create

`tests/unit/pie.predictive-supply.test.ts`

## What to Test

### 1. Supply risk scoring

- Ingredient with stable multi-source supply = low risk (0-25)
- Ingredient with single source + price volatility = high risk (75-100)
- Risk level mapping: 0-25 = low, 26-50 = medium, 51-75 = high, 76-100 = critical
- factors[] populated with contributing risk factors

### 2. Substitution engine

- High-risk ingredient returns substitutes[]
- Substitutes are in same category (beef substitute = other protein, not flour)
- Each SubstituteOption has: ingredientId, name, priceCents, similarityScore
- No substitutes available = empty array, not crash

### 3. Seasonal availability windows

- Known seasonal ingredient (e.g., fresh cranberries) has availability window
- Year-round ingredient has null availability window
- Window dates are ISO strings

### 4. Event risk assessment

- Event with all low-risk ingredients = low overall risk
- Event with 1 critical ingredient = overall risk elevated
- Missing ingredient data = conservative (assume medium risk), not crash

### 5. Edge cases

- Unknown ingredient ID = null/empty result, not throw
- Zero price history = default to medium risk
- Category with no substitutes at all = empty substitutes[]

## Test Approach

Mock `pgClient` and `db` (file imports both). Provide controlled price histories and ingredient catalogs. Test the risk scoring math and substitution matching logic.

## Acceptance Criteria

- `npm run test -- tests/unit/pie.predictive-supply.test.ts` passes
- All 5 test groups covered
- No modifications to production code
