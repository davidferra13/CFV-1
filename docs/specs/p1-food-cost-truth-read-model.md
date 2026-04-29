# Spec: Food Cost Truth Read Model

> **Status:** built
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                        | Date             | Agent/Session | Commit                      |
| ---------------------------- | ---------------- | ------------- | --------------------------- |
| Created                      | 2026-04-29 15:28 | Codex         |                             |
| Status: ready                | 2026-04-29 15:28 | Codex         |                             |
| Claimed                      | 2026-04-29 16:47 | Codex         |                             |
| Build completed              | 2026-04-29 17:05 | Codex         |                             |
| Unit test passed             | 2026-04-29 17:05 | Codex         |                             |
| Narrow type check passed     | 2026-04-29 17:06 | Codex         |                             |
| Browser verification passed  | 2026-04-29 17:36 | Codex         | `http://127.0.0.1:3410/inventory/food-cost` returned 200 on desktop and mobile |

---

## Developer Notes

### Raw Signal

The developer wants ChefFlow architecture and Codex operating behavior to keep improving all the time, with Remy included inside that architecture only where it is safe. The YouTube software fundamentals lecture should be adopted as an always-on operating standard: better shared understanding, ambiguity questions before guessing, deep modules instead of many shallow pieces, feedback loops, and visible browser/runtime evidence when needed.

The developer specifically called out food costing as the first deep module because it is probably the most important thing ChefFlow offers. They want Codex to stop creating dirty-tree bottlenecks, put blocked work into a queue, build that queue in controlled batches, and prevent parallel agents from rewriting the same thing in different places. They are worried about money waste, duplicated agent work, scattered code, and Remy being allowed to do things it should not do.

### Developer Intent

- **Core goal:** Make food costing a canonical deep module that agents and pages can depend on instead of recalculating financial truth locally.
- **Key constraints:** Preserve ledger-first financial rules, cents-only money storage, tenant scoping, honest error states, no recipe generation, no destructive DB changes, no production deploys, and no public Remy authority over financial mutation.
- **Motivation:** Food cost truth is central to ChefFlow value, and scattered calculations create drift, shallow modules, and costly agent confusion.
- **Success from the developer's perspective:** A builder can implement one clear read-model boundary, migrate the highest-value food-cost surfaces to it, and future Codex agents know where food-cost truth lives.

---

## Current State Summary

ChefFlow already has strong ingredients for food-cost truth, but the boundary is fragmented:

