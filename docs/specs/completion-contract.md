# Spec: Completion Contract

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none (wraps existing systems)
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                 | Date       | Agent/Session  | Commit      |
| --------------------- | ---------- | -------------- | ----------- |
| Created               | 2026-04-17 | Opus (planner) |             |
| Status: ready         | 2026-04-17 | Opus (planner) |             |
| Claimed (in-progress) | 2026-04-17 | Opus (builder) |             |
| Spike completed       | 2026-04-17 | Opus (builder) |             |
| Pre-flight passed     | 2026-04-17 | Opus (builder) |             |
| Build completed       | 2026-04-17 | Opus (builder) |             |
| Chef feedback pass    | 2026-04-17 | Opus (builder) | 15->21 reqs |
| Type check passed     | 2026-04-17 | Opus (builder) |             |
| Build check passed    | 2026-04-17 | Opus (builder) |             |
| Playwright verified   | 2026-04-17 | Opus (builder) | 4/4 pass    |
| Status: verified      | 2026-04-17 | Opus (builder) |             |
| Status: verified      |            |                |             |

---

## Developer Notes

### Raw Signal

We are defining a system-wide Completion Contract that governs how ChefFlow understands progress, readiness, and finalization across all core entities (Event, Client, Menu, Ingredient).

Completion is not user-declared and not inferred loosely. It is deterministic, machine-evaluated, and derived from explicit requirements and resolved dependencies.

Every entity must expose a structured completion state: status, completion_score, missing_requirements, blocking_requirements. Completion must be recursive and dependency-aware. An Event cannot be complete unless its Client, Menu, Financials, and Communication records are complete. A Menu cannot be complete unless all Courses, Recipes, Ingredients are fully defined and resolve to valid price data. A Client cannot be complete unless identity, contact data, event history linkage, communication records, and financial ledger integrity are present.

The system must include a centralized Completion Engine. Users may configure which requirements apply to their workflow, but the system must always compute objective completeness based on the active schema.

Quality of Life Constraint: at any point, the system must clearly communicate what is complete, what is incomplete, what is blocking progress, and what the next action is. No user should need to infer state, track progress manually, or remember to perform critical updates.

Automation Requirement: the system should not rely on the chef to manually complete obvious follow-up actions. Completion logic must trigger automatic state updates wherever possible. When all dependencies are satisfied, completion state updates without user intervention. The system should prefer automation over instruction.

Progress Visibility: the system must expose completion in a way that is immediately understandable and actionable. If the system cannot clearly determine or communicate completion state for any entity, the feature is not considered finished and must not ship.

### Developer Intent

- **Core goal:** Unified, deterministic completion evaluation that wraps all existing readiness systems into one composable interface with recursive dependency resolution.
- **Key constraints:** Never store completion state (derive it like financials). Never replace existing systems (wrap them). Never show ambiguous state.
- **Motivation:** 20+ scattered completeness systems with inconsistent interfaces. Chef has no single view of "what's blocking this event." Cognitive load is too high.
- **Success from the developer's perspective:** A chef opens an Event and sees "82% complete. Menu has 2 costing gaps. Client missing allergies. Next: review ingredient prices." One glance, full picture, actionable.

---

## What This Does (Plain English)

After this is built, every Event, Client, Menu, Recipe, and Ingredient in ChefFlow exposes a standard completion state: a status (incomplete/partial/complete), a 0-100 score, and explicit lists of what's missing and what's blocking. These are computed in real-time from existing data, never stored.

The Completion Engine evaluates recursively: asking "is this Event complete?" automatically checks whether its Client, Menu, Financials, and Communication records are complete. Asking "is this Menu complete?" checks every Dish, Component, Recipe, and Ingredient in the chain.

A `CompletionCard` component appears on every entity detail page showing the score, missing items, and a single "next action" link. A dashboard widget shows the chef's overall completion posture across all upcoming events.

---

## Why It Matters

ChefFlow has 20+ readiness systems that don't talk to each other. A chef cannot answer "is this event ready?" without checking 5 different panels. This unifies all of them behind one interface, one UI component, and one mental model. Reduces cognitive load. Eliminates the gap between "built" and "done."

---

## Files to Create

