# Pricing Intelligence Vertical Slice

> Implementation note for the Ingredient -> Recipe -> Menu -> Event -> Quote -> Actual Spend -> Margin Feedback chain.

## What Already Exists (95% complete)

### Ingredient Layer - COMPLETE

| Requirement             | Status | File                                                                      |
| ----------------------- | ------ | ------------------------------------------------------------------------- |
| Canonical identity      | DONE   | `ingredients` table, `lib/recipes/actions.ts`                             |
| Unit normalization      | DONE   | `lib/units/conversion-engine.ts` (80+ aliases, weight/volume/count)       |
| Current estimated price | DONE   | `lib/pricing/resolve-price.ts` (10-tier fallback chain)                   |
| Source/vendor tracking  | DONE   | `resolutionTier` field on every price (chef_receipt -> category_baseline) |
| Confidence level        | DONE   | `confidence` + `effectiveConfidence` (age-decayed) on every price         |
| No null dead ends       | DONE   | Category baseline is last fallback before explicit "none"                 |

### Recipe Layer - COMPLETE

| Requirement             | Status | File                                                                   |
| ----------------------- | ------ | ---------------------------------------------------------------------- |
| Ingredient quantities   | DONE   | `recipe_ingredients` table (qty, unit, yield_pct, computed_cost_cents) |
| Yield and serving count | DONE   | `yield_quantity`, `yield_unit` on recipes                              |
| Waste/trim adjustment   | DONE   | `yield_pct` per ingredient, `computeRecipeIngredientCost()`            |
| Cost per batch          | DONE   | `refreshRecipeTotalCost()` (ingredients + sub-recipes + Q-factor)      |
| Cost per serving        | DONE   | `cost_per_serving_cents` on recipes                                    |

### Menu Layer - MOSTLY COMPLETE

| Requirement               | Status  | File                                                    |
| ------------------------- | ------- | ------------------------------------------------------- |
| Multiple recipes/dishes   | DONE    | dishes -> components -> recipes chain                   |
| Total menu cost           | DONE    | `getMenuCostSummaries()`                                |
| Cost per guest            | DONE    | `total_recipe_cost / target_guest_count`                |
| Suggested price per guest | **GAP** | Math exists but not surfaced                            |
| Target food cost %        | **GAP** | Operator targets exist but not applied to suggest price |
| Margin estimate           | **GAP** | Not shown on menu pages                                 |

### Event Layer - MOSTLY COMPLETE

| Requirement            | Status  | File                                                     |
| ---------------------- | ------- | -------------------------------------------------------- |
| Guest count            | DONE    | events table                                             |
| Menu attached          | DONE    | `menu_id` on events                                      |
| Labor/travel/overhead  | DONE    | time tracking + mileage + expenses by category           |
| Event quote total      | DONE    | quotes system                                            |
| Expected profit/margin | **GAP** | Post-event P&L exists, pre-event projection not surfaced |

### Quote Layer - COMPLETE

| Requirement        | Status | File                                                    |
| ------------------ | ------ | ------------------------------------------------------- |
| Quote breakdown    | DONE   | `lib/quotes/actions.ts` (per_person, flat_rate, custom) |
| Client-safe view   | DONE   | Client quote response pages                             |
| Package + itemized | DONE   | Both pricing models supported                           |

### Actual Spend Layer - COMPLETE

| Requirement             | Status | File                                            |
| ----------------------- | ------ | ----------------------------------------------- |
| Receipt import          | DONE   | `lib/ai/parse-receipt.ts` + QuickReceiptCapture |
| Expense line items      | DONE   | `lib/finance/expense-line-item-actions.ts`      |
| Estimated vs actual     | DONE   | `getEventCostVariance()` + CostVarianceCard     |
| Per-ingredient variance | DONE   | Line items matched to ingredients               |

### Margin Feedback Layer - PARTIAL

| Requirement                  | Status  | File                                                     |
| ---------------------------- | ------- | -------------------------------------------------------- |
| Expected vs actual margin    | DONE    | `getEventFinancialSummaryFull()`                         |
| Flag underpriced events      | DONE    | `getProfitDashboard()` flags <20% margin                 |
| Flag ingredient spikes       | **GAP** | Food cost trend exists but no per-ingredient spike alert |
| Flag menus needing repricing | **GAP** | No persistent signal                                     |
| Persist results              | **GAP** | Computed on-the-fly, not stored for learning             |

## What Will Be Built

### 1. Suggested Pricing Functions (pure math)

Add to `lib/finance/food-cost-calculator.ts`:

- `computeSuggestedPrice(foodCostCents, targetFoodCostPct)` -> suggested selling price
- `computeEventCostProjection(foodCost, laborMinutes, mileageMiles, overheadPct)` -> total projected cost
- `computeExpectedMargin(projectedCost, quotedPrice)` -> expected margin

### 2. Vertical Slice Server Action

New `lib/pricing/vertical-slice-actions.ts`:

- Assembles full chain for one event in a single server call
- Returns: projected food cost, suggested price, quoted price, actual spend, variance, margin, flags

### 3. Event Pricing Vertical UI Component

New `components/pricing/event-pricing-vertical.tsx`:

- Compact card showing the full chain at a glance
- Expandable per-category breakdown
- Warning flags for underpricing, ingredient spikes, variance

### 4. Menu Cost Page Enhancement

Add "Suggested Price" column to `/culinary/costing/menu` page based on operator-specific food cost targets.

### 5. Margin Feedback Flags

New `lib/pricing/margin-feedback.ts`:

- `detectIngredientSpikes(tenantId)` -> ingredients where current price > 120% of historical avg
- `detectMenuRepricingNeeded(tenantId)` -> menus where last event food cost % exceeded target

### 6. Unit Tests

New tests for all pure calculation functions.

## Files Touched

- `lib/finance/food-cost-calculator.ts` (extend with suggested pricing)
- `lib/pricing/vertical-slice-actions.ts` (new server action)
- `lib/pricing/margin-feedback.ts` (new margin feedback logic)
- `components/pricing/event-pricing-vertical.tsx` (new UI component)
- `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx` (wire in component)
- `app/(chef)/culinary/costing/menu/page.tsx` (add suggested price column)
- `tests/unit/food-cost-calculator.test.ts` (extend)
- `tests/unit/vertical-slice.test.ts` (new)

## What Success Looks Like

A chef opens an event and sees: projected food cost ($X from recipes), suggested price ($Y at 30% target), quoted price ($Z), actual spend ($W from receipts), variance (+/-$N), margin (M%), and any warning flags. All in one glance, all from existing data, no new tables needed.