- `/inventory/food-cost` fetches recent events, calls `getEventFinancialSummaryFull()` per event, then computes variance locally as actual grocery spend minus projected food cost in the page component. See `app/(chef)/inventory/food-cost/page.tsx:18`, `app/(chef)/inventory/food-cost/page.tsx:29`, and `app/(chef)/inventory/food-cost/page.tsx:33`.
- `getEventFinancialSummaryFull()` is already a close precursor to a read model. It authenticates with `requireChef()`, scopes the event by tenant, computes actual grocery spend from grocery, alcohol, and specialty expenses, calls `compute_projected_food_cost_cents`, and returns costs, margins, time, mileage, comparison, and pending items. See `lib/events/financial-summary-actions.ts:88`, `lib/events/financial-summary-actions.ts:95`, `lib/events/financial-summary-actions.ts:141`, `lib/events/financial-summary-actions.ts:157`, and `lib/events/financial-summary-actions.ts:240`.
- `getEventProfitSummary()` is another precursor, but it repeats category bucketing and returns zero percentages when revenue is missing. See `lib/expenses/actions.ts:447`, `lib/expenses/actions.ts:476`, `lib/expenses/actions.ts:516`, and `lib/expenses/actions.ts:572`.
- `lib/ledger/compute.ts` documents that `event_financial_summary.food_cost_percentage` is actually all expenses divided by ledger revenue, not food-only cost. See `lib/ledger/compute.ts:52`.
- The database view `event_financial_summary` currently computes `food_cost_percentage` from all expenses, not food expense categories. See `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:1003` and `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:1020`.
- Menu and recipe cost views exist, including `compute_projected_food_cost_cents`, `recipe_cost_summary`, and `menu_cost_summary`. See `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:840`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:869`, and `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:911`.
- Later costing migrations added yield-aware fields and stored recipe costs. See `database/migrations/20260330000095_cascading_food_costs.sql:12`, `database/migrations/20260330000095_cascading_food_costs.sql:39`, and `database/migrations/20260330000095_cascading_food_costs.sql:56`.
- Event pricing intelligence has good pure calculators and server aggregation, but it is separate from the event financial summary and inventory variance path. See `lib/finance/event-pricing-intelligence.ts:79`, `lib/finance/event-pricing-intelligence.ts:115`, `lib/finance/event-pricing-intelligence-actions.ts:129`, and `lib/finance/event-pricing-intelligence-actions.ts:491`.
- `/food-cost` computes daily dashboard percentages from manual daily revenue and vendor invoices inside the page, with missing revenue displayed as 0%. See `app/(chef)/food-cost/page.tsx:57`, `app/(chef)/food-cost/page.tsx:72`, and `app/(chef)/food-cost/page.tsx:107`.
- `/culinary/costing/food-cost` computes food spend from expense categories and gross revenue from the tenant ledger inside the page. See `app/(chef)/culinary/costing/food-cost/page.tsx:28`, `app/(chef)/culinary/costing/food-cost/page.tsx:34`, and `app/(chef)/culinary/costing/food-cost/page.tsx:39`.
- `/ops` computes food cost percent from service-day food cost and sales revenue directly in the page. See `app/(chef)/ops/page.tsx:87` and `app/(chef)/ops/page.tsx:463`.
- Finance pages perform page-local revenue and adjustment reductions. See `app/(chef)/finance/overview/cash-flow/page.tsx:25`, `app/(chef)/finance/overview/cash-flow/page.tsx:43`, `app/(chef)/finance/ledger/transaction-log/page.tsx:36`, and `app/(chef)/finance/ledger/adjustments/page.tsx:21`.

---

## Software Fundamentals Gate

### Shared Design Concept

Create a Food Cost Truth read model: one server-side boundary for event-level, range-level, and dashboard-level food-cost facts. It must make the numerator, denominator, source, confidence, and missing-data state explicit.

### Design Tree

| Decision                                     | Resolved Choice                                                    | Reason                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| DB view first or TypeScript read model first | TypeScript read model first                                        | No migration needed, lower blast radius, easier tests, avoids redefining financial semantics before surfaces agree. |
| One massive rewrite or first slice           | First slice migrates `/inventory/food-cost` and shared event truth | Keeps queue batch small while proving the interface.                                                                |
| Use page-local math or shared calculators    | Shared pure calculators plus server read-model actions             | Preserves feedback speed and hides query complexity behind a narrow contract.                                       |
| Return zeros or data state                   | Return `null` plus `dataState` and `missingReasons`                | Satisfies zero-hallucination rule.                                                                                  |
| Remy access                                  | Read-only only                                                     | Remy can explain existing numbers, not generate recipes or mutate money.                                            |

### Ubiquitous Language

- **Food cost:** cost of food ingredients only. Canonical categories: `groceries`, `alcohol`, `specialty_items`.
- **Projected food cost:** menu or recipe-derived estimate before shopping.
- **Actual grocery spend:** recorded food expenses, receipt line items, grocery spend entries, or vendor invoices depending on context.
- **Net food cost:** actual food cost minus leftover credits in and out when event-level carry-forward applies.
- **Food cost percent:** food cost divided by the chosen revenue basis, returned as a 0-100 percent value.
- **Revenue basis:** explicit denominator, one of collected revenue, quoted price, daily revenue, service-day sales, or ledger revenue.
- **Variance:** actual food cost minus projected food cost, in cents and percent.
- **Confidence:** whether the read model is complete, partial, missing projected cost, missing actual cost, missing revenue, or using fallback data.
- **Cents:** all stored and computed monetary values remain integer cents.

### Naming Conflicts

- Do not use `event_financial_summary.food_cost_percentage` as canonical food-only truth. It is documented in `lib/ledger/compute.ts:52` as all expenses over revenue.
- Do not rename historical `tenant_id` or `chef_id` columns. New query code must use whichever the target table already uses.
- Do not rename ChefFlow, CheFlow, app domain, or internal engine references outside allowed internal surfaces.

### Deep Module Boundary

The interface should be:

```ts
type FoodCostTruthDataState =
  | 'complete'
  | 'partial'
  | 'missing_projected_cost'
  | 'missing_actual_cost'
  | 'missing_revenue'
  | 'unavailable'

type RevenueBasis =
  | 'collected_revenue'
  | 'quoted_price'
  | 'ledger_revenue'
  | 'daily_revenue'
  | 'service_day_sales'

type FoodCostTruthSource =
  | 'menu_cost_summary'
  | 'projected_food_cost_rpc'
  | 'event_expenses'
  | 'expense_line_items'
  | 'grocery_spend_entries'
  | 'vendor_invoices'
  | 'daily_revenue'
  | 'service_day_summary'
  | 'ledger_entries'
