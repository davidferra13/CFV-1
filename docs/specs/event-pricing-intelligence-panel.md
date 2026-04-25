# Event Pricing Intelligence Panel Implementation Note

Date: 2026-04-24

## What Exists

- Event money surfaces already show menu approval, forecasted menu cost, food cost analysis, financial summary, payments, payment plans, mileage, tips, expenses, budget guardrails, receipt capture, and profit summary.
- The standalone event financial page already uses `getEventFinancialSummaryFull`, `FinancialSummaryView`, `CostVarianceCard`, and the event profitability upgrade prompt.
- Menu costing already estimates menu cost by summing linked recipe costs and shows total menu cost plus cost per guest when a target guest count exists.
- Pure finance math exists in `lib/finance/food-cost-calculator.ts` and `lib/finance/plate-cost-calculator.ts`.
- Event-level actuals exist through `event_financial_summary`, `getEventProfitSummary`, `getEventExpenses`, `getEventCostVariance`, and receipt line items.
- Operator-aware food-cost targets and costing warning vocabulary exist in `lib/costing/knowledge.ts` and `lib/costing/generate-warnings.ts`.
- Price freshness, confidence, fallback, and stale-price metadata exist in the ingredient pricing stack, but the event money surface does not yet assemble those signals into one deterministic event-level payload.

## What Is Missing

- A single event-level pricing intelligence payload that connects projected menu/recipe cost, quote/revenue, actual spend, variance, and margin feedback.
- Deterministic suggested-price math for event/menu costs based on target food cost percentage.
- A native panel in the event money/financial surface that shows what was expected, what was charged, what should have been charged, what actually happened, and what needs repricing.
- Warning rules that combine underpricing, food cost, margin, variance, stale/low-confidence price, and menu repricing signals.
- Menu costing lacks suggested price per guest, projected gross profit, and projected margin at a target food cost percentage.

## What Was Reused

- `event_financial_summary` for ledger-derived quote, payment, revenue, and expense truth.
- `expenses` and `getEventCostVariance` for categorized actual spend and estimated vs actual food/receipt variance.
- `menu_cost_summary` and the existing event menu lookup patterns for projected menu cost.
- `getChefPreferences`, `getChefArchetype`, and `getTargetsForArchetype` for target margin and target food cost percent.
- Existing ChefFlow currency, card, badge, button, table, and event financial-summary patterns.

## What Was Built

- A pure finance module with deterministic event-pricing calculations:
  - suggested price from food cost and target food cost percentage
  - projected and actual profit/margin
  - estimated vs actual variance and variance percentage
  - warning generation for underpricing, high food cost, low margin, variance, stale pricing, low confidence pricing, and menu repricing
  - non-null fallback pricing metadata when primary food-cost data is incomplete
- A server action that assembles one UI-ready event pricing intelligence payload from existing event, finance, menu, quote, expense, and pricing data.
- A reusable event pricing intelligence panel for the event financial/money surface.
- A small extension to the menu costing table for suggested price per guest and projected margin.
- Unit tests for the pure calculation and warning functions.
- A Playwright assertion that the event financial page renders the pricing intelligence panel for the seeded completed event.

## Files Touched

- `lib/finance/event-pricing-intelligence.ts`
- `lib/finance/event-pricing-intelligence-actions.ts`
- `components/finance/event-pricing-intelligence-panel.tsx`
- `app/(chef)/events/[id]/financial/page.tsx`
- `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx`
- `app/(chef)/events/[id]/page.tsx`
- `app/(chef)/culinary/costing/menu/page.tsx`
- `tests/unit/event-pricing-intelligence.test.ts`
- `tests/e2e/08-events-detail-panels.spec.ts`

## Remaining Gap

- Ingredient spike warnings remain intentionally out of scope for this slice. The menu intelligence tests contain spike math, but the event-level action does not yet have a cheap, reliable historical price series query to compare current event ingredients against prior purchases without adding a broader analytics query path.

## Success Criteria

- A chef can open an event money/financial surface and immediately see projected cost, quote/revenue, suggested price, actual spend, projected margin, actual margin, variance, target food cost percent, and warnings.
- The panel uses real existing ChefFlow data; no fake production pricing is introduced.
- Missing menu/recipe/receipt data is surfaced as low-confidence fallback metadata instead of a null-price dead end.
- Menu costing shows suggested price per guest and projected gross profit/margin without redesigning the page.
- Unit tests cover suggested pricing, food cost percent targets, projected margin, actual margin, variance, warning generation, and fallback behavior.
- Ingredient spike warnings remain a TODO unless existing historical price data can be accessed cheaply and reliably during this slice.
