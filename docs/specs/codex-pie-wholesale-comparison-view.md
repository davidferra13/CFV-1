# Codex Build Spec: PIE Wholesale vs Retail Comparison View

> **Priority:** P2 - Chefs buy wholesale. Showing retail-only is leaving money on the table
> **Risk:** MEDIUM - new UI component, touches shopping/pricing surfaces
> **Estimated scope:** ~200 lines across 3 files

## Context

`lib/pricing/wholesale-intelligence.ts` (551 LOC) computes wholesale vs retail comparisons with savings analysis and break-even quantities. No UI surface exists for this data. Professional chefs routinely buy from Sysco, US Foods, Restaurant Depot, but ChefFlow only shows retail prices.

## What to Build

### 1. Server action: wholesale comparison

Create `lib/pricing/wholesale-comparison-actions.ts`:

- `getWholesaleComparison(ingredientId)` - single ingredient
- `getWholesaleComparisonBatch(ingredientIds)` - for recipe/event costing
- Returns: retailCents, wholesaleCents, savingsPct, breakEvenQty, distributorName, packSize
- Auth-gated, tenant-scoped

### 2. UI: Wholesale badge on price display

Where prices are shown, if wholesale data exists:

- Show "Wholesale: $X.XX/lb (save Y%)" below the retail price
- Small text, not competing with main price
- Only show when savings > 10% (don't show "save 2%")
- Tooltip: distributor name, pack size, minimum order

### 3. Recipe/Event level wholesale summary

On recipe cost and event cost views:

- Add a "Wholesale Savings" summary row
- "Buy these 8 ingredients wholesale: save $X.XX (Y%)"
- List which ingredients and from which distributors
- Break-even note: "Worth it for orders over X servings"

## Do NOT

- Create a standalone wholesale page/dashboard
- Modify `wholesale-intelligence.ts` logic
- Add distributor sign-up or account linking
- Show wholesale for ingredients without wholesale data

## Acceptance Criteria

- Ingredients with wholesale data show comparison
- Savings > 10% threshold enforced
- Recipe/event views show aggregate wholesale savings
- `npx tsc --noEmit --skipLibCheck` passes
- `npx next build --no-lint` passes