| File                                                  | Purpose                                                                                      |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `lib/completion/types.ts`                             | Core types: `CompletionResult`, `CompletionRequirement`, `EntityType`, `CompletionStatus`    |
| `lib/completion/engine.ts`                            | Central engine: `evaluateCompletion(entityType, entityId)` dispatcher                        |
| `lib/completion/evaluators/event.ts`                  | Event evaluator: wraps readiness gates + FSM + financial summary + recursive deps            |
| `lib/completion/evaluators/client.ts`                 | Client evaluator: wraps `getClientProfileCompleteness()` + financial health                  |
| `lib/completion/evaluators/menu.ts`                   | Menu evaluator: wraps `getMenuHealthData()` + recursive dish/recipe/ingredient chain         |
| `lib/completion/evaluators/recipe.ts`                 | Recipe evaluator: NEW logic (method, yield, timing, ingredients, cost coverage)              |
| `lib/completion/evaluators/ingredient.ts`             | Ingredient evaluator: wraps pricing health + standalone field checks                         |
| `lib/completion/actions.ts`                           | Server actions for UI consumption: `getCompletionForEntity()`, `getEventCompletionSummary()` |
| `components/completion/completion-card.tsx`           | Reusable UI: score ring, status badge, missing items list, next action link                  |
| `components/completion/completion-summary-widget.tsx` | Dashboard widget: upcoming events completion overview                                        |

---

## Files to Modify

| File                                                      | What to Change                                    |
| --------------------------------------------------------- | ------------------------------------------------- |
| `app/(chef)/events/[id]/event-detail-client.tsx`          | Add `CompletionCard` to event detail header area  |
| `app/(chef)/clients/[id]/client-detail-client.tsx`        | Add `CompletionCard` to client detail header area |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx`        | Add `CompletionCard` to recipe detail header area |
| `components/menus/menu-detail-header.tsx` (or equivalent) | Add `CompletionCard` to menu detail area          |
| `app/(chef)/dashboard/page.tsx`                           | Add `CompletionSummaryWidget` to dashboard        |

---

## Database Changes

**None.** Completion is derived, never stored. Like financial balances, it is computed from existing data on every evaluation. No new tables, no new columns, no migrations.

This is a deliberate architectural decision: stored completion state goes stale. Derived completion state is always correct.

---

## Data Model

### Core Types

```typescript
type CompletionStatus = 'incomplete' | 'partial' | 'complete'
type EntityType = 'event' | 'client' | 'menu' | 'recipe' | 'ingredient'

interface CompletionRequirement {
  key: string // e.g. 'client.allergies_confirmed'
  label: string // 'Allergies confirmed'
  met: boolean // is this requirement satisfied?
  blocking: boolean // does this prevent completion?
  weight: number // contribution to score (0-100 total)
  category: string // grouping: 'safety', 'financial', 'culinary', 'logistics'
  actionUrl?: string // deep link to resolve it
  actionLabel?: string // 'Review allergies'
}

interface CompletionResult {
  entityType: EntityType
  entityId: string
  status: CompletionStatus // derived from score
  score: number // 0-100
  requirements: CompletionRequirement[]
  missingRequirements: CompletionRequirement[] // met === false
  blockingRequirements: CompletionRequirement[] // blocking === true && met === false
  nextAction: {
    // single most impactful unmet requirement
    label: string
    url: string
  } | null
  children?: CompletionResult[] // recursive: menu -> recipes -> ingredients
}
```

### Score Derivation

Score = sum of `weight` for all requirements where `met === true`. Total weights per entity always sum to 100.

Status thresholds:

- `complete`: score === 100 AND zero blocking requirements
- `partial`: score >= 1 AND score < 100
- `incomplete`: score === 0

### Dependency Graph

```
Event completion depends on:
  +-- Client completion (profile, contact, allergies)
  +-- Menu completion
  |     +-- Dish completeness (all dishes have components)
  |     +-- Component completeness (all components have recipes)
  |     +-- Recipe completion (for each linked recipe)
  |     |     +-- Ingredient completion (for each recipe_ingredient)
  |     |           +-- Has price data
  |     |           +-- Price is fresh (< 90 days)
  |     +-- Allergen review done
  |     +-- Cost coverage (all ingredients priced)
  +-- Financial completion (quote exists, deposit status, outstanding balance)
  +-- Logistics completion (date confirmed, location confirmed, guest count)
  +-- Communication completion (client has been contacted, menu shared)