```

Builders may change exact type names if TypeScript integration demands it, but the concepts above must remain explicit at the boundary.

### Fastest Feedback Loop

Add pure unit tests for the calculator first, then run a targeted type check or test command for the new read-model files. Runtime browser verification is required only after pages migrate to the read model and only if a server is already safely available or the developer permits warmup.

---

## What This Does (Plain English)

After this is built, ChefFlow has one authoritative Food Cost Truth module that pages can ask for event variance, event food-cost percent, range food-cost trends, and source/confidence metadata. The user still sees familiar food-cost screens, but the numbers come from one shared contract instead of each page inventing its own financial math.

---

## Why It Matters

Food costing is a core ChefFlow promise. Right now, agents can change one surface and accidentally drift another because the numerator, denominator, and fallback rules live in page-local code.

---

## Files to Create

| File                                     | Purpose                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/finance/food-cost-truth.ts`         | Pure calculator functions, source normalization, variance math, percent math, data-state resolution. No DB calls.                    |
| `lib/finance/food-cost-truth-types.ts`   | Shared types for food-cost truth results, sources, revenue basis, and missing reasons.                                               |
| `lib/finance/food-cost-truth-actions.ts` | Authenticated server actions and server-side query wrappers for event and range food-cost truth.                                     |
| `tests/unit/food-cost-truth.test.ts`     | Calculator and data-state tests for complete, partial, zero revenue, missing actual, missing projected, and negative variance cases. |

---

## Files to Modify

