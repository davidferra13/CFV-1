# Codex Build Spec: PIE resolve-price.ts Decomposition

> **Priority:** P2 - 1,760 lines in one file. Heart of PIE, hardest to maintain
> **Risk:** MEDIUM - refactoring critical path code. Must not change behavior
> **Estimated scope:** ~300 lines moved (net zero), 4-5 new files

## Context

`lib/pricing/resolve-price.ts` (1,760 lines) contains:

1. LRU price cache (60 lines)
2. 13-tier resolution waterfall
3. Single-ingredient lookup
4. Batch lookup with pre-warming
5. Each tier's query logic inline

Many tiers already delegate to external modules (pi-bridge, cross-store-average, category-baseline). But several tiers have their query logic inline in the giant switch/if chain. This refactor extracts them.

## Strategy: Extract, Don't Rewrite

Each tier becomes a `TierResolver` with a standard interface:

```typescript
// lib/pricing/tier-resolver.ts (NEW - shared interface)
export interface TierResult {
  priceCents: number
  unit: string
  source: string
  tier: number
  tierName: string
  confidence: number
  sourceDetail?: string
}

export interface TierResolver {
  tier: number
  name: string
  resolve(ingredientId: string, tenantId: string, state?: string): Promise<TierResult | null>
  resolveBatch?(
    ingredientIds: string[],
    tenantId: string,
    state?: string
  ): Promise<Map<string, TierResult>>
}
```

## Files to Create

### 1. `lib/pricing/tier-resolver.ts`

Interface definition above. ~30 lines.

### 2. `lib/pricing/tiers/chef-override.ts`

Extract tier 0 logic. Chef's manual price overrides from `chef_ingredient_prices`.

### 3. `lib/pricing/tiers/receipt-price.ts`

Extract tier 1 logic. Chef's own purchase receipts (manual, grocery_entry, po_receipt, vendor_invoice).

### 4. `lib/pricing/tiers/api-quote.ts`

Extract tier 2 logic. Live API prices from Kroger/Spoonacular/MealMe.

### 5. `lib/pricing/tiers/direct-scrape.ts`

Extract tier 3 logic. Real store website prices (openclaw_scrape PostgreSQL fallback).

### 6. `lib/pricing/tiers/flyer-price.ts`

Extract tier 4 logic. Weekly circular prices.

### 7. `lib/pricing/tiers/instacart-proxy.ts`

Extract tier 5 logic. Markup-adjusted Instacart prices.

### 8. `lib/pricing/tiers/market-aggregate.ts`

Extract tier 6.5 logic. System-level market price via ingredient alias bridge.

### 9. `lib/pricing/tiers/historical.ts`

Extract tier 8 logic. Chef's own average from past purchases.

## Files to Modify

### `lib/pricing/resolve-price.ts`

Replace inline tier logic with imports from `lib/pricing/tiers/*.ts`. The waterfall loop becomes:

```typescript
const tiers: TierResolver[] = [
  chefOverride, // 0
  receiptPrice, // 1
  apiQuote, // 2
  wholesale, // 2.5 (already external)
  piBridge, // 2.7 (already external)
  directScrape, // 3
  flyerPrice, // 4
  instacartProxy, // 5
  regionalAvg, // 6 (already external)
  marketAggregate, // 6.5
  government, // 7 (already external)
  historical, // 8
  categoryBaseline, // 9 (already external)
  syntheticDb, // 9.5
  syntheticInline, // 10
]

for (const tier of tiers) {
  const result = await tier.resolve(ingredientId, tenantId, state)
  if (result) return result
}
```

Keep the LRU cache and batch logic in resolve-price.ts. Only extract individual tier implementations.

## CRITICAL: Behavioral Equivalence

**This refactor MUST NOT change any pricing behavior.**

- Every tier returns the exact same price as before
- The waterfall order is identical
- The cache behavior is identical
- All existing tests pass without modification

### How to Verify

1. Before starting: run `npm run test -- tests/unit/pricing.resolve-price.test.ts` and save results
2. After refactor: run same tests, results identical
3. Run `npx tsc --noEmit --skipLibCheck` - passes
4. Run `npx next build --no-lint` - passes

## Do NOT

- Change tier order
- Change any query logic (copy-paste, don't optimize)
- Modify the LRU cache
- Touch batch pre-warming logic
- Add new tiers
- "Improve" any SQL queries

## Acceptance Criteria

- resolve-price.ts < 500 lines (down from 1,760)
- Each tier in its own file under `lib/pricing/tiers/`
- All existing pricing tests pass unchanged
- `npx tsc --noEmit --skipLibCheck` passes
- `npx next build --no-lint` passes
- Price resolution behavior identical (zero functional changes)
