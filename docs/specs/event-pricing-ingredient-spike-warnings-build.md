# Event Pricing Ingredient Spike Warnings Build Spec

Date: 2026-04-24

## Scope

Add event-scoped ingredient price spike warnings to the existing Event Pricing Intelligence Panel.
This is additive only. Do not rebuild pricing, menu costing, recipes, expenses, OpenClaw, or analytics.

## Highest-Leverage Action

Build real ingredient price spike detection into `getEventPricingIntelligence` and surface it through the existing warning list and advanced ingredient detail.

## Evidence

- The implementation note leaves ingredient spike warnings as the remaining gap: `docs/specs/event-pricing-intelligence-panel.md:57-59`.
- The current warning model supports underpricing, food cost, margin, variance, repricing, stale pricing, low confidence, and missing data, but no spike type: `lib/finance/event-pricing-intelligence.ts:15-23`.
- The event pricing action already traverses event menus to unique ingredients and counts stale, missing, and low-confidence prices: `lib/finance/event-pricing-intelligence-actions.ts:204-299`.
- The event pricing action already feeds ingredient confidence data into warning generation and the payload: `lib/finance/event-pricing-intelligence-actions.ts:429-444`, `lib/finance/event-pricing-intelligence-actions.ts:496-503`.
- The panel already renders warning cards and ingredient pricing detail, so spike warnings can reuse the existing UI surface: `components/finance/event-pricing-intelligence-panel.tsx:228-267`, `components/finance/event-pricing-intelligence-panel.tsx:284-288`.
- ChefFlow already has price history and indexed query paths for ingredient history: `database/migrations/20260401000061_ingredient_price_history.sql:1-25`.
- ChefFlow already has monthly average price view data: `database/migrations/20260401000061_ingredient_price_history.sql:46-58`.
- Existing ingredient price alert logic flags ingredients whose recent price is 30%+ above average: `lib/ingredients/pricing.ts:150-196`.
- Existing menu intelligence also uses a 1.3 price spike threshold and maps spiked ingredients back to affected menus: `lib/menus/menu-intelligence-actions.ts:143`, `lib/menus/menu-intelligence-actions.ts:703-836`.

## What To Build

1. Extend the pure pricing module.
   - In `lib/finance/event-pricing-intelligence.ts`, add:
     - `ingredient_price_spike` to `EventPricingWarningType`.
     - `IngredientPriceSpikeSignal` type:
       - `ingredientId`
       - `ingredientName`
       - `currentPriceCents`
       - `averagePriceCents`
       - `spikePercent`
       - `unit`
     - `calculateIngredientSpikePercent(currentPriceCents, averagePriceCents): number | null`.
     - `isIngredientPriceSpike(currentPriceCents, averagePriceCents, thresholdPercent = 30): boolean`.
     - Add optional spike summary fields to `WarningInput`.
     - Extend `generateEventPricingWarnings` to emit one `ingredient_price_spike` warning when at least one event ingredient is 30% or more above average.

2. Extend the event pricing payload.
   - In `lib/finance/event-pricing-intelligence-actions.ts`, update `EventPricingIntelligencePayload` with:
     ```ts
     priceSignals: {
       ingredientSpikes: IngredientPriceSpikeSignal[]
       ingredientSpikeCount: number
       insufficientHistoryCount: number
     }
     ```
   - Update `getMenuIngredientSignals` to select `name`, `average_price_cents`, `price_unit` or `default_unit`, plus existing price fields.
   - Compute current price as `cost_per_unit_cents || last_price_cents`.
   - Compute spikes only when both current and average prices are positive.
   - Count ingredients with missing/zero average as `insufficientHistoryCount`.
   - Sort spikes by `spikePercent` descending and keep the payload compact, e.g. top 5.
   - Feed spike count/top spike/name summary into `generateEventPricingWarnings`.

3. Extend the panel without adding a route.
   - In `components/finance/event-pricing-intelligence-panel.tsx`, reuse the existing warning cards.
   - In the existing details section, show a compact line for top ingredient spikes when present:
     - ingredient name
     - current price
     - average price
     - spike percent
   - If no spikes exist, do not add visual noise.
   - Preserve the existing warning and confidence layout.

4. Tests.
   - Update `tests/unit/event-pricing-intelligence.test.ts` for:
     - spike percent calculation
     - 30% threshold behavior
     - no warning for missing average/current price
     - warning generation with top spike summary
   - Keep tests pure and deterministic.

## Constraints

- Do not add fake production pricing.
- Do not create a new route or dashboard.
- Do not add a migration unless the local schema proves a field is missing.
- Do not change existing pricing semantics outside this event-pricing scope.
- Do not duplicate broad analytics or menu-intelligence architecture.
- If an ingredient lacks historical average data, surface uncertainty through `insufficientHistoryCount`; do not infer a spike.

## Verification

Run:

```bash
node --test --import tsx "tests/unit/event-pricing-intelligence.test.ts"
npx eslint "lib/finance/event-pricing-intelligence.ts" "lib/finance/event-pricing-intelligence-actions.ts" "components/finance/event-pricing-intelligence-panel.tsx" "tests/unit/event-pricing-intelligence.test.ts"
npx playwright test --project=chef tests/e2e/08-events-detail-panels.spec.ts -g "financial summary loads"
```

Also run `npm run typecheck` and `npm run lint`, but report known unrelated repo-wide failures separately if they still occur.

## Definition Of Done

- A chef opening an event financial/money surface can see when event ingredients are materially above historical average price.
- Spike warnings appear only from real ingredient price data.
- Missing average/history does not produce false warnings.
- Existing pricing intelligence still shows suggested price, projected/actual cost, margins, variance, stale pricing, and low-confidence pricing.
- Unit tests pass for spike math and warning generation.