```

Recursive evaluation: `evaluateCompletion('event', eventId)` calls `evaluateCompletion('menu', menuId)` which calls `evaluateCompletion('recipe', recipeId)` for each component's recipe, etc. Children results are attached to the parent's `children` array for drill-down UI.

---

## Server Actions

| Action                             | Auth            | Input                                          | Output                                                                       | Side Effects     |
| ---------------------------------- | --------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- | ---------------- |
| `getCompletionForEntity(type, id)` | `requireChef()` | `{ entityType: EntityType, entityId: string }` | `CompletionResult`                                                           | None (pure read) |
| `getEventCompletionDeep(eventId)`  | `requireChef()` | `{ eventId: string }`                          | `CompletionResult` (with full `children` tree)                               | None (pure read) |
| `getDashboardCompletionSummary()`  | `requireChef()` | none                                           | `{ events: Array<{ eventId, eventName, date, score, status, nextAction }> }` | None (pure read) |

All actions are read-only. No mutations. No cache invalidation needed (they read fresh data every call).

---

## UI / Component Spec

### CompletionCard (reusable)

Compact card component. Takes a `CompletionResult` prop.

**Layout:**

- Left: score ring (SVG donut, colored by status: green/amber/red)
- Center: status label + score percentage
- Below: top 3 missing requirements as one-line items with action links
- Bottom: single "Next: [action]" CTA button

**Variants:**

- `size="sm"`: inline badge (score ring + status only, no missing list). For list views.
- `size="md"`: default card. For detail page headers.
- `size="lg"`: expanded with children drill-down. For dedicated completion view.

### CompletionSummaryWidget (dashboard)

Shows upcoming events (next 30 days) with completion scores.

**Layout:**

- Table/list: event name, date, score ring, status badge, next action
- Sorted by: blocking events first, then by date
- Empty state: "No upcoming events" (not zeros)
- Error state: "Could not load completion data" with retry

### States

- **Loading:** Skeleton with pulsing rings (matches existing dashboard skeleton pattern)
- **Empty:** Contextual message ("No upcoming events scheduled")
- **Error:** Error state with retry button (never fake zeros)
- **Populated:** Real data, real scores

### Interactions

- Click score ring or "View details" -> expands to show full requirement list
- Click action link on a requirement -> navigates to the relevant page/section
- Click "Next: [action]" -> navigates to the highest-impact unmet requirement

No optimistic updates needed (read-only). No mutations. No rollback scenarios.

---

## Evaluator Specifications

### Event Evaluator (wraps existing systems)

21 requirements, 7 blocking, weights sum to 100. Updated 2026-04-17 with chef feedback (serve time, access notes, allergen cross-check, budget guardrail, post-event close-out).

| Requirement                           | Weight | Source                                                    | Blocking? | Category  |
| ------------------------------------- | ------ | --------------------------------------------------------- | --------- | --------- |
| Client linked                         | 5      | `events.client_id IS NOT NULL`                            | Yes       | profile   |
| Client profile adequate (score >= 60) | 5      | `getClientProfileCompleteness()`                          | No        | profile   |
| Client allergies confirmed            | 8      | `readiness.ts` allergy gate                               | Yes       | safety    |
| Menu clear of client allergens        | 5      | `client_allergy_records` vs `recipes.allergen_flags` join | No        | safety    |
| Date confirmed                        | 5      | `events.event_date IS NOT NULL`                           | Yes       | logistics |
| Service time set                      | 4      | `events.serve_time` not empty                             | Yes       | logistics |
| Location confirmed                    | 5      | `events.location` not empty                               | Yes       | logistics |
| Guest count set                       | 5      | `events.guest_count > 0`                                  | Yes       | logistics |
| Arrival/access instructions           | 3      | `events.access_instructions` not empty                    | No        | logistics |
| Documents generated                   | 3      | `events.prep_sheet_generated_at IS NOT NULL`              | No        | logistics |
| Menu linked                           | 8      | `events.menu_id IS NOT NULL`                              | Yes       | culinary  |
| Menu complete (score >= 80)           | 8      | recursive `evaluateCompletion('menu', menuId)`            | No        | culinary  |
| Grocery list ready                    | 5      | `events.grocery_list_ready`                               | No        | culinary  |
| Quote/pricing exists                  | 7      | `quotes` table, sent/accepted quote for event             | No        | financial |
| Deposit collected                     | 7      | `event_financial_summary.total_paid_cents > 0`            | No        | financial |
| Budget on track                       | 3      | `food_cost_percentage <= 50%` (yellow flag, not blocker)  | No        | financial |
| Financially reconciled                | 3      | `event_financial_summary.outstanding_balance_cents === 0` | No        | financial |
| Prep list ready                       | 3      | `events.prep_list_ready`                                  | No        | logistics |
| Packing reviewed                      | 3      | `events.packing_list_ready`                               | No        | logistics |
| After-action review filed             | 3      | `events.aar_filed`                                        | No        | logistics |
| Receipts uploaded                     | 2      | `receipt_photos` count > 0 for event                      | No        | financial |

### Client Evaluator (wraps existing)

Directly delegates to `getClientProfileCompleteness()` from `lib/clients/completeness.ts` and maps its output to `CompletionResult`. The existing 16-field weighted system already sums to 100 and returns `{ score, missing, tier }`. Mapping:

- `score` -> `CompletionResult.score`
- `missing` -> mapped to `CompletionRequirement[]` with `met: false`
- `tier` -> mapped to `CompletionStatus` (complete >= 85, partial >= 1, incomplete = 0)

Additionally adds 2 requirements not in the existing system (reweighted):

- Has at least 1 completed event (relationship depth)
- Has valid contact method (email or phone, already partially covered)

Total re-weighting: existing 16 fields scaled to 90 points, 2 new fields get 10 points.

### Menu Evaluator (wraps existing + recursive)

Requirements (weights sum to 100):

| Requirement                        | Weight | Source                                                           |
| ---------------------------------- | ------ | ---------------------------------------------------------------- |
| Has at least 1 dish                | 15     | `getMenuHealthData().dishCount > 0`                              |
| All dishes have components         | 15     | `dish_component_summary` view                                    |
| All components have recipes        | 15     | `components.recipe_id IS NOT NULL` for all                       |
| All recipes complete (score >= 80) | 15     | recursive `evaluateCompletion('recipe', recipeId)` per component |
| All ingredients priced             | 15     | `getMenuHealthData().dishesWithGaps === 0`                       |
| Allergens reviewed                 | 10     | `getMenuHealthData().allergenReviewed`                           |
| Menu not in draft                  | 5      | `menu.status !== 'draft'`                                        |
| Linked to event                    | 5      | `getMenuHealthData().hasEvent`                                   |
| Client approved                    | 5      | `approvalStatus === 'approved'`                                  |

### Recipe Evaluator (NEW, no existing system to wrap)

Requirements (weights sum to 100):

| Requirement                 | Weight | Source                                                         |
| --------------------------- | ------ | -------------------------------------------------------------- |
| Has name                    | 5      | `recipe.name` not empty                                        |
| Has method/instructions     | 20     | `recipe.method` not empty                                      |
| Has yield quantity + unit   | 15     | `recipe.yield_quantity > 0 AND recipe.yield_unit` not empty    |
| Has at least 1 ingredient   | 15     | `recipe_ingredients` count > 0                                 |
| All ingredients have prices | 15     | per-ingredient `last_price_cents IS NOT NULL`                  |
| No stale prices (< 90 days) | 10     | per-ingredient `last_price_date` within 90 days                |
| Has timing (prep + cook)    | 10     | `recipe.prep_time_minutes > 0 OR recipe.cook_time_minutes > 0` |
| Has category                | 5      | `recipe.category` not empty                                    |
| Has dietary tags            | 5      | `recipe.dietary_tags` array length > 0                         |

### Ingredient Evaluator

Requirements (weights sum to 100):

| Requirement                 | Weight | Source                                                                |
| --------------------------- | ------ | --------------------------------------------------------------------- |
| Has name                    | 10     | `ingredient.name` not empty                                           |
| Has category                | 10     | `ingredient.category` not empty                                       |
| Has default unit            | 10     | `ingredient.default_unit` not empty                                   |
| Has price data              | 25     | `ingredient.last_price_cents IS NOT NULL`                             |
| Price is fresh (< 90 days)  | 20     | `ingredient.last_price_date` within 90 days                           |
| Has allergen flags reviewed | 15     | `ingredient.allergen_flags IS NOT NULL` (even empty array = reviewed) |
| Has dietary tags            | 10     | `ingredient.dietary_tags IS NOT NULL`                                 |

---

## Edge Cases and Error Handling

| Scenario                                           | Correct Behavior                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Event has no menu linked                           | Menu requirements show as `met: false`, score reflects it. Not an error.            |
| Menu has 0 dishes                                  | `dishCount === 0` requirement fails. Score = 0 for that dimension.                  |
| Recipe has no ingredients                          | `ingredient_count === 0` requirement fails. No recursive ingredient eval needed.    |
| Ingredient has NULL price_date                     | Treated as stale (never priced). Both "has price" and "fresh price" fail.           |
| Circular dependency (impossible in current schema) | FK structure prevents cycles. Menu->Dish->Component->Recipe->Ingredient is a DAG.   |
| Entity not found (deleted/wrong tenant)            | Return `null`. UI shows nothing (not a fake zero).                                  |
| Very large menu (50+ dishes, 200+ ingredients)     | Recursive eval uses batch queries per level, not N+1. Single query per entity type. |
| Terminal event (completed/cancelled)               | Still evaluable. Completion state at close-out is useful for historical analysis.   |

---

## Performance Strategy

Recursive evaluation could be expensive. Mitigation:

1. **Batch queries per level.** Menu evaluator fetches all dishes in one query, all components in one query, all recipe_ingredients in one query. Not N+1.
2. **Existing views.** `event_financial_summary`, `recipe_cost_summary`, `menu_cost_summary`, `dish_component_summary` already aggregate the data we need.
3. **Shallow mode.** `getCompletionForEntity('event', id)` defaults to shallow: checks event-level requirements only, includes child scores but not full child trees. `getEventCompletionDeep(id)` does the full recursive expansion.
4. **Dashboard query.** `getDashboardCompletionSummary()` uses shallow mode for all upcoming events. One query for events, one for financial summaries, one for menu health. No deep recursion.

---

## Verification Steps

1. Sign in with agent account
2. Navigate to an event detail page -> `CompletionCard` visible with real score
3. Verify score changes when menu is added/removed from event
4. Navigate to a client detail page -> `CompletionCard` shows profile completeness
5. Navigate to a recipe detail page -> `CompletionCard` shows method/ingredient/price status
6. Navigate to dashboard -> `CompletionSummaryWidget` shows upcoming events with scores
7. Click "Next action" link on CompletionCard -> navigates to correct page
8. Create a fully complete event (all requirements met) -> score shows 100, status "complete"
9. Remove menu from event -> score drops, "Menu linked" shows as missing
10. Screenshot all states

---

## Out of Scope

- **Configurable requirements per chef** (Phase 2: let chefs mark requirements as not_applicable)
- **Completion-gated actions** (Phase 2: prevent event transitions based on completion score)
- **Historical completion tracking** (Phase 2: store completion snapshots for trend analysis)
- **Notifications on completion changes** (Phase 2: "Your event just reached 100%!")
- **Inquiry completion** (existing `computeReadinessScore` already covers this; may unify later)

---

## Notes for Builder Agent

### Patterns to follow

- `lib/clients/completeness.ts` is the gold standard: pure function, weighted fields, returns `{ score, missing, tier }`. Mirror this pattern for Recipe evaluator.
- `lib/events/readiness.ts` shows how to check gates with real DB queries. Event evaluator wraps these, not reimplements.
- `lib/lifecycle/critical-path.ts` shows the batched-query pattern for cross-entity evaluation.

### Do NOT

- Store completion state in any table. Derive it.
- Replace or modify existing evaluators (`completeness.ts`, `readiness.ts`, `getMenuHealthData`). Wrap them.
- Add `'use server'` to `types.ts` or `engine.ts`. Only `actions.ts` is a server action file.
- Create N+1 query patterns. Batch per entity type.
- Show zeros or empty states that look like real data. If evaluation fails, show error state.

### Import chain

```
actions.ts ('use server')
  -> engine.ts (dispatcher, pure logic)
    -> evaluators/event.ts (calls existing readiness + financial views)
    -> evaluators/client.ts (calls existing completeness.ts)
    -> evaluators/menu.ts (calls existing getMenuHealthData + recursive)
    -> evaluators/recipe.ts (NEW queries, pure logic)
    -> evaluators/ingredient.ts (field checks, mostly pure)
  -> types.ts (shared types, no server directive)
```

### Existing functions to call (not reimplement)

- `getClientProfileCompleteness(client)` from `lib/clients/completeness.ts`
- `getMenuHealthData(menuId)` from `lib/menus/actions.ts:2287`
- `evaluateReadinessForTransition()` from `lib/events/readiness.ts`
- `getCriticalPath({ eventId })` from `lib/lifecycle/critical-path.ts`
- `event_financial_summary` view (direct SQL)
- `recipe_cost_summary` view (direct SQL)
- `dish_component_summary` view (direct SQL)

### UI component reference

- Score ring: follow `components/dashboard/health-score-widget.tsx` SVG pattern
- Card layout: follow existing detail page header patterns
- Dashboard widget: follow `components/dashboard/widget-cards/` patterns