| File                                                 | What to Change                                                                                                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/inventory/food-cost/page.tsx`            | Replace local variance construction with `getRecentEventFoodCostTruth()`. Show unavailable or partial rows honestly instead of filtering everything out.          |
| `lib/events/financial-summary-actions.ts`            | Delegate food-cost section construction to the new read model or keep as a compatibility wrapper around it. Preserve current output shape for existing consumers. |
| `lib/expenses/actions.ts`                            | Remove duplicated food-category bucketing from `getEventProfitSummary()` or call the shared pure bucket helper. Do not change expense mutation behavior.          |
| `lib/finance/event-pricing-intelligence-actions.ts`  | Reuse the shared bucket/source types where practical. Do not rewrite pricing intelligence in the first builder slice unless a compile error requires it.          |
| `components/inventory/food-cost-variance.tsx`        | Accept source/confidence/data-state metadata and render partial or unavailable rows without fake zeros.                                                           |
| `app/(chef)/culinary/costing/food-cost/page.tsx`     | Later slice: consume range-level food cost truth instead of page-local expense and ledger math.                                                                   |
| `app/(chef)/food-cost/page.tsx`                      | Later slice: consume daily/vendor range truth and stop returning 0% when revenue is missing.                                                                      |
| `app/(chef)/ops/page.tsx`                            | Later slice: consume service-day food-cost truth for top metric and recent-day rows.                                                                              |
| `app/(chef)/finance/overview/cash-flow/page.tsx`     | Later slice: document or migrate revenue-basis reductions to shared finance read-model helpers.                                                                   |
| `app/(chef)/finance/ledger/transaction-log/page.tsx` | Later slice: document or migrate total collected/refunded reductions to shared finance read-model helpers.                                                        |
| `app/(chef)/finance/ledger/adjustments/page.tsx`     | Later slice: document or migrate adjustment totals to shared finance read-model helpers.                                                                          |

---

## Database Changes

None for the first implementation. Do not create a migration in this spec.

The builder may propose a later additive migration only after the TypeScript read model exposes a real performance or correctness need. If that happens, the builder must follow migration safety rules: list existing migration files, choose a strictly higher timestamp, show full SQL before writing, and avoid destructive operations.

---

## Data Model

### Event Food Cost Truth

```ts
type EventFoodCostTruth = {
  eventId: string
  eventName: string
  eventDate: string | null
  guestCount: number | null
  projectedFoodCostCents: number | null
  actualFoodCostCents: number | null
  netFoodCostCents: number | null
  revenueCents: number | null
  revenueBasis: RevenueBasis | null
  foodCostPercent: number | null
  varianceCents: number | null
  variancePercent: number | null
  dataState: FoodCostTruthDataState
  missingReasons: string[]
  sources: FoodCostTruthSource[]
}
```

### Range Food Cost Truth

```ts
type RangeFoodCostTruth = {
  startDate: string
  endDate: string
  actualFoodCostCents: number | null
  revenueCents: number | null
  revenueBasis: RevenueBasis
  foodCostPercent: number | null
  eventCount: number
  completeEventCount: number
  partialEventCount: number
  missingReasons: string[]
  sources: FoodCostTruthSource[]
}
```

### Invariants

- Money is always integer cents.
- Percent values returned by this module are 0-100 numbers, not 0-1 ratios.
- Missing revenue returns `foodCostPercent: null`, never `0`.
- Missing actual or projected cost returns `varianceCents: null` and `variancePercent: null`.
- Every DB query uses `requireChef()` and tenant or chef scoping at the table's existing boundary.
- Expense food categories are `groceries`, `alcohol`, and `specialty_items` unless a later spec updates the canonical category list.

---

## Server Actions

| Action                                                                                      | Auth            | Input                              | Output                       | Side Effects |
| ------------------------------------------------------------------------------------------- | --------------- | ---------------------------------- | ---------------------------- | ------------ |
| `getEventFoodCostTruth(eventId: string)`                                                    | `requireChef()` | Event id                           | `EventFoodCostTruth \| null` | None         |
| `getRecentEventFoodCostTruth(limit?: number)`                                               | `requireChef()` | Optional limit, default 20, max 50 | `EventFoodCostTruth[]`       | None         |
| `getRangeFoodCostTruth(input: { startDate: string; endDate: string; basis: RevenueBasis })` | `requireChef()` | Date range and basis               | `RangeFoodCostTruth`         | None         |

Implementation notes:

- `getEventFoodCostTruth()` should query `events` with `.eq('id', eventId)` and `.eq('tenant_id', user.tenantId!)`.
- Projected food cost should prefer `menu_cost_summary.total_recipe_cost_cents` when available, then `compute_projected_food_cost_cents`, then `events.estimated_food_cost_cents` as a fallback with source metadata.
- Actual event food cost should prefer expense line item variance if complete, then business expenses in food categories, then grocery spend entries if existing data is present.
- Revenue should prefer collected ledger/event financial summary revenue for completed or in-progress event truth, with `quoted_price` only as an explicit fallback source.
- Date-range food cost should be explicit about which mode it serves: event expenses plus ledger revenue, daily revenue plus vendor invoices, or service-day sales plus service-day food cost. Do not mix these without a named `revenueBasis`.

---

## UI / Component Spec

### Page Layout

First builder slice targets `/inventory/food-cost`.

- Keep the current page structure and `FoodCostVariance` table.
- Add compact source/status indicators per row: complete, partial, missing actual, missing projected, or missing revenue.
- Rows with projected and actual cost show theoretical cost, actual cost, variance cents, and variance percent.
- Rows missing one side should show the event and the missing reason instead of disappearing silently.

### States

- **Loading:** Existing server-rendered route behavior is acceptable.
- **Empty:** Show no qualifying event data yet, with guidance that the page needs events plus cost sources.
- **Error:** If the read model throws, render an error state or let the route error boundary handle it. Do not show `$0.00`.
- **Populated:** Show complete rows first, then partial rows with clear missing reasons.

### Interactions

No new mutations in the first slice. No optimistic updates.

---

## Edge Cases and Error Handling

| Scenario                                       | Correct Behavior                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Event belongs to another tenant                | Return `null` or throw not found after tenant-scoped query. Never leak existence.                                         |
| Revenue is zero or missing                     | Return `foodCostPercent: null` and missing reason. Do not render 0%.                                                      |
| Projected cost missing                         | Keep actual cost visible, mark state `missing_projected_cost`, no variance percent.                                       |
| Actual cost missing                            | Keep projected cost visible, mark state `missing_actual_cost`, no variance percent.                                       |
| Actual below projected                         | Negative variance is valid and should display as savings, not an error.                                                   |
| Leftover credits make net food cost negative   | Clamp display only if the product requires it; otherwise preserve calculated truth and flag `partial` or `review_needed`. |
| DB query fails                                 | Throw with clear error. Do not return empty arrays that look like success.                                                |
| Menu cost view returns 0 for incomplete prices | Mark source as partial if coverage says prices are incomplete.                                                            |
| Multiple menus on one event                    | Sum menu costs if the data model allows multiple rows, preserving menu ids in source metadata if added later.             |

---

## Verification Steps

1. Add unit tests for pure functions in `lib/finance/food-cost-truth.ts`.
2. Run the targeted unit test command for `tests/unit/food-cost-truth.test.ts`.
3. Run a TypeScript check allowed by the builder context. Do not run `next build` unless explicitly permitted.
4. Verify `/inventory/food-cost` in a browser if a dev server is already safely available or the developer permits warmup.
5. Confirm no changed file contains an em dash.
6. Confirm no changed file uses the TypeScript nocheck directive.
7. Confirm no query lacks tenant or chef scoping.
8. Confirm no food-cost surface displays missing revenue as 0%.

---

## Spec Validation

1. **What exists today that this touches?** Event and food-cost pages, server actions, finance calculators, ledger compute, expenses, vendor invoices, daily revenue, menu cost views, and inventory variance. Evidence: `app/(chef)/inventory/food-cost/page.tsx:18`, `lib/events/financial-summary-actions.ts:88`, `lib/expenses/actions.ts:447`, `lib/ledger/compute.ts:52`, `lib/vendors/invoice-actions.ts:91`, `lib/vendors/revenue-actions.ts:82`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:911`.
2. **What exactly changes?** Add the Food Cost Truth types, pure calculator, server actions, and unit tests. First page migration is `/inventory/food-cost`. Later slices migrate dashboard, culinary costing, ops, and finance reductions.
3. **What assumptions are you making?** Verified: food categories are currently groceries, alcohol, and specialty items in `lib/expenses/actions.ts:490` and `lib/finance/event-pricing-intelligence-actions.ts:145`. Verified: `event_financial_summary.food_cost_percentage` is not food-only in `lib/ledger/compute.ts:52`. Unverified: the project has an existing preferred unit test runner for these files. Builder must inspect package scripts before choosing the command.
4. **Where will this most likely break?** Existing consumers expect zero percentages from `getEventProfitSummary()` when revenue is missing, `app/(chef)/inventory/food-cost` currently filters out partial rows, and the DB view uses a misleading `food_cost_percentage` name.
5. **What is underspecified?** Whether vendor invoice totals should count as event actual food cost is not globally resolved. First slice avoids this by using event-level expenses for event truth and leaving vendor invoices for `/food-cost` range truth.
6. **What dependencies or prerequisites exist?** None for the first slice. No migration.
7. **What existing logic could this conflict with?** `getEventFinancialSummaryFull()`, `getEventProfitSummary()`, `getEventPricingIntelligence()`, `calculateFoodCostPercentage()`, and `event_financial_summary`.
8. **What is the end-to-end data flow?** User opens `/inventory/food-cost`, server route calls `getRecentEventFoodCostTruth()`, action authenticates and scopes by tenant, queries events, menu costs, expenses, and revenue sources, pure calculator resolves results, page renders complete and partial rows.
9. **What is the correct implementation order?** Types, pure calculator tests, server actions, `/inventory/food-cost` migration, component state rendering, targeted tests, compliance scan, commit and push.
10. **What are the exact success criteria?** `/inventory/food-cost` uses the new read model, complete rows match old variance math, partial rows are visible, missing revenue is null not 0, unit tests cover edge cases, tenant scoping is present, runtime route returns 200, no em dashes.
11. **What are the non-negotiable constraints?** Ledger-first revenue, cents-only money, `requireChef()`, tenant or chef scoping, honest missing data, no recipe generation, no destructive DB operations, no production deploy.
12. **What should NOT be touched?** Do not edit `types/database.ts`, do not rename columns, do not change ledger append behavior, do not change expense mutation behavior, do not add Remy financial mutations, do not deploy.
13. **Is this the simplest complete version?** Yes. It starts with a TypeScript read model and one page migration, not a DB rewrite.
14. **If implemented exactly as written, what would still be wrong?** Other food-cost surfaces will still use page-local math until later slices migrate them.
15. **What design investment does this make?** It creates a deeper module with a small interface, shared language, explicit data states, and faster tests for future money work.

---

## Out of Scope

- No database migration in the first slice.
- No production deploy.
- No changes to Stripe, ledger append, payment collection, or refund behavior.
- No recipe generation or AI-authored recipe content.
- No Remy actions that mutate expenses, ledger entries, invoices, recipes, or pricing.
- No broad redesign of finance pages in the first slice.

---

## Notes for Builder Agent

Use this spec as a queue item with owner boundary `food-cost-truth-read-model`. Do not run a parallel agent on finance read models or food-cost pages at the same time.

Start with the pure calculator because it gives the fastest feedback loop. Keep server actions thin and authenticated. If a page has to choose between showing nothing and showing partial truth, show partial truth with the missing reason.

Final check: This spec is production-ready for the first builder slice. The only uncertainty is the exact test command, which the builder can resolve by inspecting package scripts before implementation.
