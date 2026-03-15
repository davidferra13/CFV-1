# Feature 3.19: Catering Bid Costing

**Status:** Implemented
**Date:** 2026-03-15
**Branch:** feature/openclaw-adoption

## What It Does

Cost entire catering events from the recipe database in minutes. Pulls ingredient costs from recipes, scales by guest count, adds labor/overhead/travel/equipment, and generates a complete bid with per-person pricing.

## How It Works

All costing is **deterministic math** (Formula > AI). Zero AI dependency.

### Costing Pipeline

1. **Recipe cost data** comes from the `recipe_cost_summary` database view, which aggregates ingredient costs from `recipe_ingredients` joined to `ingredients.last_price_cents`
2. **Scaling** uses the recipe's `yield_quantity` field. If a recipe yields 4 servings and the bid needs 40 servings, the cost is multiplied by 10
3. **Labor** is hours multiplied by hourly rate (both user-supplied)
4. **Travel** uses the 2026 IRS standard mileage rate of 72.5 cents per mile
5. **Overhead** is a percentage applied to all direct costs (food + labor + travel + equipment)
6. **Profit margin** is a percentage applied to the subtotal (direct costs + overhead)

### Formula

```
Direct Costs = Food + Labor + Travel + Equipment
Overhead = Direct Costs * overhead%
Subtotal = Direct Costs + Overhead
Profit = Subtotal * margin%
Total = Subtotal + Profit
Per Person = Total / Guest Count
```

### Food Cost Ratio Indicator

The summary displays a food cost ratio with color coding:
- Green (< 30%): Excellent margins
- Amber (30-40%): Acceptable, standard for catering
- Red (> 40%): High food cost, review pricing

## Files

| File | Purpose |
|------|---------|
| `lib/finance/catering-bid-actions.ts` | Server actions (generate bid, recipe search, save as quote, bid history) |
| `components/finance/catering-bid-calculator.tsx` | 5-step bid builder UI |
| `components/finance/catering-bid-summary.tsx` | Clean cost breakdown view (print-friendly) |
| `components/finance/catering-bid-history.tsx` | Past bids list |

## Server Actions

| Action | Purpose |
|--------|---------|
| `generateCateringBid(params)` | Core costing engine. Takes recipes, labor, overhead, travel, profit margin. Returns full breakdown. |
| `getRecipeCostEstimate(recipeId, servings)` | Cost a single recipe at a given serving count |
| `saveBidAsQuote(bidResult, params)` | Convert a completed bid into a quote record (uses existing quotes table) |
| `getBidHistory()` | List past bids (quotes created from bid tool, identified by pricing_notes marker) |
| `searchRecipesForBid(query)` | Search recipes with cost data for bid builder |

## Database Dependencies

No new migrations. Uses existing tables and views:

- `recipes` (name, yield_quantity, tenant_id)
- `recipe_ingredients` (quantity, unit, ingredient_id)
- `ingredients` (last_price_cents, average_price_cents)
- `recipe_cost_summary` (database view: aggregated cost per recipe)
- `quotes` (where completed bids are saved)

## Draft Storage

Bid drafts are saved to `localStorage` (key: `chefflow-bid-draft`). No database table needed since drafts are ephemeral and per-device. This keeps the implementation simple and avoids unnecessary migrations.

## Bid-to-Quote Conversion

When "Create Quote" is used, the bid data is written to the `quotes` table with:
- `pricing_model: 'per_person'`
- `total_quoted_cents`: the full bid total
- `price_per_person_cents`: per-person amount
- `pricing_notes`: full breakdown text (also serves as the marker to identify bid-created quotes in history)

## Warnings

The system generates warnings when:
- A recipe has incomplete ingredient pricing (some ingredients lack prices)
- A recipe has zero cost data (no prices at all)
- A recipe ID was not found (skipped from calculation)

## Integration Points

- **Recipe book**: Searches the chef's own recipes. Read-only.
- **Quotes**: Bids convert to quotes via `saveBidAsQuote`. Uses existing quote creation pattern.
- **Activity log**: Quote creation from bids is logged via `logChefActivity` (non-blocking).

## Tier Assignment

This is a **Pro** feature (financial tooling beyond basic quotes). Will need `requirePro('finance')` gating and `UpgradeGate` wrapping when integrated into a page route. The components are ready; page routing and tier gating are separate tasks.
