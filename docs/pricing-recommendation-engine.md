# Pricing Recommendation Engine

**Date:** 2026-03-26
**Status:** Implemented

## What It Does

Answers: "What should I charge for this event?" using two complementary lenses:

1. **Cost floor**: What must I charge to hit my target margin?
2. **Historical positioning**: What have I charged for similar events?

The recommendation is the HIGHER of the two, ensuring the chef never prices below cost while staying consistent with their market position.

## How It Works

### Cost-Based Pricing (new)

```
inputs:
  food cost (from menu -> recipe -> ingredient costing engine)
  labor cost (from expenses or manual estimate)
  travel cost (gas/mileage)
  overhead cost (equipment, supplies, venue)

formula:
  total_cost = food + labor + travel + overhead + other
  recommended_price = total_cost / (1 - target_margin)

  example: $400 total cost at 35% margin = $400 / 0.65 = $615
```

Returns 4 margin tiers: Conservative (25%), Standard (35%), Premium (45%), High-end (55%).

### Historical Pricing (existing, from `pricing-intelligence.ts`)

Percentile analysis on past events:

- Finds comparable events (guest count +/- 50%)
- Calculates P25, P50 (median), P75
- Flags underbidding risk if quote is below P25

### Unified Recommendation

| Scenario                          | Basis                 | Logic                                            |
| --------------------------------- | --------------------- | ------------------------------------------------ |
| Both available                    | `cost_and_historical` | Use higher of cost-based and historical midpoint |
| Cost only (< 3 historical events) | `cost_only`           | Use cost-based with target margin                |
| No cost data                      | `historical_only`     | Use historical percentile analysis               |

### Warnings Generated

- Food cost is $0 (menu not priced)
- No labor cost included
- Food > 50% of total cost (industry benchmark 25-35%)
- Cost exceeds historical pricing range (expensive menu)
- Historical underbidding risk

## Files

- **`lib/formulas/pricing-recommendation.ts`** - Pure formula (no DB, no AI, deterministic). Exports `calculatePricingRecommendation()`, `isPriceAboveCost()`, `calculateActualMargin()`.
- **`lib/pricing/recommend-actions.ts`** - Server action that fetches event data and feeds the formula. Exports `getPricingRecommendation()`.

## API

```typescript
// From a specific event (auto-fetches costs from menu + expenses)
const rec = await getPricingRecommendation({
  eventId: 'uuid',
  guestCount: 20,
  targetMargin: 0.35,
})

// Hypothetical scenario (manual cost inputs)
const rec = await getPricingRecommendation({
  guestCount: 12,
  foodCostCentsOverride: 30000, // $300
  laborCostCentsOverride: 15000, // $150
  travelCostCentsOverride: 5000, // $50
  targetMargin: 0.4,
})

// Result
rec.suggestedPriceCents // final recommended price
rec.suggestedPerPersonCents // per-person price
rec.totalCostCents // total estimated cost
rec.breakEvenPerPersonCents // minimum per-person (no profit)
rec.recommendations // 4 tiers (25%, 35%, 45%, 55%)
rec.historical // percentile analysis (if available)
rec.warnings // actionable alerts
rec.rationale // human-readable explanation
```

## Data Sources

| Input              | Source                                                      | Automatic?               |
| ------------------ | ----------------------------------------------------------- | ------------------------ |
| Food cost          | `menu_cost_summary.total_recipe_cost_cents`                 | Yes (if event has menu)  |
| Labor              | `expenses` where category = 'labor'                         | Yes (if expenses logged) |
| Travel             | `expenses` where category in ('gas_mileage', 'vehicle')     | Yes                      |
| Overhead           | `expenses` where category in ('equipment', 'supplies', ...) | Yes                      |
| Historical pricing | `events` where status in ('completed', 'confirmed', ...)    | Yes                      |
| Guest count        | Event or manual input                                       | Yes/manual               |

All inputs can be manually overridden for "what-if" scenarios.
