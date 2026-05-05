# Codex Build Spec: PIE Wholesale Intelligence Tests

> **Priority:** P1 - 551 LOC of wholesale vs retail comparison, zero tests
> **Risk:** LOW - test-only, no production code modified
> **Estimated scope:** ~200 lines, 1 new test file

## Context

`lib/pricing/wholesale-intelligence.ts` (551 lines) tracks wholesale pricing by distributor, compares wholesale vs retail, identifies break-even quantities, maps distributor coverage by region, and maintains markup models. Zero tests exist.

## File to Create

`tests/unit/pie.wholesale-intelligence.test.ts`

## What to Test

### 1. Wholesale price tracking

- WholesalePrice has all required fields: ingredientId, distributorId, priceCents, unit, packSize, perStandardUnitCents, minOrder, inStock, confirmedAt, availableStates
- Pack size normalization: "50 lb case" at $75 = $1.50/lb per standard unit

### 2. Wholesale vs retail comparison (`WholesaleComparison`)

- Wholesale $1.50/lb vs retail $3.00/lb = 50% savings
- Wholesale more expensive than retail = negative savings (flag, don't hide)
- Missing wholesale price = comparison not generated, not crash

### 3. Break-even quantity analysis

- Small order where wholesale + delivery > retail = "not worth it"
- Large order where wholesale saves money = "worth it"
- Break-even point calculation correct

### 4. Distributor coverage mapping

- Distributor available in MA, CT, RI = those states in availableStates
- Query by state returns only distributors serving that state
- Distributor with no state data = excluded from regional queries

### 5. Edge cases

- Ingredient with no wholesale sources = empty comparison
- Distributor with all items out of stock = inStock = false, still returned
- Zero retail price (free/donated) = comparison skipped, not divide-by-zero

## Test Approach

Mock `pgClient`. Build controlled distributor catalogs with known prices, pack sizes, and coverage areas. Verify savings math and per-standard-unit conversion.

## Acceptance Criteria

- `npm run test -- tests/unit/pie.wholesale-intelligence.test.ts` passes
- All 5 test groups covered
- No modifications to production code
